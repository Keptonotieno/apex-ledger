// Apex Ledger Progressive Web App Service Worker - Low-Connectivity Enterprise Caching Engine
const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `apex-ledger-static-${CACHE_VERSION}`;
const API_CACHE = `apex-ledger-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `apex-ledger-images-${CACHE_VERSION}`;

const OFFLINE_URL = '/index.html';

// Critical app shell resources pre-cached upon installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/apple-touch-icon.png',
  '/apple-splash.jpg',
  '/favicon.png'
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('[Apex ServiceWorker] Installing Enterprise SW with Multi-Tier Caching...', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[Apex ServiceWorker] Pre-caching App Shell & Core Assets');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[Apex ServiceWorker] Pre-cache non-fatal warning:', err);
        });
      }),
      caches.open(API_CACHE)
    ]).then(() => self.skipWaiting())
  );
});

// Service Worker Activation & Stale Cache Purge
self.addEventListener('activate', (event) => {
  console.log('[Apex ServiceWorker] Activating Enterprise SW and purging legacy caches...');
  const activeCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!activeCaches.includes(cacheName)) {
            console.log('[Apex ServiceWorker] Purging legacy cache bucket:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intelligent Fetch Request Interceptor
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-HTTP(S) and non-GET requests (POST/PUT/DELETE pass through or are queued locally)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Strategy 1: Navigation Requests / SPA HTML Shell (Network-First with Cache Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => {
          console.warn('[Apex ServiceWorker] Network unavailable for navigation. Returning cached index.html SPA shell.');
          return caches.match(OFFLINE_URL).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Strategy 2: Enterprise API Endpoints (/api/*) (Network-First with Freshness Dynamic Cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore') || url.hostname.includes('googleapis')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse.status === 200 || networkResponse.status === 304) {
            const cacheCopy = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log(`[Apex ServiceWorker] Low connectivity detected for API ${url.pathname}. Serving from offline API cache.`);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            // Append header indicating offline cached response
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Apex-Offline-Cache', 'true');
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers
            });
          }

          // Return graceful offline fallback JSON payload if API has no prior cache
          return new Response(
            JSON.stringify({
              offline: true,
              timestamp: new Date().toISOString(),
              message: 'Apex Ledger is operating in Low-Connectivity / Offline Mode. Cached ledger state is active.'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'X-Apex-Offline-Cache': 'fallback' }
            }
          );
        })
    );
    return;
  }

  // Strategy 3: Images & Media Assets (Cache-First with Background Refresh)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const cacheCopy = networkResponse.clone();
              caches.open(IMAGE_CACHE).then((cache) => cache.put(request, cacheCopy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy 4: Static JS, CSS, Font Assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Listener for client messages (Force Update, Pre-warm Cache, Clear Cache)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[Apex ServiceWorker] Skip waiting requested by client.');
    self.skipWaiting();
  }

  if (event.data.type === 'PREWARM_API_CACHE') {
    const urlsToPrewarm = event.data.urls || ['/api/auth/me', '/api/health'];
    console.log('[Apex ServiceWorker] Pre-warming API Cache for offline resilience:', urlsToPrewarm);
    caches.open(API_CACHE).then((cache) => {
      urlsToPrewarm.forEach((u) => {
        fetch(u).then((res) => {
          if (res.status === 200) cache.put(u, res);
        }).catch((err) => console.warn(`Failed to prewarm ${u}:`, err));
      });
    });
  }
});
