/**
 * Personal-Pennies System Loader
 * Loads all system modules in the correct order
 * 
 * Usage: Add to HTML pages that need the client-side system
 * <script src="assets/system/loader.js" type="module"></script>
 */

// Import LocalForage first
import localforage from 'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js';

// Make it globally available
window.localforage = localforage;

// Import storage layer
import * as DB from './storage/db.js';

// Import utilities
import * as Utils from './scripts/utils.js';

// Import scripts
import * as ParseTrades from './scripts/parseTrades.js';
import * as GenerateAnalytics from './scripts/generateAnalytics.js';
import * as ImportExport from './scripts/importExport.js';

// Import pipeline
import * as Pipeline from './workflows/tradePipeline.js';

// Export all modules for easy access
export {
  DB,
  Utils,
  ParseTrades,
  GenerateAnalytics,
  ImportExport,
  Pipeline
};

// Make modules globally available
window.PersonalPenniesSystem = {
  DB,
  Utils,
  ParseTrades,
  GenerateAnalytics,
  ImportExport,
  Pipeline,
  version: '1.0.0',
  ready: true
};

console.log('[System] Personal-Pennies client-side system loaded successfully');
console.log('[System] Version:', window.PersonalPenniesSystem.version);

// Emit system ready event
if (window.SFTiEventBus) {
  window.SFTiEventBus.emit('system:ready', { version: '1.0.0' });
}
