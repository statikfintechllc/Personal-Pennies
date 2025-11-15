/**
 * Generate Analytics Script (JavaScript version)
 * Computes advanced analytics from trades data including expectancy, streaks,
 * per-tag aggregates, drawdown series, and profit factors.
 * 
 * This is a direct JavaScript port of .github/scripts/generate_analytics.py
 * Preserves all 21 analytics calculations exactly.
 * 
 * Output: Saved to IndexedDB analytics store
 */

// Get functions from global scope (loaded by loader.js)
function getDependencies() {
  return {
    loadTradesIndex: window.PersonalPenniesDataAccess?.loadTradesIndex,
    loadAccountConfig: window.PersonalPenniesDataAccess?.loadAccountConfig,
    sortTradesByDate: window.PersonalPenniesSystem?.Utils?.sortTradesByDate,
    saveAnalytics: window.PersonalPenniesDataAccess?.saveAnalytics
  };
}

// Constants
const MAX_PROFIT_FACTOR = 999.99; // Used when profit factor would be infinity (all wins, no losses)

/**
 * Calculate percentage-based returns metrics
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @param {number} startingBalance - Initial account balance
 * @param {Array<Object>} deposits - List of deposit records
 * @param {Array<Object>} withdrawals - List of withdrawal records
 * @returns {Object} Returns metrics including total return %, avg return %, etc.
 */
function calculateReturnsMetrics(trades, startingBalance, deposits, withdrawals = []) {
  if (!trades || trades.length === 0 || startingBalance <= 0) {
    return {
      total_return_percent: 0.0,
      avg_return_percent: 0.0,
      max_drawdown_percent: 0.0,
      avg_risk_percent: 0.0,
      avg_position_size_percent: 0.0
    };
  }
  
  // Calculate total P&L
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  
  // Calculate total deposits and withdrawals
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  
  // Initial capital for returns calculation (subtract withdrawals)
  const initialCapital = startingBalance + totalDeposits - totalWithdrawals;
  
  // Total return % = (Total P&L / Initial Capital) * 100
  const totalReturnPercent = initialCapital > 0 ? (totalPnl / initialCapital * 100) : 0;
  
  // Average return per trade as % of account
  const avgReturnPercent = (initialCapital > 0 && trades.length > 0) 
    ? (totalPnl / trades.length / initialCapital * 100) 
    : 0;
  
  // Calculate max drawdown as percentage
  const cumulativePnl = [];
  let runningTotal = 0;
  for (const trade of trades) {
    runningTotal += trade.pnl_usd || 0;
    cumulativePnl.push(runningTotal);
  }
  
  let peak = 0;
  let maxDrawdownDollars = 0;
  for (const value of cumulativePnl) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = value - peak;
    if (drawdown < maxDrawdownDollars) {
      maxDrawdownDollars = drawdown;
    }
  }
  
  // Max drawdown % = (Max DD in $) / (Starting Balance + Deposits) * 100
  const maxDrawdownPercent = initialCapital > 0 ? (maxDrawdownDollars / initialCapital * 100) : 0;
  
  // Average risk per trade (as % of account at time of trade)
  let totalRiskPercent = 0.0;
  let accountBalance = initialCapital;
  
  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;
    const positionValue = Math.abs((trade.entry_price || 0) * (trade.position_size || 0));
    
    if (accountBalance > 0 && positionValue > 0) {
      totalRiskPercent += (positionValue / accountBalance * 100);
    }
    
    // Update account balance for next trade
    accountBalance += pnl;
  }
  
  const avgPositionSizePercent = trades.length > 0 ? totalRiskPercent / trades.length : 0;
  
  // Calculate average risk based on actual losses
  const losses = trades.filter(t => (t.pnl_usd || 0) < 0);
  let avgRiskPercent = 0.0;
  if (losses.length > 0) {
    const avgLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_usd || 0), 0) / losses.length);
    avgRiskPercent = initialCapital > 0 ? (avgLoss / initialCapital * 100) : 0;
  }
  
  return {
    total_return_percent: Math.round(totalReturnPercent * 100) / 100,
    avg_return_percent: Math.round(avgReturnPercent * 10000) / 10000,
    max_drawdown_percent: Math.round(maxDrawdownPercent * 100) / 100,
    avg_risk_percent: Math.round(avgRiskPercent * 1000) / 1000,
    avg_position_size_percent: Math.round(avgPositionSizePercent * 100) / 100
  };
}

