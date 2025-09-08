const CACHE_NAME = 'civicresolve-v1.0.0';
const STATIC_CACHE_NAME = 'civicresolve-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'civicresolve-dynamic-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  // Add your critical CSS/JS files here when they're built
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/map',
  '/report',
  '/issues',
  '/profile',
  '/login',
  '/register'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('civicresolve-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.includes('/api/')) {
    // API requests - try network first, fallback to cache for critical data
    event.respondWith(handleApiRequest(request));
  } else if (url.includes('/_next/static/')) {
    // Static Next.js assets - cache first
    event.respondWith(handleStaticAssets(request));
  } else {
    // Pages and other assets - network first with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // If successful, cache the response for offline use
    if (response.ok && (request.url.includes('/api/issues') || request.url.includes('/api/auth/me'))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical API calls
    if (request.url.includes('/api/auth/me')) {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For other API calls, let the app handle the error
    throw error;
  }
}

// Handle static Next.js assets
async function handleStaticAssets(request) {
  // Try cache first for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Static asset request failed:', request.url);
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful page responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Page request failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Check if this is a route that should work offline
    const url = new URL(request.url);
    const isOfflineRoute = OFFLINE_ROUTES.some(route => 
      url.pathname === route || url.pathname.startsWith(route + '/')
    );
    
    if (isOfflineRoute) {
      // Try to serve the main page from cache as fallback
      const mainPageCache = await caches.match('/');
      if (mainPageCache) {
        return mainPageCache;
      }
    }
    
    // Serve offline page if available
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Last resort - return a basic offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - CivicResolve</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: #f8fafc;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #2563eb; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>CivicResolve is not available right now. Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync for offline issue reports (when supported)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-issue-report') {
    event.waitUntil(syncOfflineReports());
  }
});

async function syncOfflineReports() {
  try {
    // Get offline reports from IndexedDB (you'd implement this)
    // const offlineReports = await getOfflineReports();
    // 
    // for (const report of offlineReports) {
    //   try {
    //     const response = await fetch('/api/issues', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify(report)
    //     });
    //     
    //     if (response.ok) {
    //       await removeOfflineReport(report.id);
    //     }
    //   } catch (error) {
    //     console.error('[SW] Failed to sync report:', error);
    //   }
    // }
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications (when user grants permission)
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have updates on your reported issues',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'view',
        title: 'View Issues',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icons/action-close.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('CivicResolve', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker script loaded');
