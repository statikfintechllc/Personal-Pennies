/**
 * Global Utilities Module (JavaScript version)
 * Common utility functions used across multiple scripts to eliminate code duplication.
 * This module provides reusable functions for file operations, date parsing, and path management.
 * 
 * This is a direct JavaScript port of .github/scripts/globals_utils.py
 */

/**
 * Ensure directory exists (no-op in browser, kept for compatibility)
 * In browser context, directories are virtual (IndexedDB keys)
 * 
 * @param {string} directoryPath - Path to directory
 * @returns {string} The directory path
 */
export function ensureDirectory(directoryPath) {
  // In browser context, directories are virtual
  // IndexedDB uses keys, not actual directories
  return directoryPath;
}

/**
 * Load JSON data from IndexedDB or fetch
 * 
 * @param {string} filepath - Path to JSON file
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} Parsed JSON data or default value
 */
export async function loadJSONFile(filepath, defaultValue = null) {
  try {
    // Try IndexedDB first
    if (window.PersonalPenniesDB) {
      const key = filepath.replace('index.directory/', '');
      const data = await window.PersonalPenniesDB.getIndex(key);
      if (data) return data;
    }
    
    // Fallback to fetch
    const response = await fetch(filepath);
    if (response.ok) {
      return await response.json();
    }
    
    console.warn(`File not found: ${filepath}`);
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${filepath}:`, error);
    return defaultValue;
  }
}

/**
 * Save data to IndexedDB
 * 
 * @param {string} filepath - Path to save JSON file
 * @param {*} data - Data to serialize to JSON
 * @param {number} indent - Number of spaces for indentation (not used in IndexedDB)
 * @returns {Promise<boolean>} True if successful, False otherwise
 */
export async function saveJSONFile(filepath, data, indent = 2) {
  try {
    if (!window.PersonalPenniesDB) {
      console.error('PersonalPenniesDB not initialized');
      return false;
    }
    
    const key = filepath.replace('index.directory/', '').replace('.json', '');
    await window.PersonalPenniesDB.saveIndex(key, data);
    return true;
  } catch (error) {
    console.error(`Error saving to ${filepath}:`, error);
    return false;
  }
}

/**
 * Parse a date string into a Date object with error handling
 * Supports ISO format dates (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * 
 * @param {string} dateStr - Date string to parse
 * @param {Date|null} defaultValue - Default value to return if parsing fails
 * @returns {Date|null} Date object or default value
 */
export function parseDate(dateStr, defaultValue = null) {
  if (!dateStr) {
    return defaultValue;
  }
  
  try {
    // Handle ISO format with time
    if (dateStr.includes('T')) {
      return new Date(dateStr);
    }
    // Handle ISO format date only
    return new Date(dateStr.split('T')[0] + 'T00:00:00');
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Format a number as currency with proper sign handling
 * 
 * @param {number} amount - Amount to format
 * @param {string} symbol - Currency symbol (default: "$")
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, symbol = '$', decimals = 2) {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toFixed(decimals);
  
  if (amount >= 0) {
    return `${symbol}${formatted}`;
  } else {
    return `-${symbol}${formatted}`;
  }
}

/**
 * Safely divide two numbers, returning default if denominator is zero
 * 
 * @param {number} numerator - Numerator value
 * @param {number} denominator - Denominator value
 * @param {number} defaultValue - Value to return if denominator is zero (default: 0.0)
 * @returns {number} Result of division or default value
 */
export function safeDivide(numerator, denominator, defaultValue = 0.0) {
  if (denominator === 0) {
    return defaultValue;
  }
  return numerator / denominator;
}

/**
 * Generate a week folder name from a date object
 * Format: week.YYYY.WW (e.g., week.2025.42)
 * 
 * @param {Date} dateObj - Date object
 * @returns {string} Week folder name string
 */
export function getWeekFolder(dateObj) {
  const year = dateObj.getFullYear();
  
  // Calculate ISO week number
  const target = new Date(dateObj.valueOf());
  const dayNumber = (dateObj.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target) / 604800000);
  
  return `week.${year}.${String(week).padStart(2, '0')}`;
}

/**
 * Calculate time duration between entry and exit
 * 
 * @param {string} entryDate - Entry date string (YYYY-MM-DD)
 * @param {string} entryTime - Entry time string (HH:MM)
 * @param {string} exitDate - Exit date string (YYYY-MM-DD)
 * @param {string} exitTime - Exit time string (HH:MM)
 * @returns {string} Human-readable duration string
 */
export function calculateTimeInTrade(entryDate, entryTime, exitDate, exitTime) {
  if (!entryDate || !entryTime || !exitDate || !exitTime) {
    return 'Unknown';
  }
  
  try {
    const entryDt = new Date(`${entryDate}T${entryTime}:00`);
    const exitDt = new Date(`${exitDate}T${exitTime}:00`);
    const duration = exitDt - entryDt;
    
    const hours = duration / 3600000; // Convert ms to hours
    if (hours < 1) {
      const minutes = Math.floor(duration / 60000);
      return `${minutes} minutes`;
    } else {
      return `${hours.toFixed(1)} hours`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Validate that an object contains all required fields
 * 
 * @param {Object} data - Object to validate
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} {isValid: boolean, missingFields: Array}
 */
export function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(field => !(field in data));
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields
  };
}

/**
 * Round a float to specified decimal places
 * 
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded value
 */
export function roundDecimals(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGlobals = {
    ensureDirectory,
    loadJSONFile,
    saveJSONFile,
    parseDate,
    formatCurrency,
    safeDivide,
    getWeekFolder,
    calculateTimeInTrade,
    validateRequiredFields,
    roundDecimals
  };
}

console.log('[GlobalsUtils] Module loaded');