/**
 * Calculate expectancy (average P&L per trade)
 * Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {number} Expectancy value
 */
function calculateExpectancy(trades) {
  if (!trades || trades.length === 0) {
    return 0.0;
  }

  const total = trades.length;
  let winCount = 0;
  let lossCount = 0;
  let totalWins = 0.0;
  let totalLosses = 0.0;
  
  for (const t of trades) {
    const pnl = t.pnl_usd || 0;
    if (pnl > 0) {
      winCount++;
      totalWins += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalLosses += pnl;
    }
  }

  const winRate = total > 0 ? winCount / total : 0;
  const lossRate = total > 0 ? lossCount / total : 0;

  const avgWin = winCount > 0 ? totalWins / winCount : 0;
  const avgLoss = lossCount > 0 ? Math.abs(totalLosses / lossCount) : 0;

  const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
  return Math.round(expectancy * 100) / 100;
}

/**
 * Calculate profit factor (gross profit / gross loss)
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {number} Profit factor (returns 0 if no losses to avoid Infinity)
 */
function calculateProfitFactor(trades) {
  if (!trades || trades.length === 0) {
    return 0.0;
  }

  let grossProfit = 0.0;
  let grossLoss = 0.0;
  
  for (const t of trades) {
    const pnl = t.pnl_usd || 0;
    if (pnl > 0) {
      grossProfit += pnl;
    } else if (pnl < 0) {
      grossLoss += pnl;
    }
  }

  grossLoss = Math.abs(grossLoss);
  
  // Return 0 if no losses (avoids Infinity in JSON)
  if (grossLoss === 0) {
    return grossProfit === 0 ? 0.0 : MAX_PROFIT_FACTOR;
  }

  return Math.round((grossProfit / grossLoss) * 100) / 100;
}

/**
 * Calculate max win and loss streaks
 * 
 * @param {Array<Object>} trades - List of trade objects (sorted by date)
 * @returns {Object} {maxWinStreak, maxLossStreak}
 */
function calculateStreaks(trades) {
  if (!trades || trades.length === 0) {
    return { maxWinStreak: 0, maxLossStreak: 0 };
  }

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;

    if (pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  }

  return { maxWinStreak, maxLossStreak };
}

/**
 * Calculate drawdown series over time
 * 
 * @param {Array<Object>} trades - List of trade objects (sorted by date)
 * @returns {Object} {labels: [...], values: [...]}
 */
function calculateDrawdownSeries(trades) {
  if (!trades || trades.length === 0) {
    return { labels: [], values: [] };
  }

  const labels = [];
  const drawdowns = [];

  const cumulativePnl = [];
  let runningTotal = 0;

  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;
    runningTotal += pnl;
    cumulativePnl.push(runningTotal);

    // Date label
    const dateStr = trade.exit_date || trade.entry_date || '';
    try {
      const dateObj = new Date(dateStr.split('T')[0]);
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      labels.push(`${month}/${day}`);
    } catch {
      labels.push(dateStr);
    }
  }

  // Calculate drawdown from peak (start peak at 0 for proper drawdown calculation)
  let peak = 0;
  for (const value of cumulativePnl) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = value - peak;
    drawdowns.push(Math.round(drawdown * 100) / 100);
  }

  return { labels, values: drawdowns };
}

/**
 * Calculate Kelly Criterion percentage
 * Kelly % = W - [(1 - W) / R]
 * where W = win rate, R = avg win / avg loss ratio
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {number} Kelly percentage
 */
