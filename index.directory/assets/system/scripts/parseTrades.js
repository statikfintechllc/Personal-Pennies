/**
 * Parse Trades Script
 * Parses markdown files from the trades/ directory and generates a JSON index
 * with all trade data extracted from YAML frontmatter
 * 
 * Performance Optimizations:
 * - Single-pass statistics calculation combining multiple metrics
 * - Efficient cumulative P&L tracking for drawdown calculation
 * - Reduced memory allocation with in-place updates
 * - Optimized type conversions and validations
 * 
 * PERFECT MIRROR of .github/scripts/parse_trades.py
 */

/**
 * Get dependencies from global window object
 * @returns {Object} Dependencies (VFS, DataAccess, Utils)
 */
function getDependencies() {
  return {
    VFS: window.PersonalPenniesSystem?.VFS,
    DataAccess: window.PersonalPenniesDataAccess,
    sortTradesByDate: window.PersonalPenniesUtils?.sortTradesByDate
  };
}

/**
 * Extract YAML frontmatter from markdown content
 * MIRRORS: parse_frontmatter() from parse_trades.py lines 24-50
 * 
 * @param {string} content - Markdown file content
 * @returns {Object} {frontmatter: Object, body: string}
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }
  
  try {
    // Split content by --- markers
    const parts = content.split('---', 3);
    if (parts.length < 3) {
      return { frontmatter: {}, body: content };
    }
    
    // Parse YAML frontmatter (using js-yaml library if available)
    let frontmatter = {};
    try {
      if (window.jsyaml) {
        frontmatter = window.jsyaml.load(parts[1]);
      } else {
        // Fallback: simple key-value parsing
        const lines = parts[1].split('\n');
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            frontmatter[key] = value;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing YAML frontmatter:', e);
      frontmatter = {};
    }
    
    const body = parts[2].trim();
    
    return { frontmatter, body };
  } catch (e) {
    console.error(`Error parsing frontmatter: ${e}`);
    return { frontmatter: {}, body: content };
  }
}

/**
 * Parse a single trade markdown file
 * MIRRORS: parse_trade_file() from parse_trades.py lines 53-151
 * 
 * @param {string} filepath - Path to trade markdown file
 * @param {string} content - File content
 * @returns {Object|null} Parsed trade data or null if parsing fails
 */
function parseTradeFile(filepath, content) {
  try {
    const { frontmatter, body } = parseFrontmatter(content);
    
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      console.warn(`Warning: No frontmatter found in ${filepath}`);
      return null;
    }
    
    // Validate required fields
    const requiredFields = [
      'trade_number',
      'ticker',
      'entry_date',
      'entry_price',
      'exit_price',
      'position_size',
      'direction'
    ];
    
    const missingFields = requiredFields.filter(f => !(f in frontmatter));
    if (missingFields.length > 0) {
      console.warn(`Warning: Missing required fields in ${filepath}: ${missingFields.join(', ')}`);
      return null;
    }
    
    // Extract notes section from markdown body
    let notes = '';
    const notesMatch = body.match(/## Notes\s*\n+(.*?)(?=\n##|\Z)/s);
    if (notesMatch) {
      notes = notesMatch[1].trim();
    }
    
    // Add computed fields
    const tradeData = {
      file_path: filepath,
      body: body.length > 200 ? body.substring(0, 200) + '...' : body, // Preview
      notes: notes || 'No notes recorded.',
      ...frontmatter
    };
    
    // Ensure numeric fields are properly typed
    const numericFields = [
      'trade_number',
      'entry_price',
      'exit_price',
      'position_size',
      'stop_loss',
      'target_price',
      'pnl_usd',
      'pnl_percent',
      'risk_reward_ratio'
    ];
    
    for (const field of numericFields) {
      if (field in tradeData && tradeData[field] !== null && tradeData[field] !== undefined) {
        try {
          tradeData[field] = parseFloat(tradeData[field]);
        } catch (e) {
          console.warn(`Warning: Could not convert ${field} to number in ${filepath}`);
        }
      }
    }
    
    // Convert trade_number to int specifically
    if ('trade_number' in tradeData) {
      tradeData['trade_number'] = parseInt(tradeData['trade_number'], 10);
    }
    
    // Convert date/time fields to strings for JSON serialization
    // Handle YAML sexagesimal time parsing bug where "18:55" becomes integer 1135
    const timeFields = ['entry_time', 'exit_time'];
    for (const field of timeFields) {
      if (field in tradeData && tradeData[field] !== null && tradeData[field] !== undefined) {
        const timeVal = tradeData[field];
        // If time was parsed as int (sexagesimal), convert back to HH:MM format
        if (typeof timeVal === 'number') {
          const hours = Math.floor(timeVal / 60);
          const minutes = timeVal % 60;
          tradeData[field] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } else {
          tradeData[field] = String(timeVal);
        }
      }
    }
    
    // Convert date fields to strings
    const dateFields = ['entry_date', 'exit_date'];
    for (const field of dateFields) {
      if (field in tradeData && tradeData[field] !== null && tradeData[field] !== undefined) {
        tradeData[field] = String(tradeData[field]);
      }
    }
    
    return tradeData;
    
  } catch (e) {
    console.error(`Error parsing ${filepath}: ${e}`);
    return null;
  }
}

