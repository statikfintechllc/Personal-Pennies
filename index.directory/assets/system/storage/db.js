/**
 * IndexedDB Storage Layer for Personal-Pennies
 * Uses LocalForage for IndexedDB management with mobile-friendly API
 * 
 * Database: PersonalPennies
 * Stores: trades, notes, books, media, analytics, charts, summaries
 * 
 * Key Pattern: Mirrors file structure (e.g., "week.2025.45/11:05:2025.1.md")
 */

// LocalForage is loaded globally via CDN in loader.js
const localforage = window.localforage;

// Database configuration
const DB_NAME = 'PersonalPennies';
const DB_VERSION = 1;

// Store names
export const STORES = {
  TRADES: 'trades',
  NOTES: 'notes',
  BOOKS: 'books',
  MEDIA: 'media',
  ANALYTICS: 'analytics',
  CHARTS: 'charts',
  SUMMARIES: 'summaries',
  INDEXES: 'indexes',
  CONFIG: 'config'
};

// Initialize stores
const stores = {};

/**
 * Initialize all LocalForage stores
 */
export function initializeDB() {
  console.log('[DB] Initializing IndexedDB stores...');
  
  // Create a store for each type
  Object.entries(STORES).forEach(([key, storeName]) => {
    stores[storeName] = localforage.createInstance({
      name: DB_NAME,
      version: DB_VERSION,
      storeName: storeName,
      description: `PersonalPennies ${storeName} store`
    });
  });
  
  console.log('[DB] All stores initialized');
  return stores;
}

/**
 * Get a specific store instance
 */
export function getStore(storeName) {
  if (!stores[storeName]) {
    throw new Error(`Store ${storeName} not initialized. Call initializeDB() first.`);
  }
  return stores[storeName];
}

/**
 * Save trade to IndexedDB
 * Key format: "week.YYYY.WW/MM:DD:YYYY.N.md"
 */
export async function saveTrade(weekKey, tradeData) {
  const store = getStore(STORES.TRADES);
  const key = `${weekKey}/${tradeData.entry_date.replace(/-/g, ':')}${tradeData.trade_number ? '.' + tradeData.trade_number : ''}.md`;
  
  console.log('[DB] Saving trade:', key);
  await store.setItem(key, {
    ...tradeData,
    _saved_at: new Date().toISOString(),
    _key: key
  });
  
  return key;
}

/**
 * Get trade from IndexedDB
 */
export async function getTrade(key) {
  const store = getStore(STORES.TRADES);
  return await store.getItem(key);
}

/**
 * Get all trades from IndexedDB
 */
export async function getAllTrades() {
  const store = getStore(STORES.TRADES);
  const keys = await store.keys();
  const trades = [];
  
  for (const key of keys) {
    const trade = await store.getItem(key);
    if (trade) {
      trades.push(trade);
    }
  }
  
  return trades;
}

/**
 * Delete trade from IndexedDB
 */
export async function deleteTrade(key) {
  const store = getStore(STORES.TRADES);
  console.log('[DB] Deleting trade:', key);
  await store.removeItem(key);
}

/**
 * Save index data (trades-index.json, books-index.json, etc.)
 */
export async function saveIndex(indexName, data) {
  const store = getStore(STORES.INDEXES);
  console.log('[DB] Saving index:', indexName);
  await store.setItem(indexName, {
    data: data,
    _updated_at: new Date().toISOString()
  });
}

/**
 * Get index data
 */
export async function getIndex(indexName) {
  const store = getStore(STORES.INDEXES);
  const record = await store.getItem(indexName);
  return record ? record.data : null;
}

/**
 * Save analytics data
 */
export async function saveAnalytics(data) {
  const store = getStore(STORES.ANALYTICS);
  console.log('[DB] Saving analytics');
  await store.setItem('current', {
    ...data,
    _updated_at: new Date().toISOString()
  });
}

/**
 * Get analytics data
 */
export async function getAnalytics() {
  const store = getStore(STORES.ANALYTICS);
  const record = await store.getItem('current');
  return record || null;
}

/**
 * Save chart data
 */
export async function saveChart(chartName, data) {
  const store = getStore(STORES.CHARTS);
  console.log('[DB] Saving chart:', chartName);
  await store.setItem(chartName, {
    data: data,
    _updated_at: new Date().toISOString()
  });
}

/**
 * Get chart data
 */
export async function getChart(chartName) {
  const store = getStore(STORES.CHARTS);
  const record = await store.getItem(chartName);
  return record ? record.data : null;
}

/**
 * Save summary data
 */
export async function saveSummary(summaryKey, data) {
  const store = getStore(STORES.SUMMARIES);
  console.log('[DB] Saving summary:', summaryKey);
  await store.setItem(summaryKey, {
    data: data,
    _updated_at: new Date().toISOString()
  });
}

