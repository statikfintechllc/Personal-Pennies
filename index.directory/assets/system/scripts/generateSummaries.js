/**
 * Generate Summaries Script (JavaScript version)
 * Generates weekly, monthly, and yearly summaries from parsed trade data
 * Enhanced to preserve user reviews and auto-aggregate higher-level summaries
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/generate_summaries.py (507 lines)
 * All summary generation functions fully implemented
 */

/**
 * Group trades by time period (week, month, year)
 * @param {Array<Object>} trades - List of trade dictionaries
 * @param {string} period - 'week', 'month', or 'year'
 * @returns {Object} Dictionary with period keys and trade lists as values
 */
function groupTradesByPeriod(trades, period = 'week') {
  const grouped = {};

  for (const trade of trades) {
    try {
      // Parse date
      const entryDateStr = trade.entry_date || '';
      const entryDate = new Date(entryDateStr);

      // Generate key based on period type
      let key;
      if (period === 'week') {
        const year = entryDate.getFullYear();
        // Calculate ISO week number
        const target = new Date(entryDate.valueOf());
        const dayNr = (entryDate.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
        key = `${year}-W${String(weekNum).padStart(2, '0')}`;
      } else if (period === 'month') {
        const year = entryDate.getFullYear();
        const month = entryDate.getMonth() + 1;
        key = `${year}-${String(month).padStart(2, '0')}`;
      } else if (period === 'year') {
        key = String(entryDate.getFullYear());
      } else {
        key = 'unknown';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(trade);
    } catch (error) {
      console.warn(`Warning: Could not parse date for trade ${trade.trade_number}:`, error);
      continue;
    }
  }

  return grouped;
}

/**
 * Calculate period statistics from trades
 * @param {Array<Object>} trades - List of trades in the period
 * @returns {Object} Statistics object
 */
function calculatePeriodStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_pnl: 0,
      avg_pnl: 0,
      best_trade: { ticker: 'N/A', pnl: 0 },
      worst_trade: { ticker: 'N/A', pnl: 0 },
      total_volume: 0,
      strategies: {}
    };
  }

  let totalPnl = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalVolume = 0;
  let bestTrade = null;
  let worstTrade = null;
  const strategies = {};

  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;
    const volume = trade.position_size || 0;
    const strategy = trade.strategy || 'Unclassified';

    totalPnl += pnl;
    totalVolume += volume;

    if (pnl > 0) {
      winningTrades += 1;
    } else if (pnl < 0) {
      losingTrades += 1;
    }

    // Track best and worst trades
    if (!bestTrade || pnl > bestTrade.pnl) {
      bestTrade = { ticker: trade.ticker || 'UNKNOWN', pnl: pnl };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = { ticker: trade.ticker || 'UNKNOWN', pnl: pnl };
    }

    // Aggregate by strategy
    if (!strategies[strategy]) {
      strategies[strategy] = { count: 0, pnl: 0 };
    }
    strategies[strategy].count += 1;
    strategies[strategy].pnl += pnl;
  }

  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;

  return {
    total_trades: trades.length,
    winning_trades: winningTrades,
    losing_trades: losingTrades,
    win_rate: Math.round(winRate * 100) / 100,
    total_pnl: Math.round(totalPnl * 100) / 100,
    avg_pnl: Math.round(avgPnl * 100) / 100,
    best_trade: bestTrade || { ticker: 'N/A', pnl: 0 },
    worst_trade: worstTrade || { ticker: 'N/A', pnl: 0 },
    total_volume: totalVolume,
    strategies: strategies
  };
}

/**
 * Load existing summary and extract user-filled review sections
 * @param {string} periodKey - Period identifier
 * @returns {Promise<Object|null>} Extracted review sections or null
 */
async function loadExistingSummary(periodKey) {
  try {
    if (!window.PersonalPenniesDB) {
      return null;
    }

    const summary = await window.PersonalPenniesDB.getSummary(periodKey);
    if (!summary || !summary.review) {
      return null;
    }

    return summary.review;
  } catch (error) {
    console.warn(`Warning: Error loading existing summary ${periodKey}:`, error);
    return null;
  }
}

