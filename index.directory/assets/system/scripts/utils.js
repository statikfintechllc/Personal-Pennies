/**
 * Common Utilities Module (JavaScript version)
 * Shared functions used across multiple scripts to avoid code duplication.
 * 
 * This is a direct JavaScript port of .github/scripts/utils.py
 */

import { getIndex, getConfig } from '../storage/db.js';

/**
 * Load the trades index from IndexedDB
 * 
 * @returns {Promise<Object|null>} The trades index data, or null if not found
 */
export async function loadTradesIndex() {
  try {
    const index = await getIndex('trades-index');
    if (!index) {
      console.warn('trades-index not found in IndexedDB. Run parseTrades first.');
      return null;
    }
    return index;
  } catch (error) {
    console.error('Error loading trades index:', error);
    return null;
  }
}

/**
 * Load account configuration with starting balance, deposits, and withdrawals
 * 
 * @returns {Promise<Object>} Account configuration data with defaults if not found
 * 
 * Note: Default starting_balance is 0 to match the repository's account-config.json
 */
export async function loadAccountConfig() {
  try {
    const config = await getConfig('account-config');
    if (!config) {
      console.warn('account-config not found in IndexedDB, using defaults');
      return {
        starting_balance: 0,
        deposits: [],
        withdrawals: [],
        version: '1.0'
      };
    }
    return config;
  } catch (error) {
    console.error('Error loading account config:', error);
    return {
      starting_balance: 0,
      deposits: [],
      withdrawals: [],
      version: '1.0'
    };
  }
}

/**
 * Calculate statistics for a group of trades.
 * Shared function used by generate_summaries and other scripts.
 * 
 * @param {Array<Object>} trades - List of trade objects
 * @returns {Object} Period statistics including wins, losses, P&L, best/worst trades
 */
export function calculatePeriodStats(trades) {
  if (!trades || trades.length === 0) {
    return {};
  }

  const totalTrades = trades.length;
  
  // Single pass to calculate all metrics
  let winCount = 0;
  let lossCount = 0;
  let totalPnl = 0.0;
  let totalVolume = 0;
  let bestTrade = null;
  let worstTrade = null;
  let bestPnl = -Infinity;
  let worstPnl = Infinity;
  
  // Strategy breakdown using Map for efficiency
  const strategies = new Map();
  
  for (const trade of trades) {
    const pnl = trade.pnl_usd || 0;
    totalPnl += pnl;
    totalVolume += trade.position_size || 0;
    
    // Track wins/losses
    if (pnl > 0) {
      winCount++;
    } else if (pnl < 0) {
      lossCount++;
    }
    
    // Track best/worst trades
    if (pnl > bestPnl) {
      bestPnl = pnl;
      bestTrade = trade;
    }
    if (pnl < worstPnl) {
      worstPnl = pnl;
      worstTrade = trade;
    }
    
    // Update strategy breakdown
    const strategy = trade.strategy || 'Unknown';
    if (!strategies.has(strategy)) {
      strategies.set(strategy, { count: 0, pnl: 0.0 });
    }
    const stratData = strategies.get(strategy);
    stratData.count++;
    stratData.pnl += pnl;
  }

  // Use first trade as fallback if no best/worst found
  if (bestTrade === null) {
    bestTrade = trades[0];
  }
  if (worstTrade === null) {
    worstTrade = trades[0];
  }

  return {
    total_trades: totalTrades,
    winning_trades: winCount,
    losing_trades: lossCount,
    win_rate: totalTrades > 0 ? Math.round((winCount / totalTrades * 100) * 100) / 100 : 0,
    total_pnl: Math.round(totalPnl * 100) / 100,
    avg_pnl: totalTrades > 0 ? Math.round((totalPnl / totalTrades) * 100) / 100 : 0,
    best_trade: {
      ticker: bestTrade.ticker,
      pnl: Math.round((bestTrade.pnl_usd || 0) * 100) / 100,
      trade_number: bestTrade.trade_number
    },
    worst_trade: {
      ticker: worstTrade.ticker,
      pnl: Math.round((worstTrade.pnl_usd || 0) * 100) / 100,
      trade_number: worstTrade.trade_number
    },
    total_volume: totalVolume,
    strategies: Object.fromEntries(strategies)
  };
}

/**
 * Format date as MM:DD:YYYY (used for filenames)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Date in MM:DD:YYYY format
 */
