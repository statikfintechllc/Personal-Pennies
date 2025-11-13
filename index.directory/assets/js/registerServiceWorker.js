/**
 * Register Service Worker for Virtual Filesystem
 * Allows browser-only file generation while maintaining compatibility
 * with existing pages that fetch files directly from paths
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker-filesystem.js', {
        scope: '/'
      });
      
      console.log('[ServiceWorker] Registered virtual filesystem:', registration.scope);
      
      // Wait for the service worker to become active
      if (registration.active) {
        console.log('[ServiceWorker] Virtual filesystem is active');
      } else {
        await new Promise((resolve) => {
          const checkState = () => {
            if (registration.active) {
              console.log('[ServiceWorker] Virtual filesystem activated');
              resolve();
            } else {
              setTimeout(checkState, 100);
            }
          };
          checkState();
        });
      }
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[ServiceWorker] Update found, new worker installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[ServiceWorker] New version activated');
            // Optionally reload the page
            if (confirm('A new version is available. Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });
      
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
    }
  });
} else {
  console.warn('[ServiceWorker] Service Workers are not supported in this browser');
  console.warn('[ServiceWorker] Virtual filesystem will not work - files must exist on disk');
}