function calculateKellyCriterion(trades) {
  if (!trades || trades.length === 0) {
    return 0.0;
  }

  let winCount = 0;
  let lossCount = 0;
  let totalWins = 0.0;
  let totalLosses = 0.0;
  
  for (const t of trades) {
    const pnl = t.pnl_usd || 0;
    if (pnl > 0) {
      winCount++;
      totalWins += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalLosses += pnl;
    }
  }

  if (winCount === 0 || lossCount === 0) {
    return 0.0;
  }

  const winRate = winCount / trades.length;
  const avgWin = totalWins / winCount;
  const avgLoss = Math.abs(totalLosses / lossCount);

  if (avgLoss === 0) {
    return 0.0;
  }

  const rRatio = avgWin / avgLoss;
  const kelly = winRate - ((1 - winRate) / rRatio);

  return Math.round(kelly * 1000) / 10; // Return as percentage with 1 decimal
}

/**
 * Calculate Sharpe Ratio - risk-adjusted returns
 * Sharpe Ratio = (Average Return - Risk Free Rate) / Standard Deviation of Returns
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @param {number} riskFreeRate - Risk-free rate (default 0% for simplicity)
 * @returns {number} Sharpe ratio
 */
function calculateSharpeRatio(trades, riskFreeRate = 0.0) {
  if (!trades || trades.length < 2) {
    return 0.0;
  }
  
  // Get returns as percentages
  const returns = trades.map(t => t.pnl_percent || 0);
  
  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) {
    return 0.0;
  }
  
  const sharpe = (avgReturn - riskFreeRate) / stdDev;
  
  return Math.round(sharpe * 100) / 100;
}

/**
 * Calculate R-Multiple distribution - returns in risk units
 * R-Multiple = (Exit Price - Entry Price) / (Entry Price - Stop Loss)
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {Object} R-multiple distribution data
 */
function calculateRMultipleDistribution(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      data: [],
      avg_r_multiple: 0,
      median_r_multiple: 0
    };
  }
  
  const rMultiples = [];
  
  for (const trade of trades) {
    const entryPrice = trade.entry_price || 0;
    const exitPrice = trade.exit_price || 0;
    const stopLoss = trade.stop_loss || 0;
    const direction = trade.direction || 'LONG';
    
    if (entryPrice === 0 || stopLoss === 0) {
      continue;
    }
    
    // Calculate risk (distance from entry to stop)
    let risk, gain;
    if (direction === 'LONG') {
      risk = entryPrice - stopLoss;
      gain = exitPrice - entryPrice;
    } else { // SHORT
      risk = stopLoss - entryPrice;
      gain = entryPrice - exitPrice;
    }
    
    if (risk <= 0) {
      continue;
    }
    
    // R-multiple is gain divided by risk
    const rMultiple = gain / risk;
    rMultiples.push(rMultiple);
  }
  
  if (rMultiples.length === 0) {
    return {
      labels: [],
      data: [],
      avg_r_multiple: 0,
      median_r_multiple: 0
    };
  }
  
  // Create histogram buckets
  const buckets = {
    '< -2R': 0,
    '-2R to -1R': 0,
    '-1R to 0R': 0,
    '0R to 1R': 0,
    '1R to 2R': 0,
    '2R to 3R': 0,
    '> 3R': 0
  };
  
  for (const r of rMultiples) {
    if (r < -2) {
      buckets['< -2R']++;
    } else if (r < -1) {
      buckets['-2R to -1R']++;
    } else if (r < 0) {
      buckets['-1R to 0R']++;
    } else if (r < 1) {
      buckets['0R to 1R']++;
    } else if (r < 2) {
      buckets['1R to 2R']++;
    } else if (r < 3) {
      buckets['2R to 3R']++;
    } else {
      buckets['> 3R']++;
    }
  }
  
  // Calculate statistics
  const avgR = rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length;
  const sortedR = [...rMultiples].sort((a, b) => a - b);
  const medianR = sortedR.length % 2 === 1
    ? sortedR[Math.floor(sortedR.length / 2)]
    : (sortedR[sortedR.length / 2 - 1] + sortedR[sortedR.length / 2]) / 2;
  
  return {
    labels: Object.keys(buckets),
    data: Object.values(buckets),
    avg_r_multiple: Math.round(avgR * 100) / 100,
    median_r_multiple: Math.round(medianR * 100) / 100
  };
}

/**
 * Calculate MAE (Mean Adverse Excursion) and MFE (Mean Favorable Excursion)
 * Note: This requires intraday data collection which is not currently available.
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {Object} MAE/MFE analysis placeholder
 */
