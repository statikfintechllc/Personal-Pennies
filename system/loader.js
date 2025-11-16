/**
 * Personal-Pennies System Loader
 * Loads all system modules in the correct order
 * 
 * Usage: Add to HTML pages that need the client-side system
 * <script src="system/loader.js" type="module"></script>
 */

// Load LocalForage from local vendor directory (bundled locally, but updates client-side)
const localforageScript = document.createElement('script');
// Use path relative to the base path of the site
const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '';
localforageScript.src = `${basePath}/system/vendor/localforage.min.js`;
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
    const GlobalsUtils = await import('./scripts/globals_utils.js');

    // Import scripts (using named exports)
    const ParseTradesModule = await import('./scripts/parse_trades.js');
    const ParseTrades = { parseTrades: ParseTradesModule.parseTrades, generate: ParseTradesModule.parseTrades };
    
    const GenerateAnalyticsModule = await import('./scripts/generate_analytics.js');
    const GenerateAnalytics = { generate: GenerateAnalyticsModule.generate || GenerateAnalyticsModule.generateAnalytics };
    
    const GenerateChartsModule = await import('./scripts/generate_charts.js');
    const GenerateCharts = { generate: GenerateChartsModule.generate || GenerateChartsModule.generateCharts };
    
    const GenerateSummariesModule = await import('./scripts/generate_summaries.js');
    const GenerateSummaries = { generate: GenerateSummariesModule.generate || GenerateSummariesModule.generateSummaries };
    
    const GenerateTradePagesModule = await import('./scripts/generate_trade_pages.js');
    const GenerateTradePages = { generate: GenerateTradePagesModule.generate || GenerateTradePagesModule.generateTradePages };
    
    const GenerateWeekSummariesModule = await import('./scripts/generate_week_summaries.js');
    const GenerateWeekSummaries = { generate: GenerateWeekSummariesModule.generate || GenerateWeekSummariesModule.generateWeekSummaries };
    
    const GenerateBooksIndexModule = await import('./scripts/generate_books_index.js');
    const GenerateBooksIndex = { generate: GenerateBooksIndexModule.generate || GenerateBooksIndexModule.generateBooksIndex };
    
    const GenerateNotesIndexModule = await import('./scripts/generate_notes_index.js');
    const GenerateNotesIndex = { generate: GenerateNotesIndexModule.generate || GenerateNotesIndexModule.generateNotesIndex };
    
    const GenerateIndexModule = await import('./scripts/generate_index.js');
    const GenerateIndex = { generate: GenerateIndexModule.generate || GenerateIndexModule.generateIndex };
    
    const UpdateHomepageModule = await import('./scripts/update_homepage.js');
    const UpdateHomepage = { update: UpdateHomepageModule.update || UpdateHomepageModule.updateHomepage };
    
    const NavbarTemplate = await import('./scripts/navbar_template.js');
    const NormalizeSchema = await import('./scripts/normalize_schema.js');
    const AttachMedia = await import('./scripts/attach_media.js');
    const ImportCSV = await import('./scripts/import_csv.js');
    const ExportCSV = await import('./scripts/export_csv.js');
    
    // Import broker importers
    const Importers = await import('./scripts/importers/index.js');

    // Import pipeline
    const Pipeline = await import('./workflows/trade_pipeline.js');

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
      ImportCSV,
      ExportCSV,
      Importers,
      Pipeline,
      version: '2.0.0',
      ready: true
    };
    
    // Also expose DataAccess globally for easy access
    window.PersonalPenniesDataAccess = DataAccess;
    
    // Expose DB interface for legacy compatibility
    window.PersonalPenniesSystem.DB = {
      saveTrade: DataAccess.saveTrade,
      loadTradesIndex: DataAccess.loadTradesIndex,
      loadTradeMarkdown: DataAccess.loadTradeMarkdown,
      saveTradeMarkdown: DataAccess.saveTradeMarkdown
    };

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
    
    // ALWAYS sync repository data on page load to catch external changes
    // This ensures VFS reflects the latest repository state (trades, config, notes, books)
    console.log('[VFS] Syncing with repository to detect external changes...');
    await syncRepositoryDataToVFS();
    
    // Install VFS fetch adapter to intercept all fetch calls
    window.PersonalPenniesSystem.VFSAdapter.installGlobalVFSFetch();
    console.log('[VFS] Fetch adapter installed - fetch() now reads from IndexedDB first');
    
    // Emit VFS ready event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('vfs:ready', stats);
    }
    
    // Setup VFS file watcher to trigger pipeline (matches GitHub Actions on: push: paths:)
    setupVFSWatcher();
    
    // Check if pipeline needs to run on page load to regenerate analytics/charts
    await checkAndRunPipelineOnLoad();
    
  } catch (error) {
    console.error('[VFS] Failed to initialize Virtual Filesystem:', error);
  }
}

