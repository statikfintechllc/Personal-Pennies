/**
 * Trade Pipeline Orchestrator
 * Event-driven pipeline that runs when trades or account config are modified
 * 
 * This replaces the GitHub Actions workflow (.github/workflows/trade_pipeline.yml)
 * with a client-side event-driven system that runs in the browser.
 * 
 * Triggers:
 * - Trade events: trade:added, trade:updated, trade:deleted
 * - Account events: account:deposit-added, account:withdrawal-added, account:balance-updated
 * 
 * Pipeline Steps:
 * 1. Parse trades → generate trades-index.json
 * 2. Generate analytics → analytics-data.json (uses account config for returns calculations)
 * 3. Generate charts → chart data
 * 4. Generate summaries → summary data
 * 5. Generate trade pages → individual trade HTML pages
 * 6. Update indexes (books, notes)
 * 7. Emit completion event
 */

// Get functions from global scope (loaded by loader.js)
function getDependencies() {
  return {
    parseTrades: window.PersonalPenniesParseTrades?.parseTrades,
    generateAnalytics: window.PersonalPenniesAnalytics?.generateAnalytics,
    generateCharts: window.PersonalPenniesGenerateCharts?.generateCharts,
    generateSummaries: window.PersonalPenniesGenerateSummaries?.generateSummaries,
    generateTradePages: window.PersonalPenniesGenerateTradePages?.generateTradePages,
    generateBooksIndex: window.PersonalPenniesGenerateBooksIndex?.generateBooksIndex,
    generateNotesIndex: window.PersonalPenniesGenerateNotesIndex?.generateNotesIndex,
    generateIndex: window.PersonalPenniesGenerateIndex?.generateIndex
  };
}

/**
 * Pipeline status
 */
const pipelineState = {
  running: false,
  currentStep: null,
  error: null,
  lastRun: null
};

/**
 * Run the complete trade pipeline
 * @param {Object} options - Pipeline options
 * @returns {Promise<Object>} Pipeline result
 */
export async function runTradePipeline(options = {}) {
  if (pipelineState.running) {
    console.warn('[Pipeline] Pipeline already running, skipping...');
    return { status: 'skipped', reason: 'already_running' };
  }

  console.log('[Pipeline] Starting trade pipeline...');
  pipelineState.running = true;
  pipelineState.error = null;
  pipelineState.currentStep = 'initializing';

  const results = {
    started_at: new Date().toISOString(),
    steps: {},
    status: 'success',
    error: null
  };
  
  const { parseTrades, generateAnalytics } = getDependencies();
  
  if (!parseTrades || !generateAnalytics) {
    const error = new Error('Pipeline dependencies not loaded');
    console.error('[Pipeline]', error);
    results.status = 'error';
    results.error = error.message;
    pipelineState.running = false;
    return results;
  }

  try {
    // Step 1: Parse trades
    console.log('[Pipeline] Step 1: Parsing trades...');
    pipelineState.currentStep = 'parse_trades';
    const tradesIndex = await parseTrades();
    results.steps.parse_trades = {
      status: 'success',
      trades_count: tradesIndex.trades.length,
      completed_at: new Date().toISOString()
    };
    console.log(`[Pipeline] ✓ Parsed ${tradesIndex.trades.length} trades`);

    // Step 2: Generate analytics
    console.log('[Pipeline] Step 2: Generating analytics...');
    pipelineState.currentStep = 'generate_analytics';
    const analytics = await generateAnalytics();
    results.steps.generate_analytics = {
      status: 'success',
      expectancy: analytics.expectancy,
      profit_factor: analytics.profit_factor,
      completed_at: new Date().toISOString()
    };
    console.log(`[Pipeline] ✓ Generated analytics (Expectancy: $${analytics.expectancy})`);
    
    // Emit analytics updated event so UI refreshes
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('analytics:updated', analytics);
      console.log('[Pipeline] ✓ Emitted analytics:updated event');
    }

    // Step 3: Generate charts
    console.log('[Pipeline] Step 3: Generating charts...');
    pipelineState.currentStep = 'generate_charts';
    const { generateCharts } = getDependencies();
    if (generateCharts) {
      const chartsResult = await generateCharts();
      results.steps.generate_charts = {
        status: chartsResult.status || 'success',
        completed_at: new Date().toISOString()
      };
      console.log(`[Pipeline] ✓ Charts generation: ${chartsResult.status}`);
    } else {
      results.steps.generate_charts = {
        status: 'skipped',
        note: 'generateCharts not loaded',
        completed_at: new Date().toISOString()
      };
    }

    // Step 4: Generate summaries
    console.log('[Pipeline] Step 4: Generating summaries...');
    pipelineState.currentStep = 'generate_summaries';
    const { generateSummaries } = getDependencies();
    if (generateSummaries) {
      const summariesResult = await generateSummaries();
      results.steps.generate_summaries = {
        status: summariesResult.status || 'success',
        completed_at: new Date().toISOString()
      };
      console.log(`[Pipeline] ✓ Summaries generation: ${summariesResult.status}`);
    } else {
      results.steps.generate_summaries = {
        status: 'skipped',
        note: 'generateSummaries not loaded',
        completed_at: new Date().toISOString()
      };
    }

    // Step 5: Generate trade pages
    console.log('[Pipeline] Step 5: Generating trade pages...');
    pipelineState.currentStep = 'generate_trade_pages';
    const { generateTradePages } = getDependencies();
    if (generateTradePages) {
      const tradePagesResult = await generateTradePages();
      results.steps.generate_trade_pages = {
        status: tradePagesResult.status || 'success',
        completed_at: new Date().toISOString()
      };
      console.log(`[Pipeline] ✓ Trade pages generation: ${tradePagesResult.status}`);
    } else {
      results.steps.generate_trade_pages = {
        status: 'skipped',
        note: 'generateTradePages not loaded',
        completed_at: new Date().toISOString()
      };
    }

    // Step 6: Generate indexes
    console.log('[Pipeline] Step 6: Generating indexes...');
    pipelineState.currentStep = 'generate_indexes';
    const { generateBooksIndex, generateNotesIndex, generateIndex } = getDependencies();
    if (generateBooksIndex && generateNotesIndex && generateIndex) {
      await Promise.all([
        generateBooksIndex(),
        generateNotesIndex(),
        generateIndex()
      ]);
      results.steps.generate_indexes = {
        status: 'success',
        completed_at: new Date().toISOString()
      };
      console.log('[Pipeline] ✓ Indexes generated');
    } else {
      results.steps.generate_indexes = {
        status: 'skipped',
        note: 'Index generators not loaded',
        completed_at: new Date().toISOString()
      };
    }

    // Complete
    results.completed_at = new Date().toISOString();
    results.duration_ms = new Date(results.completed_at) - new Date(results.started_at);
    pipelineState.lastRun = results;
    
    console.log(`[Pipeline] ✓ Pipeline completed successfully in ${results.duration_ms}ms`);

    // Emit completion event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('pipeline:completed', results);
    }

    return results;

  } catch (error) {
    console.error('[Pipeline] ✗ Pipeline failed:', error);
    results.status = 'error';
    results.error = error.message;
    results.failed_step = pipelineState.currentStep;
    results.completed_at = new Date().toISOString();
    
    pipelineState.error = error;

    // Emit error event
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('pipeline:error', { error, results });
    }

    throw error;

  } finally {
    pipelineState.running = false;
    pipelineState.currentStep = null;
  }
}

