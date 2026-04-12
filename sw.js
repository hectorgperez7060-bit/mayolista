// ============================================================
// MAYOLISTA — Service Worker  v1.0
// Cache-first strategy for offline support
// ============================================================

const CACHE_NAME = 'mayolista-v4';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/pedido.html',
  '/admin.html',
  '/css/style.css',
  '/js/app.js',
  '/js/ai.js',
  '/js/voice.js',
  '/js/export.js',
  '/js/pedido.js',
  '/data/catalogo_ejemplo.json',
  '/manifest.json',
];

// Install: cache all core assets
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, fallback to network
self.addEventListener('fetch', evt => {
  // Skip CDN requests (always network)
  if (evt.request.url.includes('cdn.jsdelivr') || evt.request.url.includes('fonts.')) {
    evt.respondWith(fetch(evt.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(resp => {
        // Cache successful GET responses
        if (resp.ok && evt.request.method === 'GET') {
          caches.open(CACHE_NAME).then(c => c.put(evt.request, resp.clone()));
        }
        return resp;
      }).catch(() => {
        // Offline fallback
        if (evt.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
