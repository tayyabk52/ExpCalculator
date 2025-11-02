// Service Worker for CalcHub PWA
const CACHE_NAME = 'calchub-v1';
const STATIC_CACHE = 'calchub-static-v1';
const DYNAMIC_CACHE = 'calchub-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/groups',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cache successful responses
        const responseToCache = response.clone();
        
        // Only cache same-origin or CORS-enabled requests
        if (url.origin === location.origin || response.type === 'cors') {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        // Return offline page if available
        return caches.match('/');
      });
    })
  );
});

// Background sync for offline expenses
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    console.log('[Service Worker] Background sync triggered');
    event.waitUntil(
      // The actual sync is handled by the sync-manager.ts
      // This just triggers the event for browsers that support it
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_EXPENSES' });
        });
      })
    );
  }
});

// Push notifications (optional - for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New update available',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CalcHub', options)
  );
});