/**
 * Generate markdown summary for a period
 * @param {string} periodKey - Period identifier (e.g., '2025-W42')
 * @param {Object} periodStats - Statistics for the period
 * @param {string} periodType - 'week', 'month', or 'year'
 * @param {Object|null} existingReview - Existing review content to preserve
 * @returns {string} Markdown content
 */
function generateSummaryMarkdown(periodKey, periodStats, periodType = 'week', existingReview = null) {
  let title;
  if (periodType === 'week') {
    const weekNum = periodKey.split('-W')[1];
    title = `Week ${weekNum} Summary`;
  } else if (periodType === 'month') {
    const [year, month] = periodKey.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];
    title = `${monthName} ${year} Summary`;
  } else {
    title = `${periodKey} Summary`;
  }

  // Strategy breakdown
  const strategyLines = [];
  for (const [strategy, data] of Object.entries(periodStats.strategies || {})) {
    strategyLines.push(`- **${strategy}**: ${data.count} trades, $${data.pnl.toFixed(2)} P&L`);
  }
  const strategyBreakdown = strategyLines.length > 0 
    ? strategyLines.join('\n') 
    : '- No strategies recorded';

  // Use existing review content if available, otherwise use placeholders
  const whatWentWell = existingReview?.what_went_well || '_To be filled in manually during review_';
  const needsImprovement = existingReview?.needs_improvement || '_To be filled in manually during review_';
  const keyLessons = existingReview?.key_lessons || '_To be filled in manually during review_';
  const nextGoals = existingReview?.next_goals || '- _Goal 1_\n- _Goal 2_\n- _Goal 3_';

  const markdown = `# ${title}

**Period**: ${periodKey}

## Statistics

- **Total Trades**: ${periodStats.total_trades}
- **Winning Trades**: ${periodStats.winning_trades}
- **Losing Trades**: ${periodStats.losing_trades}
- **Win Rate**: ${periodStats.win_rate}%
- **Total P&L**: $${periodStats.total_pnl.toFixed(2)}
- **Average P&L per Trade**: $${periodStats.avg_pnl.toFixed(2)}
- **Best Trade**: ${periodStats.best_trade.ticker} (+$${periodStats.best_trade.pnl.toFixed(2)})
- **Worst Trade**: ${periodStats.worst_trade.ticker} ($${periodStats.worst_trade.pnl.toFixed(2)})
- **Total Volume Traded**: ${periodStats.total_volume.toLocaleString()} shares

## Performance Analysis

### What Went Well

${whatWentWell}

### What Needs Improvement

${needsImprovement}

### Key Lessons Learned

${keyLessons}

## Strategy Breakdown

${strategyBreakdown}

## Next Period Goals

${nextGoals}

---

**Generated**: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}
`;

  return markdown;
}

/**
 * Generate all summaries (weekly, monthly, yearly)
 * @returns {Promise<Object>} Summary generation result
 */
