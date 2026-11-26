/* ══════════════════════════════════════════════════
   NIFES Study Hub — Service Worker (PWA Offline Engine)
   ══════════════════════════════════════════════════ */

const CACHE_NAME = 'nifes-study-hub-v3.3.0';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/404.html',
  '/app',
  '/app/index.html',
  '/app/css/styles.css',
  '/app/js/config.js',
  '/app/js/seed.js',
  '/app/js/db.js',
  '/app/js/tools.js',
  '/app/js/app.js'
];

// Install: pre-cache the critical application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Could not pre-cache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets, Safe Network-First for Navigation & APIs
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests or non-HTTP schemes
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls to Supabase or backend: network first, no offline cache corruption
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', offline: true }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Navigation requests (HTML pages): Safe async resolver
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (url.pathname.startsWith('/app')) {
            return (await caches.match('/app')) || (await caches.match('/app/index.html'));
          }
          return (await caches.match('/')) || (await caches.match('/index.html'));
        }
      })()
    );
    return;
  }

  // App shell and static assets (CSS, JS, images, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        if (cachedResponse) return cachedResponse;
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
