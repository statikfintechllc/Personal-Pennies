/**
 * Service Worker for Virtual Filesystem
 * Intercepts fetch requests for generated files and serves from IndexedDB
 * This allows browser-only operation while maintaining compatibility with
 * existing HTML pages that fetch files directly (review.html, all-weeks.html)
 */

const CACHE_NAME = 'personal-pennies-v1';
const VIRTUAL_FS_PREFIX = '/summaries/';
const VIRTUAL_TRADES_PREFIX = '/trades/';
const VIRTUAL_CHARTS_PREFIX = '/assets/charts/';

// Import localforage in Service Worker context
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

// Initialize IndexedDB connection
const summariesStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'summaries'
});

const tradesStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'trades'
});

const chartsStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'charts'
});

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing virtual filesystem...');
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating virtual filesystem...');
  event.waitUntil(clients.claim());
});

/**
 * Fetch event - intercept requests and serve from IndexedDB
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Check if this is a request for a generated file
  if (pathname.includes(VIRTUAL_FS_PREFIX)) {
    // Summary file request
    event.respondWith(handleSummaryRequest(pathname));
  } else if (pathname.includes(VIRTUAL_TRADES_PREFIX)) {
    // Trade page request
    event.respondWith(handleTradePageRequest(pathname));
  } else if (pathname.includes(VIRTUAL_CHARTS_PREFIX) && pathname.endsWith('.json')) {
    // Chart data request
    event.respondWith(handleChartRequest(pathname));
  } else {
    // Normal request - pass through
    event.respondWith(fetch(event.request));
  }
});

/**
 * Handle summary file requests (*.md files)
 */
async function handleSummaryRequest(pathname) {
  try {
    // Extract filename from path (e.g., /summaries/weekly-2025-W45.md -> weekly-2025-W45)
    const filename = pathname.split('/').pop().replace('.md', '');
    
    console.log(`[ServiceWorker] Loading summary: ${filename}`);
    
    // Fetch from IndexedDB
    const summaryData = await summariesStore.getItem(filename);
    
    if (summaryData && summaryData.markdown) {
      // Return markdown content
      return new Response(summaryData.markdown, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'X-Source': 'IndexedDB'
        }
      });
    }
    
    // File not found in IndexedDB
    return new Response('Summary not found', {
      status: 404,
      statusText: 'Not Found'
    });
    
  } catch (error) {
    console.error('[ServiceWorker] Error loading summary:', error);
    return new Response(`Error: ${error.message}`, {
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}

/**
 * Handle trade page requests (*.html files)
 */
async function handleTradePageRequest(pathname) {
  try {
    // Extract filename from path
    const filename = pathname.split('/').pop().replace('.html', '');
    
    console.log(`[ServiceWorker] Loading trade page: ${filename}`);
    
    // Fetch from IndexedDB - trade pages are stored with full HTML
    const pageData = await tradesStore.getItem(`page-${filename}`);
    
    if (pageData && pageData.html) {
      return new Response(pageData.html, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Source': 'IndexedDB'
        }
      });
    }
    
    // File not found
    return new Response('Trade page not found', {
      status: 404,
      statusText: 'Not Found'
    });
    
  } catch (error) {
    console.error('[ServiceWorker] Error loading trade page:', error);
    return new Response(`Error: ${error.message}`, {
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}

/**
 * Handle chart data requests (*.json files)
 */
async function handleChartRequest(pathname) {
  try {
    // Extract chart name from path (e.g., /assets/charts/equity-curve-data.json)
    const filename = pathname.split('/').pop().replace('.json', '');
    
    console.log(`[ServiceWorker] Loading chart: ${filename}`);
    
    // Try to get from charts store
    const chartData = await chartsStore.getItem('all-charts');
    
    if (chartData) {
      // Map filename to chart data property
      let data = null;
      
      if (filename === 'equity-curve-data') {
        data = chartData.equity_curve;
      } else if (filename === 'win-loss-by-strategy-data') {
        data = chartData.win_loss_by_strategy;
      } else if (filename === 'performance-by-day-data') {
        data = chartData.performance_by_day;
      } else if (filename === 'ticker-performance-data') {
        data = chartData.ticker_performance;
      } else if (filename === 'time-of-day-performance-data') {
        data = chartData.time_of_day_performance;
      } else if (filename.startsWith('portfolio-value-')) {
        const timeframe = filename.replace('portfolio-value-', '');
        if (chartData.portfolio_value_charts && chartData.portfolio_value_charts[timeframe]) {
          data = chartData.portfolio_value_charts[timeframe];
        }
      } else if (filename.startsWith('total-return-')) {
        const timeframe = filename.replace('total-return-', '');
        if (chartData.total_return_charts && chartData.total_return_charts[timeframe]) {
          data = chartData.total_return_charts[timeframe];
        }
      } else if (filename === 'analytics-data') {
        // Get analytics data
        const analyticsStore = localforage.createInstance({
          name: 'PersonalPennies',
          storeName: 'analytics'
        });
        data = await analyticsStore.getItem('current-analytics');
      }
      
      if (data) {
        return new Response(JSON.stringify(data, null, 2), {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'IndexedDB'
          }
        });
      }
    }
    
    // File not found
    return new Response('Chart data not found', {
      status: 404,
      statusText: 'Not Found'
    });
    
  } catch (error) {
    console.error('[ServiceWorker] Error loading chart:', error);
    return new Response(`Error: ${error.message}`, {
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}