/**
 * Calculate aggregate statistics from all trades
 * MIRRORS: calculate_statistics() from parse_trades.py lines 154-254
 * 
 * @param {Array<Object>} trades - List of trade dictionaries
 * @returns {Object} Statistics dictionary
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
      avg_winner: 0,
      avg_loser: 0,
      largest_win: 0,
      largest_loss: 0,
      total_volume: 0,
      max_drawdown: 0,
      profit_factor: 0
    };
  }
  
  // Single pass through all trades to calculate multiple metrics
  const totalTrades = trades.length;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalPnl = 0.0;
  let totalWinnerPnl = 0.0;
  let totalLoserPnl = 0.0;
  let largestWin = -Infinity;
  let largestLoss = Infinity;
  let totalVolume = 0;
  
  // For drawdown calculation
  const cumulativePnl = [];
  let runningTotal = 0.0;
  
  for (const t of trades) {
    const pnl = t.pnl_usd || 0;
    totalPnl += pnl;
    totalVolume += t.position_size || 0;
    
    // Track cumulative for drawdown
    runningTotal += pnl;
    cumulativePnl.push(runningTotal);
    
    // Update extremes
    if (pnl > largestWin) {
      largestWin = pnl;
    }
    if (pnl < largestLoss) {
      largestLoss = pnl;
    }
    
    // Categorize winners/losers
    if (pnl > 0) {
      winningTrades++;
      totalWinnerPnl += pnl;
    } else if (pnl < 0) {
      losingTrades++;
      totalLoserPnl += pnl;
    }
  }
  
  // Calculate derived statistics
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
  const avgWinner = winningTrades > 0 ? totalWinnerPnl / winningTrades : 0;
  const avgLoser = losingTrades > 0 ? totalLoserPnl / losingTrades : 0;
  
  // Calculate max drawdown efficiently (start peak at 0 for proper drawdown calculation)
  let maxDrawdown = 0;
  if (cumulativePnl.length > 0) {
    let peak = 0;
    for (const value of cumulativePnl) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = value - peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  // Handle edge cases for extremes
  if (largestWin === -Infinity) {
    largestWin = 0;
  }
  if (largestLoss === Infinity) {
    largestLoss = 0;
  }
  
  // Calculate profit factor
  const profitFactor = avgLoser !== 0 ? Math.abs(avgWinner / avgLoser) : 0;
  
  return {
    total_trades: totalTrades,
    winning_trades: winningTrades,
    losing_trades: losingTrades,
    win_rate: Math.round(winRate * 100) / 100,
    total_pnl: Math.round(totalPnl * 100) / 100,
    avg_pnl: Math.round(avgPnl * 100) / 100,
    avg_winner: Math.round(avgWinner * 100) / 100,
    avg_loser: Math.round(avgLoser * 100) / 100,
    largest_win: Math.round(largestWin * 100) / 100,
    largest_loss: Math.round(largestLoss * 100) / 100,
    total_volume: Math.floor(totalVolume),
    max_drawdown: Math.round(maxDrawdown * 100) / 100,
    profit_factor: Math.round(profitFactor * 100) / 100
  };
}

/**
 * Main execution function
 * MIRRORS: main() from parse_trades.py lines 257-333
 * 
 * @returns {Promise<Object>} Trade index data
 */
