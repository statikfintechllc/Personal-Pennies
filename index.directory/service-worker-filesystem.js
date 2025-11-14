/**
 * Service Worker for Virtual Filesystem
 * Intercepts fetch requests for generated files and serves from VFS IndexedDB
 * This allows browser-only operation while maintaining compatibility with
 * existing HTML pages that fetch files directly
 * 
 * Version 2.0: Updated to use unified VFS instead of bucket-based storage
 */

const CACHE_NAME = 'personal-pennies-vfs-v2';
const VFS_DB_NAME = 'PersonalPenniesVFS';
const VFS_STORE_NAME = 'filesystem';

// Import localforage in Service Worker context
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

// Initialize VFS connection
const vfsStore = localforage.createInstance({
  name: VFS_DB_NAME,
  storeName: VFS_STORE_NAME
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
 * Fetch event - intercept requests and serve from VFS
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Check if this is a request for a file that might be in VFS
  // We handle most common file types used by the app
  const isVFSCandidate = 
    pathname.endsWith('.md') ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.pdf');
  
  if (isVFSCandidate) {
    event.respondWith(handleVFSRequest(pathname, event.request));
  } else {
    // Normal request - pass through
    event.respondWith(fetch(event.request));
  }
});

/**
 * Normalize path (remove leading slash, handle relative paths)
 */
function normalizePath(pathname) {
  // Remove leading slash
  let path = pathname.replace(/^\/+/, '');
  
  // Remove trailing slash
  path = path.replace(/\/+$/, '');
  
  // Handle multiple consecutive slashes
  path = path.replace(/\/+/g, '/');
  
  return path;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const mimeTypes = {
    'md': 'text/markdown',
    'txt': 'text/plain',
    'json': 'application/json',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Handle VFS request - unified handler for all file types
 */
async function handleVFSRequest(pathname, request) {
  try {
    // Normalize path
    const path = normalizePath(pathname);
    
    console.log(`[ServiceWorker] Attempting to serve from VFS: ${path}`);
    
    // Fetch from VFS
    const fileData = await vfsStore.getItem(path);
    
    if (fileData && fileData.content) {
      console.log(`[ServiceWorker] ✓ Serving from VFS: ${path} (${fileData.type}, ${fileData.size} bytes)`);
      
      // Determine content type
      const contentType = fileData.mimeType || getMimeType(path);
      
      // Return content with appropriate headers
      return new Response(fileData.content, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileData.size || 0),
          'Last-Modified': fileData.lastModified || new Date().toUTCString(),
          'X-Source': 'VFS',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // File not found in VFS, fall back to network
    console.log(`[ServiceWorker] File not in VFS, fetching from network: ${path}`);
    return await fetch(request);
    
  } catch (error) {
    console.error('[ServiceWorker] Error handling VFS request:', error);
    
    // Try network as fallback
    try {
      return await fetch(request);
    } catch (fetchError) {
      return new Response('File not found', {
        status: 404,
        statusText: 'Not Found'
      });
    }
  }
}
