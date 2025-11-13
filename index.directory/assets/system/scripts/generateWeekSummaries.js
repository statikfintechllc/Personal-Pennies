/**
 * Generate Week Summaries Script (JavaScript version)
 * Creates master.trade.md files for each week folder
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/generate_week_summaries.py (340 lines)
 * All week summary generation functions fully implemented
 */

/**
 * Parse trade file and extract frontmatter (from IndexedDB in browser context)
 * @param {string} tradeKey - Trade key in IndexedDB
 * @returns {Promise<Object>} Trade data from frontmatter
 */
async function parseTradeFile(tradeKey) {
  try {
    if (!window.PersonalPenniesDB) {
      return {};
    }
    
    const trade = await window.PersonalPenniesDB.getTrade(tradeKey);
    return trade || {};
  } catch (error) {
    console.error(`Error parsing trade ${tradeKey}:`, error);
    return {};
  }
}

/**
 * Collect all trades from a week folder (from IndexedDB)
 * @param {string} weekKey - Week identifier (e.g., "week.2025.45")
 * @returns {Promise<Array>} List of trade data
 */
async function collectWeekTrades(weekKey) {
  try {
    if (!window.PersonalPenniesDB) {
      return [];
    }
    
    const allTrades = await window.PersonalPenniesDB.getAllTrades();
    
    // Filter trades for this week
    const weekTrades = allTrades.filter(trade => {
      const filePath = trade._key || trade.file_path || '';
      return filePath.includes(weekKey);
    });
    
    // Sort by entry date
    weekTrades.sort((a, b) => {
      const dateA = a.entry_date || '';
      const dateB = b.entry_date || '';
      return dateA.localeCompare(dateB);
    });
    
    return weekTrades;
  } catch (error) {
    console.error(`Error collecting week trades for ${weekKey}:`, error);
    return [];
  }
}

/**
 * Calculate statistics for a week
 * @param {Array<Object>} trades - List of trade data
 * @returns {Object} Week statistics
 */
function calculateWeekStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      total_trades: 0,
      total_pnl: 0.0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      win_rate: 0.0,
      avg_win: 0.0,
      avg_loss: 0.0,
      largest_win: 0.0,
      largest_loss: 0.0,
      profit_factor: 0.0
    };
  }

  // Single-pass calculation for efficiency
  let totalPnl = 0.0;
  let winCount = 0;
  let lossCount = 0;
  let breakeven = 0;
  let totalWins = 0.0;
  let totalLosses = 0.0;
  let largestWin = 0.0;
  let largestLoss = 0.0;

  for (const trade of trades) {
    const pnl = parseFloat(trade.pnl_usd || 0);
    totalPnl += pnl;

    if (pnl > 0) {
      winCount += 1;
      totalWins += pnl;
      if (pnl > largestWin) {
        largestWin = pnl;
      }
    } else if (pnl < 0) {
      lossCount += 1;
      totalLosses += pnl;
      if (pnl < largestLoss) {
        largestLoss = pnl;
      }
    } else {
      breakeven += 1;
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades * 100) : 0.0;
  const avgWin = winCount > 0 ? totalWins / winCount : 0.0;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0.0;
  const profitFactor = totalLosses !== 0 ? totalWins / Math.abs(totalLosses) : 0.0;

  return {
    total_trades: totalTrades,
    total_pnl: Math.round(totalPnl * 100) / 100,
    wins: winCount,
    losses: lossCount,
    breakeven: breakeven,
    win_rate: Math.round(winRate * 100) / 100,
    avg_win: Math.round(avgWin * 100) / 100,
    avg_loss: Math.round(avgLoss * 100) / 100,
    largest_win: Math.round(largestWin * 100) / 100,
    largest_loss: Math.round(largestLoss * 100) / 100,
    profit_factor: Math.round(profitFactor * 100) / 100
  };
}

/**
 * Generate master markdown for a week
 * @param {string} weekName - Week identifier
 * @param {Object} stats - Week statistics
 * @param {Array<Object>} trades - List of trades
 * @returns {string} Markdown content
 */
