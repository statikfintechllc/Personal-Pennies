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
    // Import storage layer (legacy bucket-based)
    const DB = await import('./storage/db.js');
    
    // Import VFS (new filesystem-based storage)
    const VFS = await import('./storage/vfs.js');
    const VFSInit = await import('./storage/vfs-init.js');
    const VFSAdapter = await import('./storage/vfs-adapter.js');

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
      VFS,
      VFSInit,
      VFSAdapter,
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

    console.log('[System] Personal-Pennies client-side system loaded successfully');
    console.log('[System] Version:', window.PersonalPenniesSystem.version);
    console.log('[System] Modules loaded:', Object.keys(window.PersonalPenniesSystem).length);

    // Initialize VFS (new filesystem-based storage)
    await initializeVFS();
    
    // Check if legacy IndexedDB needs to be seeded with initial data (for backwards compatibility)
    await seedIndexedDBIfEmpty();

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
    const stats = await window.PersonalPenniesVFSInit.autoInitialize();
    
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

/**
 * Seeds IndexedDB with data from JSON files if database is empty
 * This ensures first-time users see data immediately
 * 
 * NOTE: This is legacy code for backwards compatibility
 * New code should use VFS instead
 */
async function seedIndexedDBIfEmpty() {
  try {
    console.log('[Seed] Checking if IndexedDB needs seeding...');
    
    // Check if trades exist in IndexedDB
    const trades = await window.PersonalPenniesDB.getAllTrades();
    
    if (!trades || trades.length === 0) {
      console.log('[Seed] IndexedDB is empty, loading seed data from JSON files...');
      
      // Determine base path (works for both root and subdirectory deployments)
      const basePath = window.location.pathname.includes('/index.directory/') 
        ? window.location.pathname.split('/index.directory/')[0] 
        : '';
      
      // Load trades-index.json
      try {
        const tradesResponse = await fetch(`${basePath}/index.directory/trades-index.json`);
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          console.log('[Seed] Loaded trades data from JSON:', tradesData.trades?.length || 0, 'trades');
          
          // Save each trade to IndexedDB
          if (tradesData.trades && Array.isArray(tradesData.trades)) {
            for (const trade of tradesData.trades) {
              await window.PersonalPenniesDB.saveTrade(trade);
            }
            console.log('[Seed] ✓ Saved', tradesData.trades.length, 'trades to IndexedDB');
          }
        }
      } catch (error) {
        console.warn('[Seed] Could not load trades-index.json:', error);
      }
      
      // Load analytics.json
      try {
        const analyticsResponse = await fetch(`${basePath}/index.directory/analytics.json`);
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          console.log('[Seed] Loaded analytics data from JSON');
          
          // Save analytics to IndexedDB
          await window.PersonalPenniesDB.saveAnalytics(analyticsData);
          console.log('[Seed] ✓ Saved analytics to IndexedDB');
        }
      } catch (error) {
        console.warn('[Seed] Could not load analytics.json:', error);
      }
      
      // Load account-config.json
      try {
        const configResponse = await fetch(`${basePath}/index.directory/account-config.json`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          console.log('[Seed] Loaded account config from JSON');
          
          // Save account config to IndexedDB
          await window.PersonalPenniesDB.saveConfig('account-config', configData);
          console.log('[Seed] ✓ Saved account config to IndexedDB');
        }
      } catch (error) {
        console.warn('[Seed] Could not load account-config.json:', error);
      }
      
      console.log('[Seed] ✓ Database seeding complete - IndexedDB now has initial data');
    } else {
      console.log('[Seed] IndexedDB already contains data (' + trades.length + ' trades), skipping seed');
    }
  } catch (error) {
    console.error('[Seed] Error during database seeding:', error);
  }
}
