/**
 * Generate Charts Script (JavaScript version)
 * Generates equity curve data in Chart.js compatible JSON format
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/generate_charts.py (1257 lines)
 * All chart generation functions fully implemented
 */

// Standard trading session order for time of day performance
const TRADING_SESSION_ORDER = [
  'Pre-Market',
  'Morning',
  'Midday',
  'Afternoon',
  'After-Hours',
  'Extended Hours'
];

/**
 * Generate equity curve data from trades
 * @param {Array<Object>} trades - List of trade dictionaries sorted by date
 * @returns {Object} Chart.js compatible data structure
 */
export function generateEquityCurveData(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      datasets: [{
        label: 'Equity Curve',
        data: [],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        tension: 0.4
      }]
    };
  }

  // Sort trades by exit date
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = a.exit_date || a.entry_date || '';
    const dateB = b.exit_date || b.entry_date || '';
    return dateA.localeCompare(dateB);
  });

  // Calculate cumulative P&L
  const labels = [];
  const cumulativePnl = [];
  let runningTotal = 0;

  for (const trade of sortedTrades) {
    const pnl = trade.pnl_usd || 0;
    runningTotal += pnl;

    // Use exit date for the equity point
    const dateStr = trade.exit_date || trade.entry_date || '';
    try {
      const dateObj = new Date(dateStr);
      labels.push(dateObj.toISOString().split('T')[0]);
    } catch (error) {
      labels.push(dateStr);
    }

    cumulativePnl.push(Math.round(runningTotal * 100) / 100);
  }

  // Chart.js format
  return {
    labels: labels,
    datasets: [{
      label: 'Equity Curve',
      data: cumulativePnl,
      borderColor: '#00ff88',
      backgroundColor: 'rgba(0, 255, 136, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#00ff88',
      pointBorderColor: '#0a0e27',
      pointBorderWidth: 2
    }]
  };
}

/**
 * Generate win/loss ratio by strategy data in Chart.js format
 * @param {Array<Object>} trades - List of trade dictionaries
 * @returns {Object} Chart.js compatible data structure
 */
export function generateWinLossRatioByStrategyData(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      datasets: [
        { label: 'Wins', data: [], backgroundColor: '#00ff88' },
        { label: 'Losses', data: [], backgroundColor: '#ff4757' }
      ]
    };
  }

  // Aggregate by strategy
  const strategyStats = {};

  for (const trade of trades) {
    const strategy = trade.strategy || 'Unclassified';
    const pnl = trade.pnl_usd || 0;

    if (!strategyStats[strategy]) {
      strategyStats[strategy] = { wins: 0, losses: 0 };
    }

    if (pnl > 0) {
      strategyStats[strategy].wins += 1;
    } else if (pnl < 0) {
      strategyStats[strategy].losses += 1;
    }
  }

  // Sort by total trades (descending)
  const sortedStrategies = Object.entries(strategyStats).sort((a, b) => {
    const totalA = a[1].wins + a[1].losses;
    const totalB = b[1].wins + b[1].losses;
    return totalB - totalA;
  });

  // Prepare data
  const labels = [];
  const wins = [];
  const losses = [];

  for (const [strategy, stats] of sortedStrategies) {
    labels.push(strategy);
    wins.push(stats.wins);
    losses.push(stats.losses);
  }

  return {
    labels: labels,
    datasets: [
      {
        label: 'Wins',
        data: wins,
        backgroundColor: '#00ff88',
        borderColor: '#00ff88',
        borderWidth: 2
      },
      {
        label: 'Losses',
        data: losses,
        backgroundColor: '#ff4757',
        borderColor: '#ff4757',
        borderWidth: 2
      }
    ]
  };
}

/**
 * Generate performance by day of week data in Chart.js format
 * @param {Array<Object>} trades - List of trade dictionaries
 * @returns {Object} Chart.js compatible data structure
 */
export function generatePerformanceByDayData(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      datasets: [{ label: 'Average P&L', data: [], backgroundColor: [] }]
    };
  }

  // Initialize day statistics
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayStats = {};
  for (const day of days) {
    dayStats[day] = { total_pnl: 0, count: 0 };
  }

  // Aggregate by day of week
  for (const trade of trades) {
    const exitDateStr = trade.exit_date || trade.entry_date || '';
    try {
      const dateObj = new Date(exitDateStr);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const pnl = trade.pnl_usd || 0;

      if (dayStats[dayName]) {
        dayStats[dayName].total_pnl += pnl;
        dayStats[dayName].count += 1;
      }
    } catch (error) {
      continue;
    }
  }

  // Calculate averages
  const labels = [];
  const avgPnls = [];
  const colors = [];

  for (const day of days) {
    const stats = dayStats[day];
    if (stats.count > 0) {
      labels.push(day);
      const avgPnl = stats.total_pnl / stats.count;
      avgPnls.push(Math.round(avgPnl * 100) / 100);
      colors.push(avgPnl >= 0 ? '#00ff88' : '#ff4757');
    }
  }

  return {
    labels: labels,
    datasets: [{
      label: 'Average P&L',
      data: avgPnls,
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 2
    }]
  };
}