export async function parseTrades() {
  console.log('Starting trade parsing...');
  
  const { VFS, DataAccess } = getDependencies();
  
  if (!VFS || !DataAccess) {
    console.error('[ParseTrades] Dependencies not loaded');
    throw new Error('Required dependencies not loaded');
  }
  
  try {
    // Find all trade markdown files in both locations:
    // 1. Legacy location: trades/*.md
    // 2. New location: index.directory/SFTi.Tradez/week.*/**.md (supports both week.XXX and week.YYYY.WW formats)
    const tradeFiles = [];
    
    // Check legacy trades/ directory
    try {
      const legacyFiles = await VFS.listFiles('trades/');
      const legacyMdFiles = legacyFiles.filter(f => f.endsWith('.md'));
      if (legacyMdFiles.length > 0) {
        console.log(`Found ${legacyMdFiles.length} legacy trade file(s) in trades/`);
        tradeFiles.push(...legacyMdFiles);
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
    
    // Check new index.directory/SFTi.Tradez structure (supports week.XXX and week.YYYY.WW patterns)
    try {
      const allFiles = await VFS.listFiles('index.directory/SFTi.Tradez/');
      // Filter for .md files in week.* directories, excluding README.md
      const sftiFiles = allFiles.filter(f => 
        f.includes('/week.') && 
        f.endsWith('.md') && 
        !f.endsWith('README.md')
      );
      if (sftiFiles.length > 0) {
        console.log(`Found ${sftiFiles.length} trade file(s) in index.directory/SFTi.Tradez/`);
        tradeFiles.push(...sftiFiles);
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
    
    // Remove duplicates
    const uniqueFiles = [...new Set(tradeFiles)];
    
    if (uniqueFiles.length === 0) {
      console.log('No trade files found in trades/ or index.directory/SFTi.Tradez/ directories');
      // Create empty index
      const output = {
        trades: [],
        statistics: calculateStatistics([]),
        generated_at: new Date().toISOString(),
        version: '1.0'
      };
      
      // Write JSON index
      await DataAccess.saveTradesIndex(output);
      console.log(`Trade index written (empty)`);
      return output;
    }
    
    console.log(`Found ${uniqueFiles.length} total trade file(s)`);
    
    // Parse all trade files
    const trades = [];
    for (const filepath of uniqueFiles) {
      console.log(`Parsing ${filepath}...`);
      try {
        const fileData = await VFS.readFile(filepath);
        const content = fileData.content || fileData;
        const tradeData = parseTradeFile(filepath, content);
        if (tradeData) {
          trades.push(tradeData);
        }
      } catch (e) {
        console.error(`Error reading ${filepath}:`, e);
      }
    }
    
    console.log(`Successfully parsed ${trades.length} trade(s)`);
    
    // Sort trades by trade number
    trades.sort((a, b) => (a.trade_number || 0) - (b.trade_number || 0));
    
    // Calculate statistics
    const stats = calculateStatistics(trades);
    
    // Generate output
    const output = {
      trades: trades,
      statistics: stats,
      generated_at: new Date().toISOString(),
      version: '1.0'
    };
    
    // Write JSON index
    await DataAccess.saveTradesIndex(output);
    
    console.log(`Trade index written to index.directory/trades-index.json`);
    console.log(`Total trades: ${output.statistics.total_trades}`);
    console.log(`Win rate: ${output.statistics.win_rate}%`);
    console.log(`Total P&L: $${output.statistics.total_pnl}`);
    
    return output;
    
  } catch (error) {
    console.error('[ParseTrades] Error parsing trades:', error);
    throw error;
  }
}

// Export for use in pipeline
export const generate = parseTrades;
