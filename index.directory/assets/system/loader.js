/**
 * Personal-Pennies System Loader
 * Loads all system modules in the correct order
 * 
 * Usage: Add to HTML pages that need the client-side system
 * <script src="assets/system/loader.js" type="module"></script>
 */

// Load LocalForage from local vendor directory (bundled locally, but updates client-side)
const localforageScript = document.createElement('script');
// Use path relative to the base path of the site
const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '';
localforageScript.src = `${basePath}/index.directory/assets/system/vendor/localforage.min.js`;
localforageScript.onload = async () => {
  console.log('[System] LocalForage loaded from local bundle');
  
  // Now load our modules
  await loadSystemModules();
};
localforageScript.onerror = (error) => {
  console.error('[System] Failed to load LocalForage:', error);
  console.error('[System] Attempted to load from:', localforageScript.src);
};
document.head.appendChild(localforageScript);

async function loadSystemModules() {
  try {
    // Import VFS (filesystem-based storage)
    const VFS = await import('./storage/vfs.js');
    const VFSInit = await import('./storage/vfs-init.js');
    const VFSAdapter = await import('./storage/vfs-adapter.js');
    const DataAccess = await import('./storage/data-access.js');

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
      VFS,
      VFSInit,
      VFSAdapter,
      DataAccess,
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
      version: '2.0.0',
      ready: true
    };
    
    // Also expose DataAccess globally for easy access
    window.PersonalPenniesDataAccess = DataAccess;

    console.log('[System] Personal-Pennies client-side system loaded successfully');
    console.log('[System] Version:', window.PersonalPenniesSystem.version);
    console.log('[System] Modules loaded:', Object.keys(window.PersonalPenniesSystem).length);

    // Initialize VFS (filesystem-based storage)
    await initializeVFS();

    // Emit system ready event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('system:ready', { version: '2.0.0' });
    }
  } catch (error) {
    console.error('[System] Failed to load system modules:', error);
  }
}

/**
 * Initialize VFS and populate with repository content
 */
async function initializeVFS() {
  try {
    console.log('[VFS] Initializing Virtual Filesystem...');
    
    // Auto-initialize VFS if empty
    const stats = await window.PersonalPenniesSystem.VFSInit.autoInitialize();
    
    console.log('[VFS] Virtual Filesystem ready');
    console.log('[VFS] Files:', stats.totalFiles, '| Size:', stats.totalSizeMB, 'MB');
    
    // Emit VFS ready event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('vfs:ready', stats);
    }
  } catch (error) {
    console.error('[VFS] Failed to initialize Virtual Filesystem:', error);
  }
}