/**
 * Generate ticker performance data in Chart.js format
 * @param {Array<Object>} trades - List of trade dictionaries
 * @returns {Object} Chart.js compatible data structure
 */
export function generateTickerPerformanceData(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      datasets: [{ label: 'Total P&L', data: [], backgroundColor: [] }]
    };
  }

  // Aggregate by ticker
  const tickerStats = {};

  for (const trade of trades) {
    const ticker = trade.ticker || 'UNKNOWN';
    const pnl = trade.pnl_usd || 0;

    if (!tickerStats[ticker]) {
      tickerStats[ticker] = { total_pnl: 0, count: 0 };
    }

    tickerStats[ticker].total_pnl += pnl;
    tickerStats[ticker].count += 1;
  }

  // Sort by total P&L (descending)
  const sortedTickers = Object.entries(tickerStats).sort((a, b) => {
    return b[1].total_pnl - a[1].total_pnl;
  });

  // Take top 15 tickers
  const topTickers = sortedTickers.slice(0, 15);

  // Prepare data
  const labels = [];
  const totalPnls = [];
  const colors = [];

  for (const [ticker, stats] of topTickers) {
    labels.push(ticker);
    totalPnls.push(Math.round(stats.total_pnl * 100) / 100);
    colors.push(stats.total_pnl >= 0 ? '#00ff88' : '#ff4757');
  }

  return {
    labels: labels,
    datasets: [{
      label: 'Total P&L',
      data: totalPnls,
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 2
    }]
  };
}

/**
 * Generate time of day performance data in Chart.js format
 * @param {Array<Object>} trades - List of trade dictionaries
 * @returns {Object} Chart.js compatible data structure
 */
export function generateTimeOfDayPerformanceData(trades) {
  if (!trades || trades.length === 0) {
    return {
      labels: [],
      datasets: [{ label: 'Average P&L', data: [], backgroundColor: [] }]
    };
  }

  // Initialize session statistics
  const sessionStats = {};
  for (const session of TRADING_SESSION_ORDER) {
    sessionStats[session] = { total_pnl: 0, count: 0 };
  }

  // Aggregate by session
  for (const trade of trades) {
    const sessionTags = trade.session_tags || [];
    const sessions = Array.isArray(sessionTags) ? sessionTags : [sessionTags].filter(Boolean);
    const pnl = trade.pnl_usd || 0;

    if (sessions.length > 0) {
      const session = sessions[0]; // Use first session
      if (sessionStats[session]) {
        sessionStats[session].total_pnl += pnl;
        sessionStats[session].count += 1;
      }
    }
  }

  // Calculate averages in order
  const labels = [];
  const avgPnls = [];
  const colors = [];

  for (const session of TRADING_SESSION_ORDER) {
    const stats = sessionStats[session];
    if (stats.count > 0) {
      labels.push(session);
      const avgPnl = stats.total_pnl / stats.count;
      avgPnls.push(Math.round(avgPnl * 100) / 100);
      colors.push(avgPnl >= 0 ? '#00ff88' : '#ff4757');
    }
  }

  return {
    labels: labels,
    datasets: [{
      label: 'Average P&L',
      data: avgPnls,
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 2
    }]
  };
}

/**
 * Format date label based on timeframe
 * @param {Date} date - Date object
 * @param {string} timeframe - Timeframe ('7d', '1m', '3m', '6m', '1y', 'all')
 * @param {string} interval - Interval ('day', 'week', 'month')
 * @returns {string} Formatted date label
 */