/**
 * Get pipeline status
 * @returns {Object} Current pipeline status
 */
export function getPipelineStatus() {
  return {
    ...pipelineState,
    lastRun: pipelineState.lastRun
  };
}

/**
 * Initialize pipeline event listeners
 * Sets up event handlers to automatically run pipeline when trades are modified
 */
export function initializePipeline() {
  console.log('[Pipeline] Initializing pipeline event listeners...');

  if (!window.SFTiEventBus) {
    console.error('[Pipeline] EventBus not found! Cannot initialize pipeline.');
    return;
  }

  // Listen for trade events
  window.SFTiEventBus.on('trade:added', async (data) => {
    console.log('[Pipeline] Trade added event received, triggering pipeline...');
    try {
      await runTradePipeline({ trigger: 'trade:added', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after trade:added:', error);
    }
  });

  window.SFTiEventBus.on('trade:updated', async (data) => {
    console.log('[Pipeline] Trade updated event received, triggering pipeline...');
    try {
      await runTradePipeline({ trigger: 'trade:updated', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after trade:updated:', error);
    }
  });

  window.SFTiEventBus.on('trade:deleted', async (data) => {
    console.log('[Pipeline] Trade deleted event received, triggering pipeline...');
    try {
      await runTradePipeline({ trigger: 'trade:deleted', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after trade:deleted:', error);
    }
  });

  // Listen for account config events (mirrors old Python workflow watching account-config.json)
  window.SFTiEventBus.on('account:deposit-added', async (data) => {
    console.log('[Pipeline] Deposit added event received, triggering pipeline to recalculate analytics...');
    try {
      await runTradePipeline({ trigger: 'account:deposit-added', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after deposit:added:', error);
    }
  });

  window.SFTiEventBus.on('account:withdrawal-added', async (data) => {
    console.log('[Pipeline] Withdrawal added event received, triggering pipeline to recalculate analytics...');
    try {
      await runTradePipeline({ trigger: 'account:withdrawal-added', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after withdrawal:added:', error);
    }
  });

  window.SFTiEventBus.on('account:balance-updated', async (data) => {
    console.log('[Pipeline] Starting balance updated event received, triggering pipeline to recalculate analytics...');
    try {
      await runTradePipeline({ trigger: 'account:balance-updated', data });
    } catch (error) {
      console.error('[Pipeline] Failed to run pipeline after balance:updated:', error);
    }
  });

  // Listen for manual pipeline trigger
  window.SFTiEventBus.on('pipeline:run', async (options) => {
    console.log('[Pipeline] Manual pipeline run requested...');
    try {
      await runTradePipeline(options);
    } catch (error) {
      console.error('[Pipeline] Manual pipeline run failed:', error);
    }
  });

  console.log('[Pipeline] ✓ Pipeline event listeners initialized (trade and account events)');
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  // Export for global access
  window.PersonalPenniesPipeline = {
    runTradePipeline,
    getPipelineStatus,
    initializePipeline
  };

  // Initialize when EventBus is ready
  if (window.SFTiEventBus) {
    initializePipeline();
  } else {
    // Wait for EventBus to load
    const checkInterval = setInterval(() => {
      if (window.SFTiEventBus) {
        clearInterval(checkInterval);
        initializePipeline();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.SFTiEventBus) {
        console.error('[Pipeline] Timeout waiting for EventBus');
      }
    }, 5000);
  }
}

console.log('[Pipeline] Trade pipeline module loaded');