/**
 * Sync repository data directories to VFS
 * This fetches trade files, config, notes, and books from the repository
 * to ensure VFS has the latest data even if files were changed externally
 */
async function syncRepositoryDataToVFS() {
  try {
    const basePath = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
    
    // Critical data paths to sync
    const dataPaths = [
      'index.directory/trades-index.json',
      'index.directory/account-config.json',
      'index.directory/notes-index.json',
      'index.directory/books-index.json'
    ];
    
    // Sync critical data files
    for (const path of dataPaths) {
      try {
        const response = await window._originalFetch(`${basePath}/${path}`);
        if (response.ok) {
          const content = await response.text();
          await window.PersonalPenniesVFS.writeFile(path, content);
          console.log(`[VFS-Sync] Updated ${path}`);
        }
      } catch (err) {
        // File might not exist, that's ok
        console.log(`[VFS-Sync] Skipped ${path} (not found or error)`);
      }
    }
    
    // Sync trade files from repository
    await syncTradeFiles(basePath);
    
    // Sync notes files from repository
    await syncNotesFiles(basePath);
    
    // Sync books files from repository  
    await syncBooksFiles(basePath);
    
    console.log('[VFS-Sync] Repository sync complete');
    
  } catch (error) {
    console.error('[VFS-Sync] Error syncing repository data:', error);
  }
}

/**
 * Sync trade markdown files from repository
 */
async function syncTradeFiles(basePath) {
  try {
    // Fetch the trades index to know what files exist
    const response = await window._originalFetch(`${basePath}/index.directory/trades-index.json`);
    if (!response.ok) return;
    
    const tradesIndex = await response.json();
    const trades = tradesIndex.trades || [];
    
    // Sync each trade file
    for (const trade of trades) {
      if (trade.file_path) {
        try {
          const tradeResponse = await window._originalFetch(`${basePath}/${trade.file_path}`);
          if (tradeResponse.ok) {
            const content = await tradeResponse.text();
            await window.PersonalPenniesVFS.writeFile(trade.file_path, content);
          }
        } catch (err) {
          // Ignore individual file errors
        }
      }
    }
    
    console.log(`[VFS-Sync] Synced ${trades.length} trade files`);
  } catch (error) {
    console.error('[VFS-Sync] Error syncing trade files:', error);
  }
}

/**
 * Sync notes markdown files from repository
 */
async function syncNotesFiles(basePath) {
  try {
    const response = await window._originalFetch(`${basePath}/index.directory/notes-index.json`);
    if (!response.ok) return;
    
    const notesIndex = await response.json();
    const notes = notesIndex.notes || [];
    
    for (const note of notes) {
      if (note.path) {
        try {
          const noteResponse = await window._originalFetch(`${basePath}/${note.path}`);
          if (noteResponse.ok) {
            const content = await noteResponse.text();
            await window.PersonalPenniesVFS.writeFile(note.path, content);
          }
        } catch (err) {
          // Ignore individual file errors
        }
      }
    }
    
    console.log(`[VFS-Sync] Synced ${notes.length} note files`);
  } catch (error) {
    console.error('[VFS-Sync] Error syncing note files:', error);
  }
}

/**
 * Sync book markdown files from repository
 */
async function syncBooksFiles(basePath) {
  try {
    const response = await window._originalFetch(`${basePath}/index.directory/books-index.json`);
    if (!response.ok) return;
    
    const booksIndex = await response.json();
    const books = booksIndex.books || [];
    
    for (const book of books) {
      if (book.path) {
        try {
          const bookResponse = await window._originalFetch(`${basePath}/${book.path}`);
          if (bookResponse.ok) {
            const content = await bookResponse.text();
            await window.PersonalPenniesVFS.writeFile(book.path, content);
          }
        } catch (err) {
          // Ignore individual file errors
        }
      }
    }
    
    console.log(`[VFS-Sync] Synced ${books.length} book files`);
  } catch (error) {
    console.error('[VFS-Sync] Error syncing book files:', error);
  }
}