/**
 * Get summary data
 */
export async function getSummary(summaryKey) {
  const store = getStore(STORES.SUMMARIES);
  const record = await store.getItem(summaryKey);
  return record ? record.data : null;
}

/**
 * Save configuration (account-config.json)
 */
export async function saveConfig(configName, data) {
  const store = getStore(STORES.CONFIG);
  console.log('[DB] Saving config:', configName);
  await store.setItem(configName, {
    ...data,
    _updated_at: new Date().toISOString()
  });
}

/**
 * Get configuration
 */
export async function getConfig(configName) {
  const store = getStore(STORES.CONFIG);
  return await store.getItem(configName);
}

/**
 * Save note to IndexedDB
 */
export async function saveNote(key, noteData) {
  const store = getStore(STORES.NOTES);
  console.log('[DB] Saving note:', key);
  await store.setItem(key, {
    ...noteData,
    _saved_at: new Date().toISOString()
  });
}

/**
 * Get all notes
 */
export async function getAllNotes() {
  const store = getStore(STORES.NOTES);
  const keys = await store.keys();
  const notes = [];
  
  for (const key of keys) {
    const note = await store.getItem(key);
    if (note) {
      notes.push(note);
    }
  }
  
  return notes;
}

/**
 * Save book to IndexedDB
 */
export async function saveBook(key, bookData) {
  const store = getStore(STORES.BOOKS);
  console.log('[DB] Saving book:', key);
  await store.setItem(key, {
    ...bookData,
    _saved_at: new Date().toISOString()
  });
}

/**
 * Get all books
 */
export async function getAllBooks() {
  const store = getStore(STORES.BOOKS);
  const keys = await store.keys();
  const books = [];
  
  for (const key of keys) {
    const book = await store.getItem(key);
    if (book) {
      books.push(book);
    }
  }
  
  return books;
}

/**
 * Save media file reference
 */
export async function saveMedia(key, mediaData) {
  const store = getStore(STORES.MEDIA);
  console.log('[DB] Saving media reference:', key);
  await store.setItem(key, {
    ...mediaData,
    _saved_at: new Date().toISOString()
  });
}

/**
 * Get media reference
 */
export async function getMedia(key) {
  const store = getStore(STORES.MEDIA);
  return await store.getItem(key);
}

/**
 * Export all data as JSON (for backup)
 */
export async function exportAllData() {
  console.log('[DB] Exporting all data...');
  const exportData = {
    version: DB_VERSION,
    exported_at: new Date().toISOString(),
    stores: {}
  };
  
  for (const storeName of Object.values(STORES)) {
    const store = getStore(storeName);
    const keys = await store.keys();
    const storeData = {};
    
    for (const key of keys) {
      storeData[key] = await store.getItem(key);
    }
    
    exportData.stores[storeName] = storeData;
  }
  
  console.log('[DB] Export complete');
  return exportData;
}

/**
 * Import data from JSON backup
 */
export async function importAllData(exportData) {
  console.log('[DB] Importing data...');
  
  if (!exportData.stores) {
    throw new Error('Invalid export data format');
  }
  
  for (const [storeName, storeData] of Object.entries(exportData.stores)) {
    const store = getStore(storeName);
    
    for (const [key, value] of Object.entries(storeData)) {
      await store.setItem(key, value);
    }
    
    console.log(`[DB] Imported ${Object.keys(storeData).length} items to ${storeName}`);
  }
  
  console.log('[DB] Import complete');
}

/**
 * Clear a specific store
 */
export async function clearStore(storeName) {
  const store = getStore(storeName);
  console.log('[DB] Clearing store:', storeName);
  await store.clear();
}

/**
 * Clear all stores (full reset)
 */
export async function clearAllStores() {
  console.log('[DB] Clearing all stores...');
  
  for (const storeName of Object.values(STORES)) {
    await clearStore(storeName);
  }
  
  console.log('[DB] All stores cleared');
}

// Initialize on import
initializeDB();

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesDB = {
    initializeDB,
    getStore,
    STORES,
    // Trade operations
    saveTrade,
    getTrade,
    getAllTrades,
    deleteTrade,
    // Index operations
    saveIndex,
    getIndex,
    // Analytics operations
    saveAnalytics,
    getAnalytics,
    // Chart operations
    saveChart,
    getChart,
    // Summary operations
    saveSummary,
    getSummary,
    // Config operations
    saveConfig,
    getConfig,
    // Note operations
    saveNote,
    getAllNotes,
    // Book operations
    saveBook,
    getAllBooks,
    // Media operations
    saveMedia,
    getMedia,
    // Utility operations
    exportAllData,
    importAllData,
    clearStore,
    clearAllStores
  };
}

console.log('[DB] Storage layer loaded');