function formatDateLabel(date, timeframe, interval = null) {
  if (interval === 'month' || timeframe === '1y' || timeframe === 'all') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } else if (interval === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get timeframe range
 * @param {Date} endDate - End date
 * @param {string} timeframe - Timeframe identifier
 * @returns {Date} Start date
 */
function getTimeframeRange(endDate, timeframe) {
  const startDate = new Date(endDate);
  
  switch (timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '1m':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3m':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6m':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(startDate.getFullYear() - 100); // Far past
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }
  
  return startDate;
}

/**
 * Get default interval for timeframe
 * @param {string} timeframe - Timeframe identifier
 * @returns {string} Interval ('day', 'week', 'month')
 */
function getDefaultInterval(timeframe) {
  if (timeframe === '7d' || timeframe === '1m') {
    return 'day';
  } else if (timeframe === '3m') {
    return 'week';
  } else {
    return 'month';
  }
}

/**
 * Parse trade datetime
 * @param {Object} trade - Trade object
 * @returns {Date} Trade date
 */
function parseTradeDateTime(trade) {
  const dateStr = trade.exit_date || trade.entry_date || '';
  try {
    return new Date(dateStr);
  } catch (error) {
    return new Date();
  }
}

/**
 * Filter and aggregate trades by timeframe
 * @param {Array<Date>} dates - Array of dates
 * @param {Array<number>} values - Array of values
 * @param {string} timeframe - Timeframe identifier
 * @param {string} interval - Interval ('day', 'week', 'month')
 * @param {Date} endDate - End date
 * @param {number} baseValue - Base value to start from
 * @returns {Object} Aggregated data {labels, values}
 */
function filterAndAggregateByTimeframe(dates, values, timeframe, interval, endDate, baseValue = 0) {
  if (dates.length === 0) {
    return { labels: [], values: [] };
  }

  const startDate = getTimeframeRange(endDate, timeframe);
  
  // Filter data within timeframe
  const filteredData = [];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= startDate && dates[i] <= endDate) {
      filteredData.push({ date: dates[i], value: values[i] });
    }
  }

  if (filteredData.length === 0) {
    return { labels: [], values: [] };
  }

  // Aggregate by interval
  const aggregated = new Map();
  
  for (const item of filteredData) {
    let key;
    if (interval === 'month') {
      key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
    } else if (interval === 'week') {
      const weekNum = Math.floor((item.date - new Date(item.date.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
      key = `${item.date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    } else {
      key = item.date.toISOString().split('T')[0];
    }
    
    aggregated.set(key, item.value);
  }

  // Convert to arrays
  const labels = [];
  const aggregatedValues = [];
  
  for (const [key, value] of aggregated) {
    const date = new Date(key);
    labels.push(formatDateLabel(date, timeframe, interval));
    aggregatedValues.push(value);
  }

  return { labels, values: aggregatedValues };
}

/**
 * Generate portfolio value charts
 * @param {Array<Object>} trades - List of trade dictionaries
 * @param {Object} accountConfig - Account configuration
 * @returns {Object} Portfolio charts data
 */
export function generatePortfolioValueCharts(trades, accountConfig) {
  if (!trades || trades.length === 0) {
    return {
      '7d': { labels: [], datasets: [] },
      '1m': { labels: [], datasets: [] },
      '3m': { labels: [], datasets: [] },
      '6m': { labels: [], datasets: [] },
      '1y': { labels: [], datasets: [] },
      'all': { labels: [], datasets: [] }
    };
  }

  const startingBalance = accountConfig?.starting_balance || 0;
  const deposits = accountConfig?.deposits || [];
  const withdrawals = accountConfig?.withdrawals || [];

  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = a.exit_date || a.entry_date || '';
    const dateB = b.exit_date || b.entry_date || '';
    return dateA.localeCompare(dateB);
  });

  // Calculate portfolio value over time
  const dates = [];
  const portfolioValues = [];
  let currentValue = startingBalance;

  // Add initial value
  if (sortedTrades.length > 0) {
    const firstDate = parseTradeDateTime(sortedTrades[0]);
    dates.push(new Date(firstDate.getTime() - 86400000)); // Day before first trade
    portfolioValues.push(startingBalance);
  }

  for (const trade of sortedTrades) {
    const pnl = trade.pnl_usd || 0;
    currentValue += pnl;
    
    const tradeDate = parseTradeDateTime(trade);
    dates.push(tradeDate);
    portfolioValues.push(Math.round(currentValue * 100) / 100);
  }

  const endDate = dates.length > 0 ? dates[dates.length - 1] : new Date();
  const timeframes = ['7d', '1m', '3m', '6m', '1y', 'all'];
  const charts = {};

  for (const timeframe of timeframes) {
    const interval = getDefaultInterval(timeframe);
    const aggregated = filterAndAggregateByTimeframe(
      dates,
      portfolioValues,
      timeframe,
      interval,
      endDate,
      startingBalance
    );

    charts[timeframe] = {
      labels: aggregated.labels,
      datasets: [{
        label: 'Portfolio Value',
        data: aggregated.values,
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  }

  return charts;
}

/**
 * Generate total return charts
 * @param {Array<Object>} trades - List of trade dictionaries
 * @param {Object} accountConfig - Account configuration
 * @returns {Object} Total return charts data
 */
export function generateTotalReturnCharts(trades, accountConfig) {
  if (!trades || trades.length === 0) {
    return {
      '7d': { labels: [], datasets: [] },
      '1m': { labels: [], datasets: [] },
      '3m': { labels: [], datasets: [] },
      '6m': { labels: [], datasets: [] },
      '1y': { labels: [], datasets: [] },
      'all': { labels: [], datasets: [] }
    };
  }

  const startingBalance = accountConfig?.starting_balance || 0;
  const deposits = accountConfig?.deposits || [];
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const initialCapital = startingBalance + totalDeposits;

  if (initialCapital <= 0) {
    return {
      '7d': { labels: [], datasets: [] },
      '1m': { labels: [], datasets: [] },
      '3m': { labels: [], datasets: [] },
      '6m': { labels: [], datasets: [] },
      '1y': { labels: [], datasets: [] },
      'all': { labels: [], datasets: [] }
    };
  }

  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = a.exit_date || a.entry_date || '';
    const dateB = b.exit_date || b.entry_date || '';
    return dateA.localeCompare(dateB);
  });

  // Calculate cumulative return percentage over time
  const dates = [];
  const returnPercentages = [];
  let cumulativePnl = 0;

  // Add initial point
  if (sortedTrades.length > 0) {
    const firstDate = parseTradeDateTime(sortedTrades[0]);
    dates.push(new Date(firstDate.getTime() - 86400000));
    returnPercentages.push(0);
  }

  for (const trade of sortedTrades) {
    const pnl = trade.pnl_usd || 0;
    cumulativePnl += pnl;
    
    const returnPercent = (cumulativePnl / initialCapital) * 100;
    
    const tradeDate = parseTradeDateTime(trade);
    dates.push(tradeDate);
    returnPercentages.push(Math.round(returnPercent * 100) / 100);
  }

  const endDate = dates.length > 0 ? dates[dates.length - 1] : new Date();
  const timeframes = ['7d', '1m', '3m', '6m', '1y', 'all'];
  const charts = {};

  for (const timeframe of timeframes) {
    const interval = getDefaultInterval(timeframe);
    const aggregated = filterAndAggregateByTimeframe(
      dates,
      returnPercentages,
      timeframe,
      interval,
      endDate,
      0
    );

    charts[timeframe] = {
      labels: aggregated.labels,
      datasets: [{
        label: 'Total Return %',
        data: aggregated.values,
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  }

  return charts;
}

/**
 * Main function to generate all charts
 * @returns {Promise<Object>} All chart data
 */
export async function generateCharts() {
  console.log('[GenerateCharts] Generating all chart data...');
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateCharts] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    // Load trades and account config
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    const accountConfig = await window.PersonalPenniesDB.getConfig('account-config');
    
    if (!tradesIndex || !tradesIndex.trades) {
      console.warn('[GenerateCharts] No trades found');
      return { status: 'skipped', message: 'No trades' };
    }
    
    const trades = tradesIndex.trades;
    
    console.log(`[GenerateCharts] Generating charts for ${trades.length} trades...`);
    
    // Generate all charts
    const allCharts = {
      equity_curve: generateEquityCurveData(trades),
      win_loss_by_strategy: generateWinLossRatioByStrategyData(trades),
      performance_by_day: generatePerformanceByDayData(trades),
      ticker_performance: generateTickerPerformanceData(trades),
      time_of_day_performance: generateTimeOfDayPerformanceData(trades),
      portfolio_value_charts: generatePortfolioValueCharts(trades, accountConfig),
      total_return_charts: generateTotalReturnCharts(trades, accountConfig),
      generated_at: new Date().toISOString()
    };
    
    // Save all chart data to IndexedDB
    await window.PersonalPenniesDB.saveChart('all-charts', allCharts);
    
    console.log('[GenerateCharts] All charts generated and saved');
    console.log(`[GenerateCharts] Charts: equity_curve, win_loss_by_strategy, performance_by_day, ticker_performance, time_of_day_performance, portfolio_value, total_return`);
    
    return { status: 'success', data: allCharts };
    
  } catch (error) {
    console.error('[GenerateCharts] Error generating charts:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Generate charts and emit event
 */
export async function generateChartsAndEmit() {
  const result = await generateCharts();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('charts:generated', result);
  }
  
  return result;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateCharts = {
    generateCharts,
    generateChartsAndEmit,
    generateEquityCurveData,
    generateWinLossRatioByStrategyData,
    generatePerformanceByDayData,
    generateTickerPerformanceData,
    generateTimeOfDayPerformanceData,
    generatePortfolioValueCharts,
    generateTotalReturnCharts
  };
}

console.log('[GenerateCharts] Module loaded - FULL implementation');