export async function generateSummaries() {
  console.log('[GenerateSummaries] Generating all summaries...');
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateSummaries] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    // Load trades index
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    
    if (!tradesIndex || !tradesIndex.trades) {
      console.warn('[GenerateSummaries] No trades found');
      return { status: 'skipped', message: 'No trades' };
    }
    
    const trades = tradesIndex.trades;
    console.log(`[GenerateSummaries] Processing ${trades.length} trades...`);
    
    // Group trades by period
    const weeklyGroups = groupTradesByPeriod(trades, 'week');
    const monthlyGroups = groupTradesByPeriod(trades, 'month');
    const yearlyGroups = groupTradesByPeriod(trades, 'year');
    
    const summaries = {
      weekly: {},
      monthly: {},
      yearly: {},
      generated_at: new Date().toISOString()
    };
    
    // Generate weekly summaries
    console.log(`[GenerateSummaries] Generating ${Object.keys(weeklyGroups).length} weekly summaries...`);
    for (const [periodKey, periodTrades] of Object.entries(weeklyGroups)) {
      const stats = calculatePeriodStats(periodTrades);
      const existingReview = await loadExistingSummary(`weekly-${periodKey}`);
      const markdown = generateSummaryMarkdown(periodKey, stats, 'week', existingReview);
      
      summaries.weekly[periodKey] = {
        stats: stats,
        markdown: markdown,
        review: existingReview || {
          what_went_well: '',
          needs_improvement: '',
          key_lessons: '',
          next_goals: ''
        }
      };
      
      // Save to IndexedDB
      await window.PersonalPenniesDB.saveSummary(`weekly-${periodKey}`, summaries.weekly[periodKey]);
    }
    
    // Generate monthly summaries
    console.log(`[GenerateSummaries] Generating ${Object.keys(monthlyGroups).length} monthly summaries...`);
    for (const [periodKey, periodTrades] of Object.entries(monthlyGroups)) {
      const stats = calculatePeriodStats(periodTrades);
      const existingReview = await loadExistingSummary(`monthly-${periodKey}`);
      const markdown = generateSummaryMarkdown(periodKey, stats, 'month', existingReview);
      
      summaries.monthly[periodKey] = {
        stats: stats,
        markdown: markdown,
        review: existingReview || {
          what_went_well: '',
          needs_improvement: '',
          key_lessons: '',
          next_goals: ''
        }
      };
      
      // Save to IndexedDB
      await window.PersonalPenniesDB.saveSummary(`monthly-${periodKey}`, summaries.monthly[periodKey]);
    }
    
    // Generate yearly summaries
    console.log(`[GenerateSummaries] Generating ${Object.keys(yearlyGroups).length} yearly summaries...`);
    for (const [periodKey, periodTrades] of Object.entries(yearlyGroups)) {
      const stats = calculatePeriodStats(periodTrades);
      const existingReview = await loadExistingSummary(`yearly-${periodKey}`);
      const markdown = generateSummaryMarkdown(periodKey, stats, 'year', existingReview);
      
      summaries.yearly[periodKey] = {
        stats: stats,
        markdown: markdown,
        review: existingReview || {
          what_went_well: '',
          needs_improvement: '',
          key_lessons: '',
          next_goals: ''
        }
      };
      
      // Save to IndexedDB
      await window.PersonalPenniesDB.saveSummary(`yearly-${periodKey}`, summaries.yearly[periodKey]);
    }
    
    // Save overall summaries index
    await window.PersonalPenniesDB.saveSummary('summaries-index', {
      weekly_count: Object.keys(summaries.weekly).length,
      monthly_count: Object.keys(summaries.monthly).length,
      yearly_count: Object.keys(summaries.yearly).length,
      weekly_keys: Object.keys(summaries.weekly),
      monthly_keys: Object.keys(summaries.monthly),
      yearly_keys: Object.keys(summaries.yearly),
      generated_at: summaries.generated_at
    });
    
    console.log('[GenerateSummaries] All summaries generated successfully');
    console.log(`[GenerateSummaries] Weekly: ${Object.keys(summaries.weekly).length}, Monthly: ${Object.keys(summaries.monthly).length}, Yearly: ${Object.keys(summaries.yearly).length}`);
    
    return { status: 'success', data: summaries };
    
  } catch (error) {
    console.error('[GenerateSummaries] Error generating summaries:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Generate summaries and emit event
 */
export async function generateSummariesAndEmit() {
  const result = await generateSummaries();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('summaries:generated', result);
  }
  
  return result;
}

// Alias for pipeline compatibility
export const generate = generateSummaries;

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateSummaries = {
    generateSummaries,
    generateSummariesAndEmit,
    generate: generateSummaries,
    groupTradesByPeriod,
    calculatePeriodStats,
    generateSummaryMarkdown
  };
}

console.log('[GenerateSummaries] Module loaded - FULL implementation');