export function formatDateForFilename(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${month}:${day}:${year}`;
}

/**
 * Calculate year and week number from date (ISO week)
 * @param {Date} date - Date object
 * @returns {string} Year and week in format "YYYY.WW"
 */
export function getYearWeekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const thursdayOfTargetWeek = new Date(target.valueOf());
  const year = thursdayOfTargetWeek.getFullYear();
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${year}.${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Parse date string to Date object
 * @param {string} dateStr - Date string in various formats
 * @returns {Date} Date object
 */
export function parseDate(dateStr) {
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  
  // Handle MM:DD:YYYY format
  if (/^\d{2}:\d{2}:\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split(':');
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }
  
  // Fallback to standard parsing
  return new Date(dateStr);
}

/**
 * Round number to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export function round(value, decimals = 2) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {boolean} showSign - Whether to show + for positive values
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, showSign = false) {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

/**
 * Format percentage value
 * @param {number} value - Value to format
 * @param {boolean} showSign - Whether to show + for positive values
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, showSign = false) {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sort trades by date (entry_date, then exit_date)
 * @param {Array<Object>} trades - Trades to sort
 * @param {boolean} descending - Sort in descending order
 * @returns {Array<Object>} Sorted trades
 */
export function sortTradesByDate(trades, descending = false) {
  const sorted = [...trades].sort((a, b) => {
    const dateA = a.exit_date || a.entry_date || '';
    const dateB = b.exit_date || b.entry_date || '';
    return dateA.localeCompare(dateB);
  });
  
  return descending ? sorted.reverse() : sorted;
}

/**
 * Group trades by week
 * @param {Array<Object>} trades - Trades to group
 * @returns {Map<string, Array<Object>>} Map of week key to trades
 */
export function groupTradesByWeek(trades) {
  const weekMap = new Map();
  
  for (const trade of trades) {
    const entryDate = parseDate(trade.entry_date);
    const weekKey = getYearWeekNumber(entryDate);
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    
    weekMap.get(weekKey).push(trade);
  }
  
  return weekMap;
}

/**
 * Calculate time in trade (in minutes)
 * @param {string} entryDate - Entry date (YYYY-MM-DD)
 * @param {string} entryTime - Entry time (HH:MM)
 * @param {string} exitDate - Exit date (YYYY-MM-DD)
 * @param {string} exitTime - Exit time (HH:MM)
 * @returns {number} Time in trade (minutes)
 */
export function calculateTimeInTrade(entryDate, entryTime, exitDate, exitTime) {
  const entry = new Date(`${entryDate}T${entryTime}:00`);
  const exit = new Date(`${exitDate}T${exitTime}:00`);
  return Math.round((exit - entry) / 60000); // Convert ms to minutes
}

/**
 * Calculate risk:reward ratio
 * @param {number} entryPrice - Entry price
 * @param {number} stopLoss - Stop loss price
 * @param {number} targetPrice - Target price
 * @param {string} direction - Trade direction (LONG/SHORT)
 * @returns {number} Risk:reward ratio
 */
export function calculateRiskRewardRatio(entryPrice, stopLoss, targetPrice, direction) {
  if (direction === 'LONG') {
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  } else {
    const risk = stopLoss - entryPrice;
    const reward = entryPrice - targetPrice;
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
}

/**
 * Calculate P&L in USD
 * @param {number} entryPrice - Entry price
 * @param {number} exitPrice - Exit price
 * @param {number} positionSize - Position size (shares)
 * @param {string} direction - Trade direction (LONG/SHORT)
 * @returns {number} P&L in USD
 */
export function calculatePnLUSD(entryPrice, exitPrice, positionSize, direction) {
  if (direction === 'LONG') {
    return Math.round((exitPrice - entryPrice) * positionSize * 100) / 100;
  } else {
    return Math.round((entryPrice - exitPrice) * positionSize * 100) / 100;
  }
}

/**
 * Calculate P&L as percentage
 * @param {number} entryPrice - Entry price
 * @param {number} exitPrice - Exit price
 * @param {string} direction - Trade direction (LONG/SHORT)
 * @returns {number} P&L as percentage
 */
export function calculatePnLPercent(entryPrice, exitPrice, direction) {
  if (direction === 'LONG') {
    return Math.round(((exitPrice - entryPrice) / entryPrice * 100) * 100) / 100;
  } else {
    return Math.round(((entryPrice - exitPrice) / entryPrice * 100) * 100) / 100;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesUtils = {
    loadTradesIndex,
    loadAccountConfig,
    calculatePeriodStats,
    formatDateForFilename,
    getYearWeekNumber,
    parseDate,
    round,
    formatCurrency,
    formatPercent,
    deepClone,
    sortTradesByDate,
    groupTradesByWeek,
    calculateTimeInTrade,
    calculateRiskRewardRatio,
    calculatePnLUSD,
    calculatePnLPercent
  };
}

console.log('[Utils] Utilities module loaded');
