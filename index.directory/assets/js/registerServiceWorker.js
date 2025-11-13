/**
 * Register Service Worker with Event Bus Integration
 * 
 * Registers the Service Worker and sets up event bus listeners
 * to invalidate SW cache when data changes in IndexedDB.
 * 
 * Flow:
 * 1. Event emitted: trade:added, summary:generated, etc.
 * 2. This script catches event and posts message to SW
 * 3. SW invalidates cache for that store/key
 * 4. Next fetch gets fresh data from IndexedDB
 */

if ('serviceWorker' in navigator) {
  let swRegistration = null;
  
  window.addEventListener('load', async () => {
    try {
      // Register the new V2 service worker
      swRegistration = await navigator.serviceWorker.register('/service-worker-filesystem-v2.js', {
        scope: '/'
      });
      
      console.log('[SW] Registered virtual filesystem V2:', swRegistration.scope);
      
      // Wait for activation
      if (swRegistration.active) {
        console.log('[SW] Virtual filesystem is active');
        setupEventBusIntegration();
      } else {
        await waitForActivation(swRegistration);
        setupEventBusIntegration();
      }
      
      // Listen for updates
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        console.log('[SW] Update found...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[SW] New version activated');
            if (confirm('New version available. Reload?')) {
              window.location.reload();
            }
          }
        });
      });
      
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
  
  /**
   * Wait for Service Worker to become active
   */
  function waitForActivation(registration) {
    return new Promise((resolve) => {
      const checkState = () => {
        if (registration.active) {
          console.log('[SW] Activated');
          resolve();
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });
  }
  
  /**
   * Setup Event Bus listeners to invalidate SW cache
   */
  function setupEventBusIntegration() {
    if (!window.SFTiEventBus) {
      console.warn('[SW] Event bus not found, retrying in 1s...');
      setTimeout(setupEventBusIntegration, 1000);
      return;
    }
    
    console.log('[SW] Setting up Event Bus integration...');
    
    // Listen for data change events and invalidate SW cache
    const events = [
      'trade:added',
      'trade:updated',
      'trade:deleted',
      'summary:generated',
      'analytics:generated',
      'charts:generated',
      'books:indexed',
      'notes:indexed',
      'data:imported'
    ];
    
    events.forEach(eventName => {
      window.SFTiEventBus.on(eventName, (data) => {
        console.log(`[SW] Event received: ${eventName}`, data);
        invalidateSWCache(eventName, data);
      });
    });
    
    console.log('[SW] Event Bus integration complete - listening to', events.length, 'events');
  }
  
  /**
   * Invalidate Service Worker cache based on event
   */
  async function invalidateSWCache(eventName, data) {
    if (!swRegistration || !swRegistration.active) {
      console.warn('[SW] No active service worker to invalidate');
      return;
    }
    
    let store = null;
    let key = null;
    
    // Map event to store/key
    if (eventName.startsWith('trade:')) {
      store = 'trades';
      key = data?.key || data?.tradeKey;
    } else if (eventName === 'summary:generated') {
      store = 'summaries';
      key = data?.summaryKey;
    } else if (eventName === 'analytics:generated') {
      store = 'analytics';
    } else if (eventName === 'charts:generated') {
      store = 'charts';
    } else if (eventName === 'books:indexed') {
      store = 'books';
    } else if (eventName === 'notes:indexed') {
      store = 'notes';
    } else if (eventName === 'data:imported') {
      // Invalidate everything on bulk import
      store = null;
      key = null;
    }
    
    try {
      // Post message to Service Worker
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log(`[SW] Cache invalidated: ${store || 'all'}${key ? '/' + key : ''}`);
        }
      };
      
      swRegistration.active.postMessage({
        type: store && key ? 'INVALIDATE_CACHE' : (store ? 'INVALIDATE_CACHE' : 'INVALIDATE_ALL'),
        store,
        key
      }, [messageChannel.port2]);
      
    } catch (error) {
      console.error('[SW] Failed to invalidate cache:', error);
    }
  }
  
  // Expose invalidate function globally for manual cache clearing
  window.invalidateSWCache = invalidateSWCache;
  
} else {
  console.warn('[SW] Service Workers not supported');
  console.warn('[SW] Offline functionality will be limited');
}
