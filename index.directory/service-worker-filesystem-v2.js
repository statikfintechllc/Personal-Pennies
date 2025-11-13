/**
 * Service Worker - Virtual Filesystem with Event Bus Integration V2
 * 
 * This Service Worker creates a virtual filesystem by intercepting file requests
 * and serving content from IndexedDB, enabling true browser-only operation.
 * 
 * Event Bus Integration:
 * 1. Main thread emits events when data changes (trade:added, summary:generated, etc.)
 * 2. registerServiceWorker.js listens to events and posts messages to SW
 * 3. SW invalidates cache entries so next fetch gets fresh data from IndexedDB
 * 
 * Data Flow:
 * - User adds trade → Save to IndexedDB → Event emitted → SW cache invalidated
 * - Page requests data → SW checks cache → Serves from cache or fetches from IndexedDB
 * - Fresh data always served after updates
 */

const CACHE_NAME = 'personal-pennies-vfs-v2';
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Import localforage in Service Worker context
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

// Initialize IndexedDB stores
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

const analyticsStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'analytics'
});

const booksStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'books'
});

const notesStore = localforage.createInstance({
  name: 'PersonalPennies',
  storeName: 'notes'
});

// In-memory cache for faster serving
let dataCache = {
  summaries: new Map(),
  trades: new Map(),
  charts: new Map(),
  analytics: new Map(),
  books: new Map(),
  notes: new Map(),
  timestamps: new Map()
};

/**
 * Install event
 */
self.addEventListener('install', (event) => {
  console.log('[SW V2] Installing with Event Bus integration...');
  self.skipWaiting();
});

/**
 * Activate event
 */
self.addEventListener('activate', (event) => {
  console.log('[SW V2] Activating...');
  event.waitUntil(clients.claim());
});

/**
 * Message event - Handle cache invalidation from event bus
 */
self.addEventListener('message', (event) => {
  const { type, store, key, data } = event.data || {};
  
  switch (type) {
    case 'INVALIDATE_CACHE':
      if (store && key) {
        console.log(`[SW V2] Invalidating cache: ${store}/${key}`);
        dataCache[store]?.delete(key);
        dataCache.timestamps?.delete(`${store}:${key}`);
      } else if (store) {
        console.log(`[SW V2] Invalidating store cache: ${store}`);
        dataCache[store]?.clear();
      }
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'INVALIDATE_ALL':
      console.log('[SW V2] Clearing all caches');
      Object.keys(dataCache).forEach(key => {
        if (dataCache[key] instanceof Map) {
          dataCache[key].clear();
        }
      });
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'PING':
      event.ports[0]?.postMessage({ type: 'PONG', status: 'active', version: 'v2' });
      break;
  }
});

/**
 * Fetch event - Serve files from IndexedDB virtual filesystem
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;
  
  if (event.request.method !== 'GET') return;
  
  // Intercept virtual filesystem paths
  if (pathname.includes('/summaries/') && pathname.endsWith('.md')) {
    event.respondWith(handleSummaryRequest(pathname));
  } else if (pathname.includes('/trades/trade-') && pathname.endsWith('.html')) {
    event.respondWith(handleTradePageRequest(pathname));
  } else if (pathname.includes('/assets/charts/') && pathname.endsWith('.json')) {
    event.respondWith(handleChartRequest(pathname));
  }
});

/**
 * Handle summary file requests
 */
async function handleSummaryRequest(pathname) {
  try {
    const filename = pathname.split('/').pop().replace('.md', '');
    
    // Check cache
    const cached = getCachedData('summaries', filename);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'X-Source': 'SW-Cache',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // Load from IndexedDB
    const content = await summariesStore.getItem(filename);
    
    if (content) {
      setCachedData('summaries', filename, content);
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'X-Source': 'IndexedDB'
        }
      });
    }
    
    // Fallback to network
    return fetch(new Request(`./summaries/${filename}.md`));
  } catch (error) {
    console.error('[SW V2] Summary request error:', error);
    return new Response('Error loading summary', { status: 500 });
  }
}

/**
 * Handle trade page requests
 */
async function handleTradePageRequest(pathname) {
  try {
    const filename = pathname.split('/').pop().replace('.html', '');
    const key = `page-${filename}`;
    
    const cached = getCachedData('trades', key);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-Source': 'SW-Cache'
        }
      });
    }
    
    const content = await tradesStore.getItem(key);
    
    if (content) {
      setCachedData('trades', key, content);
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-Source': 'IndexedDB'
        }
      });
    }
    
    return fetch(new Request(`./trades/${filename}.html`));
  } catch (error) {
    console.error('[SW V2] Trade page request error:', error);
    return new Response('Error loading trade page', { status: 500 });
  }
}

/**
 * Handle chart data requests
 */
async function handleChartRequest(pathname) {
  try {
    const filename = pathname.split('/').pop().replace('.json', '');
    const key = 'all-charts';
    
    const data = await chartsStore.getItem(key);
    
    if (data) {
      let responseData = data;
      
      // Extract specific chart data if needed
      if (filename.includes('-data')) {
        const chartKey = filename.replace('-data', '').replace(/-/g, '_');
        responseData = data[chartKey];
      } else if (filename.includes('portfolio-value-')) {
        const timeframe = filename.replace('portfolio-value-', '');
        responseData = data.portfolio_value_charts?.[timeframe];
      } else if (filename.includes('total-return-')) {
        const timeframe = filename.replace('total-return-', '');
        responseData = data.total_return_charts?.[timeframe];
      } else if (filename === 'analytics-data') {
        // Load analytics from analytics store
        responseData = await analyticsStore.getItem('all-analytics');
      }
      
      if (responseData) {
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'IndexedDB'
          }
        });
      }
    }
    
    return fetch(new Request(`./assets/charts/${filename}.json`));
  } catch (error) {
    console.error('[SW V2] Chart request error:', error);
    return new Response('Error loading chart data', { status: 500 });
  }
}

/**
 * Cache helpers
 */
function getCachedData(store, key) {
  const cacheKey = `${store}:${key}`;
  const timestamp = dataCache.timestamps.get(cacheKey);
  
  if (timestamp && (Date.now() - timestamp < CACHE_TIMEOUT)) {
    return dataCache[store]?.get(key);
  }
  
  return null;
}

function setCachedData(store, key, data) {
  const cacheKey = `${store}:${key}`;
  
  if (!dataCache[store]) {
    dataCache[store] = new Map();
  }
  
  dataCache[store].set(key, data);
  dataCache.timestamps.set(cacheKey, Date.now());
}

console.log('[SW V2] Service Worker loaded with Event Bus integration');