/**
 * Check if pipeline should run on page load to regenerate analytics/charts
 * This ensures users always have up-to-date analytics when they refresh the page
 * 
 * After syncing repository data, we ALWAYS run the pipeline to ensure
 * analytics, charts, and summaries reflect the current trade data
 */
async function checkAndRunPipelineOnLoad() {
  try {
    console.log('[Workflow] Checking if pipeline needs to run on page load...');
    
    // Check if we have trades in VFS
    const tradesIndexExists = await window.PersonalPenniesSystem.VFS.fileExists('index.directory/trades-index.json');
    
    if (!tradesIndexExists) {
      console.log('[Workflow] No trades index found, skipping pipeline on load');
      return;
    }
    
    // Load trades index to check if we have any trades
    const tradesIndexContent = await window.PersonalPenniesSystem.VFS.readFile('index.directory/trades-index.json');
    const tradesIndex = JSON.parse(tradesIndexContent);
    const hasTrades = tradesIndex.trades && tradesIndex.trades.length > 0;
    
    if (!hasTrades) {
      console.log('[Workflow] No trades found, skipping pipeline on load');
      return;
    }
    
    // After repository sync, ALWAYS run pipeline to regenerate analytics
    // This ensures analytics reflect the latest trade data from repository
    console.log('[Workflow] Repository data synced, triggering pipeline to regenerate analytics...');
    await triggerPipeline('page-load-after-repo-sync');
    
  } catch (error) {
    console.error('[Workflow] Error checking pipeline on load:', error);
  }
}

/**
 * Trigger the pipeline with a specific reason
 */
async function triggerPipeline(reason) {
  console.log(`[Workflow] Triggering pipeline (reason: ${reason})...`);
  
  try {
    const results = await window.PersonalPenniesSystem.Pipeline.runTradePipeline();
    console.log('[Workflow] Pipeline completed successfully on page load');
    
    // Emit pipeline completed event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('pipeline:completed', { ...results, reason });
    }
  } catch (error) {
    console.error('[Workflow] Pipeline failed on page load:', error);
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('pipeline:failed', { error: error.message, reason });
    }
  }
}

/**
 * Setup VFS file watcher to trigger pipeline on file writes
 * Matches GitHub Actions workflow trigger: on push to specific paths
 */
function setupVFSWatcher() {
  console.log('[Workflow] Setting up VFS file watcher...');
  
  // Trigger paths from .github/workflows/trade_pipeline.yml
  const triggerPaths = [
    'index.directory/SFTi.Tradez/',          // Trades
    'index.directory/account-config.json',    // Account config (deposits/withdrawals)
    'index.directory/Informational.Bookz/',   // Books
    'index.directory/SFTi.Notez/'            // Notes
  ];
  
  // Listen for VFS file write events
  if (window.SFTiEventBus) {
    window.SFTiEventBus.on('vfs:file-written', (event) => {
      const { path } = event;
      
      // Check if path matches trigger patterns
      const shouldTrigger = triggerPaths.some(triggerPath => path.startsWith(triggerPath));
      
      if (shouldTrigger) {
        console.log(`[Workflow] File write detected in trigger path: ${path}`);
        console.log('[Workflow] Auto-triggering trade pipeline...');
        
        // Trigger pipeline asynchronously (don't wait for it)
        window.PersonalPenniesSystem.Pipeline.runTradePipeline()
          .then(results => {
            console.log('[Workflow] Pipeline completed successfully');
            // Emit pipeline completed event
            if (window.SFTiEventBus) {
              window.SFTiEventBus.emit('pipeline:completed', results);
            }
          })
          .catch(error => {
            console.error('[Workflow] Pipeline failed:', error);
            if (window.SFTiEventBus) {
              window.SFTiEventBus.emit('pipeline:failed', { error: error.message });
            }
          });
      }
    });
    
    console.log('[Workflow] VFS file watcher active - listening for vfs:file-written events');
  } else {
    console.error('[Workflow] EventBus not available, cannot set up VFS watcher');
  }
}