function generateMasterMarkdown(weekName, stats, trades) {
  // Extract year and week number
  const match = weekName.match(/week\.(\d{4})\.(\d{2})/);
  const year = match ? match[1] : '';
  const weekNum = match ? match[2] : '';

  // Generate trade list
  const tradeLines = trades.map(trade => {
    const tradeNum = trade.trade_number || 0;
    const ticker = trade.ticker || 'UNKNOWN';
    const pnl = trade.pnl_usd || 0;
    const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `$${pnl.toFixed(2)}`;
    const outcome = pnl >= 0 ? '✅' : '❌';
    
    return `- ${outcome} Trade #${tradeNum}: ${ticker} - ${pnlStr}`;
  }).join('\n');

  const markdown = `# Week ${weekNum} - ${year} Summary

## 📊 Week Statistics

- **Total Trades**: ${stats.total_trades}
- **Wins**: ${stats.wins} 🎯
- **Losses**: ${stats.losses} ❌
- **Breakeven**: ${stats.breakeven} ➖
- **Win Rate**: ${stats.win_rate.toFixed(2)}%
- **Total P&L**: $${stats.total_pnl.toFixed(2)}
- **Average Win**: $${stats.avg_win.toFixed(2)}
- **Average Loss**: $${stats.avg_loss.toFixed(2)}
- **Largest Win**: $${stats.largest_win.toFixed(2)}
- **Largest Loss**: $${stats.largest_loss.toFixed(2)}
- **Profit Factor**: ${stats.profit_factor.toFixed(2)}

## 📝 Trade List

${tradeLines || '- No trades this week'}

## 🔍 Week Review

### What Went Well
_To be filled in during weekly review_

### What Needs Improvement
_To be filled in during weekly review_

### Key Takeaways
_To be filled in during weekly review_

## 📈 Next Week Goals

- Goal 1: _To be defined_
- Goal 2: _To be defined_
- Goal 3: _To be defined_

---

**Generated**: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}
`;

  return markdown;
}

/**
 * Process a week folder and generate master summary
 * @param {string} weekKey - Week identifier
 * @returns {Promise<boolean>} True if successful
 */
async function processWeekFolder(weekKey) {
  try {
    console.log(`[GenerateWeekSummaries] Processing ${weekKey}...`);
    
    // Collect trades for this week
    const trades = await collectWeekTrades(weekKey);
    
    if (trades.length === 0) {
      console.log(`[GenerateWeekSummaries] No trades found in ${weekKey}`);
      return false;
    }
    
    // Calculate statistics
    const stats = calculateWeekStats(trades);
    
    // Generate markdown
    const markdown = generateMasterMarkdown(weekKey, stats, trades);
    
    // Save to IndexedDB
    if (window.PersonalPenniesDB) {
      await window.PersonalPenniesDB.saveSummary(`week-${weekKey}`, {
        stats: stats,
        markdown: markdown,
        trades: trades.map(t => ({ trade_number: t.trade_number, ticker: t.ticker })),
        generated_at: new Date().toISOString()
      });
    }
    
    console.log(`[GenerateWeekSummaries] ✓ Generated master summary for ${weekKey}`);
    console.log(`[GenerateWeekSummaries]   ${trades.length} trades, $${stats.total_pnl.toFixed(2)} P&L`);
    
    return true;
  } catch (error) {
    console.error(`[GenerateWeekSummaries] Error processing ${weekKey}:`, error);
    return false;
  }
}

/**
 * Main function to generate all week summaries
 * @returns {Promise<Object>} Result of generation
 */
export async function generateWeekSummaries() {
  console.log('[GenerateWeekSummaries] Generating week summaries...');
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateWeekSummaries] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    
    if (!tradesIndex || !tradesIndex.trades) {
      console.warn('[GenerateWeekSummaries] No trades found');
      return { status: 'skipped', message: 'No trades' };
    }
    
    const trades = tradesIndex.trades;
    
    // Extract unique week keys from trades
    const weekKeys = new Set();
    for (const trade of trades) {
      const filePath = trade.file_path || '';
      const match = filePath.match(/(week\.\d{4}\.\d{2})/);
      if (match) {
        weekKeys.add(match[1]);
      }
    }
    
    console.log(`[GenerateWeekSummaries] Found ${weekKeys.size} week(s)`);
    
    let successCount = 0;
    for (const weekKey of weekKeys) {
      const success = await processWeekFolder(weekKey);
      if (success) {
        successCount += 1;
      }
    }
    
    console.log(`[GenerateWeekSummaries] Generated ${successCount}/${weekKeys.size} week summaries`);
    
    return { 
      status: 'success', 
      weeks_processed: weekKeys.size,
      weeks_generated: successCount
    };
    
  } catch (error) {
    console.error('[GenerateWeekSummaries] Error generating week summaries:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Generate week summaries and emit event
 */
export async function generateWeekSummariesAndEmit() {
  const result = await generateWeekSummaries();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('week-summaries:generated', result);
  }
  
  return result;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateWeekSummaries = {
    generateWeekSummaries,
    generateWeekSummariesAndEmit,
    calculateWeekStats,
    generateMasterMarkdown
  };
}

console.log('[GenerateWeekSummaries] Module loaded - FULL implementation');
