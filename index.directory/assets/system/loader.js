/**
 * Personal-Pennies System Loader
 * Loads all system modules in the correct order
 * 
 * Usage: Add to HTML pages that need the client-side system
 * <script src="assets/system/loader.js" type="module"></script>
 */

// Load LocalForage from CDN
const localforageScript = document.createElement('script');
localforageScript.src = 'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js';
localforageScript.onload = async () => {
  console.log('[System] LocalForage loaded from CDN');
  
  // Now load our modules
  await loadSystemModules();
};
document.head.appendChild(localforageScript);

async function loadSystemModules() {
  try {
    // Import storage layer
    const DB = await import('./storage/db.js');

    // Import utilities
    const Utils = await import('./scripts/utils.js');

    // Import scripts
    const ParseTrades = await import('./scripts/parseTrades.js');
    const GenerateAnalytics = await import('./scripts/generateAnalytics.js');
    const ImportExport = await import('./scripts/importExport.js');

    // Import pipeline
    const Pipeline = await import('./workflows/tradePipeline.js');

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
  } catch (error) {
    console.error('[System] Failed to load system modules:', error);
  }
}