function calculateMAEMFEAnalysis(trades) {
  return {
    available: false,
    message: 'MAE/MFE analysis requires intraday price data collection. This feature will be available once intraday high/low prices are tracked for each trade.',
    mae_avg: 0,
    mfe_avg: 0,
    note: 'To enable this metric, add \'intraday_high\' and \'intraday_low\' fields to trade entries.'
  };
}

/**
 * Aggregate statistics by a tag field (strategy, setup, etc.)
 * Handles both single-value fields (e.g., 'strategy') and array fields (e.g., 'setup_tags', 'session_tags')
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @param {string} tagField - Field to group by (e.g., 'strategy', 'setup_tags', 'session_tags')
 * @returns {Object} {tagValue: {stats...}, ...}
 */
function aggregateByTag(trades, tagField) {
  const aggregates = new Map();

  // Group trades by tag and calculate stats in single pass
  for (const trade of trades) {
    let tagValue = trade[tagField];
    
    // Handle array/list tags - convert to string or take first element
    if (Array.isArray(tagValue)) {
      tagValue = tagValue.length > 0 ? String(tagValue[0]) : 'Unclassified';
    }
    
    if (!tagValue || tagValue === '') {
      tagValue = 'Unclassified';
    }

    if (!aggregates.has(tagValue)) {
      aggregates.set(tagValue, {
        trades: [],
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl: 0.0,
        avg_pnl: 0,
        expectancy: 0
      });
    }

    aggregates.get(tagValue).trades.push(trade);
  }

  // Calculate stats for each tag in optimized manner
  for (const [tagValue, data] of aggregates.entries()) {
    const tagTrades = data.trades;
    data.total_trades = tagTrades.length;
    
    // Calculate all metrics in single pass
    let winCount = 0;
    let lossCount = 0;
    let totalPnl = 0.0;
    
    for (const t of tagTrades) {
      const pnl = t.pnl_usd || 0;
      totalPnl += pnl;
      if (pnl > 0) {
        winCount++;
      } else if (pnl < 0) {
        lossCount++;
      }
    }
    
    data.winning_trades = winCount;
    data.losing_trades = lossCount;
    data.win_rate = data.total_trades > 0 
      ? Math.round((winCount / data.total_trades * 100) * 10) / 10
      : 0;
    data.total_pnl = Math.round(totalPnl * 100) / 100;
    data.avg_pnl = data.total_trades > 0 
      ? Math.round((totalPnl / data.total_trades) * 100) / 100
      : 0;
    data.expectancy = calculateExpectancy(tagTrades);

    // Remove trades list from output
    delete data.trades;
  }

  return Object.fromEntries(aggregates);
}

/**
 * Main function to generate analytics
 * @returns {Promise<Object>} Analytics data
 */
