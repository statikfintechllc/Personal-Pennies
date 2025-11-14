/**
 * Parse Trades Script (JavaScript version)
 * Scans trade markdown files from IndexedDB and generates trades-index.json
 * 
 * This is a direct JavaScript port of .github/scripts/parse_trades.py
 */

// Get functions from global scope (loaded by loader.js)
function getDependencies() {
  return {
    VFS: window.PersonalPenniesSystem?.VFS,
    DataAccess: window.PersonalPenniesDataAccess,
    sortTradesByDate: window.PersonalPenniesUtils?.sortTradesByDate,
    calculatePeriodStats: window.PersonalPenniesUtils?.calculatePeriodStats
  };
}

/**
 * Parse frontmatter from markdown content
 * @param {string} content - Markdown content with frontmatter
 * @returns {Object} Parsed frontmatter and body
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter = {};
  
  // Parse YAML-like frontmatter
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentArray = null;
  
  for (const line of lines) {
    // Handle array items
    if (line.trim().startsWith('- ')) {
      if (currentArray !== null) {
        const value = line.trim().substring(2).trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        currentArray.push(cleanValue);
      }
      continue;
    }
    
    // Handle key-value pairs
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes from string values
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      
      // Check if this is an array field
      if (value === '' || value === '[]') {
        currentKey = key;
        currentArray = [];
        frontmatter[key] = currentArray;
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        const arrayContent = value.substring(1, value.length - 1);
        if (arrayContent.trim()) {
          frontmatter[key] = arrayContent.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        } else {
          frontmatter[key] = [];
        }
        currentKey = null;
        currentArray = null;
      } else {
        // Regular value - try to parse as number
        if (!isNaN(value) && value !== '') {
          frontmatter[key] = parseFloat(value);
        } else {
          frontmatter[key] = value;
        }
        currentKey = null;
        currentArray = null;
      }
    }
  }
  
  return { frontmatter, body };
}

/**
 * Parse a single trade from markdown content
 * @param {string} key - Trade key (e.g., "week.2025.45/11:05:2025.1.md")
 * @param {Object} tradeData - Trade data from IndexedDB
 * @returns {Object} Parsed trade data
 */
function parseTrade(key, tradeData) {
  // Extract week and date from key
  const weekMatch = key.match(/week\.(\d{4})\.(\d{2})/);
  const weekKey = weekMatch ? `week.${weekMatch[1]}.${weekMatch[2]}` : null;
  
  // If trade already has parsed data, use it
  if (tradeData.trade_number && tradeData.ticker) {
    return {
      file_path: `index.directory/SFTi.Tradez/${key}`,
      body: tradeData.body || '',
      notes: tradeData.notes || '',
      ...tradeData,
      _week: weekKey
    };
  }
  
  // Parse markdown content if available
  if (tradeData.markdown_content) {
    const { frontmatter, body } = parseFrontmatter(tradeData.markdown_content);
    
    // Extract notes from body (everything after "## Notes")
    const notesMatch = body.match(/## Notes\s*\n\n([\s\S]*?)(?=\n##|$)/);
    const notes = notesMatch ? notesMatch[1].trim() : '';
    
    return {
      file_path: `index.directory/SFTi.Tradez/${key}`,
      body: body.substring(0, 500) + (body.length > 500 ? '...' : ''), // Truncate for index
      notes: notes,
      ...frontmatter,
      _week: weekKey
    };
  }
  
  // Return minimal data if no content
  return {
    file_path: `index.directory/SFTi.Tradez/${key}`,
    ...tradeData,
    _week: weekKey
  };
}

/**
 * Calculate overall statistics from trades
 * @param {Array<Object>} trades - List of trades
 * @returns {Object} Statistics object
 */
function calculateStatistics(trades) {
  if (!trades || trades.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_pnl: 0,
      avg_pnl: 0,
      total_volume: 0
    };
  }
  
  let winCount = 0;
  let lossCount = 0;
  let totalPnl = 0;
  let totalVolume = 0;
  
  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;
    totalPnl += pnl;
    totalVolume += trade.position_size || 0;
    
    if (pnl > 0) {
      winCount++;
    } else if (pnl < 0) {
      lossCount++;
    }
  }
  
  return {
    total_trades: trades.length,
    winning_trades: winCount,
    losing_trades: lossCount,
    win_rate: trades.length > 0 ? Math.round((winCount / trades.length * 100) * 100) / 100 : 0,
    total_pnl: Math.round(totalPnl * 100) / 100,
    avg_pnl: trades.length > 0 ? Math.round((totalPnl / trades.length) * 100) / 100 : 0,
    total_volume: totalVolume
  };
}

/**
 * Main function to parse trades and generate index
 * @returns {Promise<Object>} Trades index data
 */
export async function parseTrades() {
  console.log('[ParseTrades] Starting trade parsing...');
  
  const { VFS, DataAccess, sortTradesByDate } = getDependencies();
  
  if (!VFS || !DataAccess || !sortTradesByDate) {
    console.error('[ParseTrades] Dependencies not loaded');
    throw new Error('Required dependencies not loaded');
  }
  
  try {
    // Get all trade markdown files from VFS
    const tradeFiles = await VFS.listFiles('index.directory/SFTi.Tradez/');
    console.log(`[ParseTrades] Found ${tradeFiles.length} trade files in VFS`);
    
    // Parse each trade
    const parsedTrades = [];
    for (const filePath of tradeFiles) {
      if (!filePath.endsWith('.md')) continue;
      
      try {
        const fileData = await VFS.readFile(filePath);
        const content = fileData.content;
        const parsed = parseTrade(filePath, { content });
        if (parsed.trade_number && parsed.ticker) {
          parsedTrades.push(parsed);
        }
      } catch (error) {
        console.error(`[ParseTrades] Error parsing trade ${filePath}:`, error);
      }
    }
    
    // Sort trades by date
    const sortedTrades = sortTradesByDate(parsedTrades);
    
    // Calculate statistics
    const statistics = calculateStatistics(sortedTrades);
    
    // Create index data
    const indexData = {
      trades: sortedTrades,
      statistics: statistics,
      generated_at: new Date().toISOString(),
      version: '1.0'
    };
    
    // Save to VFS
    await DataAccess.saveTradesIndex(indexData);
    
    console.log(`[ParseTrades] Parsed ${sortedTrades.length} trades`);
    console.log(`[ParseTrades] Statistics:`, statistics);
    
    return indexData;
  } catch (error) {
    console.error('[ParseTrades] Error parsing trades:', error);
    throw error;
  }
}

/**
 * Parse trades and emit event when complete
 */
export async function parseTradesAndEmit() {
  const indexData = await parseTrades();
  
  // Emit event to trigger pipeline
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('trades:parsed', indexData);
  }
  
  return indexData;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesParseTrades = {
    parseTrades,
    parseTradesAndEmit
  };
}

console.log('[ParseTrades] Module loaded');
