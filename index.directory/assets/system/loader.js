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
    const GlobalsUtils = await import('./scripts/globalsUtils.js');

    // Import scripts
    const ParseTrades = await import('./scripts/parseTrades.js');
    const GenerateAnalytics = await import('./scripts/generateAnalytics.js');
    const GenerateCharts = await import('./scripts/generateCharts.js');
    const GenerateSummaries = await import('./scripts/generateSummaries.js');
    const GenerateTradePages = await import('./scripts/generateTradePages.js');
    const GenerateWeekSummaries = await import('./scripts/generateWeekSummaries.js');
    const GenerateBooksIndex = await import('./scripts/generateBooksIndex.js');
    const GenerateNotesIndex = await import('./scripts/generateNotesIndex.js');
    const GenerateIndex = await import('./scripts/generateIndex.js');
    const UpdateHomepage = await import('./scripts/updateHomepage.js');
    const NavbarTemplate = await import('./scripts/navbarTemplate.js');
    const NormalizeSchema = await import('./scripts/normalizeSchema.js');
    const AttachMedia = await import('./scripts/attachMedia.js');
    const ImportExport = await import('./scripts/importExport.js');
    
    // Import broker importers
    const Importers = await import('./scripts/importers/index.js');

    // Import pipeline
    const Pipeline = await import('./workflows/tradePipeline.js');

    // Make modules globally available
    window.PersonalPenniesSystem = {
      DB,
      Utils,
      GlobalsUtils,
      ParseTrades,
      GenerateAnalytics,
      GenerateCharts,
      GenerateSummaries,
      GenerateTradePages,
      GenerateWeekSummaries,
      GenerateBooksIndex,
      GenerateNotesIndex,
      GenerateIndex,
      UpdateHomepage,
      NavbarTemplate,
      NormalizeSchema,
      AttachMedia,
      ImportExport,
      Importers,
      Pipeline,
      version: '1.0.0',
      ready: true
    };

    console.log('[System] Personal-Pennies client-side system loaded successfully');
    console.log('[System] Version:', window.PersonalPenniesSystem.version);
    console.log('[System] Modules loaded:', Object.keys(window.PersonalPenniesSystem).length);

    // Emit system ready event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('system:ready', { version: '1.0.0' });
    }
  } catch (error) {
    console.error('[System] Failed to load system modules:', error);
  }
}