export async function generateAnalytics() {
  console.log('[GenerateAnalytics] Starting analytics generation...');

  const { loadTradesIndex, loadAccountConfig, sortTradesByDate, saveAnalytics } = getDependencies();
  
  if (!loadTradesIndex || !loadAccountConfig || !sortTradesByDate || !saveAnalytics) {
    console.error('[GenerateAnalytics] Dependencies not loaded');
    throw new Error('Required dependencies not loaded');
  }

  // Load account config
  const accountConfig = await loadAccountConfig();
  const startingBalance = accountConfig.starting_balance || 1000.00;
  const totalDeposits = (accountConfig.deposits || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWithdrawals = (accountConfig.withdrawals || []).reduce((sum, w) => sum + (w.amount || 0), 0);
  
  // Load trades index
  const indexData = await loadTradesIndex();
  if (!indexData) {
    console.error('[GenerateAnalytics] No trades index found');
    return null;
  }

  const trades = indexData.trades || [];
  const stats = indexData.statistics || {};
  const totalPnl = stats.total_pnl || 0;
  
  // Calculate portfolio value (subtract withdrawals)
  const portfolioValue = startingBalance + totalDeposits - totalWithdrawals + totalPnl;
  
  if (trades.length === 0) {
    console.warn('[GenerateAnalytics] No trades found in index');
    // Create empty analytics
    const analytics = {
      expectancy: 0,
      profit_factor: 0,
      max_win_streak: 0,
      max_loss_streak: 0,
      max_drawdown: 0,
      kelly_criterion: 0,
      by_strategy: {},
      by_setup: {},
      by_session: {},
      drawdown_series: { labels: [], values: [] },
      account: {
        starting_balance: startingBalance,
        total_deposits: totalDeposits,
        total_pnl: totalPnl,
        portfolio_value: portfolioValue
      },
      generated_at: new Date().toISOString()
    };
    
    await saveAnalytics(analytics);
    return analytics;
  }

  console.log(`[GenerateAnalytics] Processing ${trades.length} trades...`);

  // Sort trades by date
  const sortedTrades = sortTradesByDate(trades);

  // Calculate overall metrics
  const expectancy = calculateExpectancy(sortedTrades);
  const profitFactor = calculateProfitFactor(sortedTrades);
  const streaks = calculateStreaks(sortedTrades);
  const drawdownSeries = calculateDrawdownSeries(sortedTrades);
  const maxDrawdown = drawdownSeries.values.length > 0 
    ? Math.min(...drawdownSeries.values) 
    : 0;
  const kelly = calculateKellyCriterion(sortedTrades);
  
  // Calculate advanced analytics
  const sharpeRatio = calculateSharpeRatio(sortedTrades);
  const rMultipleDist = calculateRMultipleDistribution(sortedTrades);
  const maeMfe = calculateMAEMFEAnalysis(sortedTrades);
  
  // Calculate percentage-based returns metrics
  const returnsMetrics = calculateReturnsMetrics(
    sortedTrades, 
    startingBalance, 
    accountConfig.deposits || [],
    accountConfig.withdrawals || []
  );

  // Aggregate by tags
  const byStrategy = aggregateByTag(sortedTrades, 'strategy');
  const bySetup = aggregateByTag(sortedTrades, 'setup_tags');
  const bySession = aggregateByTag(sortedTrades, 'session_tags');

  const analytics = {
    expectancy: expectancy,
    profit_factor: profitFactor,
    max_win_streak: streaks.maxWinStreak,
    max_loss_streak: streaks.maxLossStreak,
    max_drawdown: maxDrawdown,
    max_drawdown_percent: returnsMetrics.max_drawdown_percent,
    kelly_criterion: kelly,
    sharpe_ratio: sharpeRatio,
    r_multiple_distribution: rMultipleDist,
    mae_mfe_analysis: maeMfe,
    by_strategy: byStrategy,
    by_setup: bySetup,
    by_session: bySession,
    drawdown_series: drawdownSeries,
    returns: {
      total_return_percent: returnsMetrics.total_return_percent,
      avg_return_percent: returnsMetrics.avg_return_percent,
      avg_risk_percent: returnsMetrics.avg_risk_percent,
      avg_position_size_percent: returnsMetrics.avg_position_size_percent
    },
    account: {
      starting_balance: startingBalance,
      total_deposits: totalDeposits,
      total_pnl: totalPnl,
      portfolio_value: portfolioValue
    },
    generated_at: new Date().toISOString()
  };

  // Save analytics data to IndexedDB
  await saveAnalytics(analytics);

  console.log(`[GenerateAnalytics] Analytics generated successfully`);
  console.log(`[GenerateAnalytics] Expectancy: $${analytics.expectancy}`);
  console.log(`[GenerateAnalytics] Profit Factor: ${analytics.profit_factor}`);
  console.log(`[GenerateAnalytics] Kelly Criterion: ${analytics.kelly_criterion}%`);

  return analytics;
}

/**
 * Generate analytics and emit event when complete
 */
export async function generateAnalyticsAndEmit() {
  const analytics = await generateAnalytics();
  
  // Emit event to trigger next pipeline step
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('analytics:generated', analytics);
  }
  
  return analytics;
}

// Alias for pipeline compatibility
export const generate = generateAnalytics;

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesAnalytics = {
    generateAnalytics,
    generateAnalyticsAndEmit,
    generate: generateAnalytics
  };
}

console.log('[GenerateAnalytics] Module loaded');
