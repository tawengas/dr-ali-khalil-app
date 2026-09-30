// ===================================
// Service Worker — النخبة الطبية
// ===================================

const CACHE_VERSION = 'v3.0.0';
const CACHE_NAME = `elite-medical-${CACHE_VERSION}`;

// الملفات الأساسية (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/services.html',
  '/book.html',
  '/track.html',
  '/login.html',
  '/dashboard.html',
  '/admin.html',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/ui.js',
  '/manifest.json'
];

// ===================================
// INSTALL
// ===================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache files individually to avoid one failure blocking all
        return Promise.all(
          APP_SHELL.map(url => 
            cache.add(url).catch(err => console.warn('Cache failed:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ===================================
// ACTIVATE — clean old caches
// ===================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ===================================
// FETCH
// ===================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Ignore non-http(s) requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Ignore API requests — always network
  if (url.pathname.startsWith('/api/')) return;

  // Ignore Cloudflare Worker API (external)
  if (url.hostname.includes('workers.dev')) return;

  // ============ HTML Pages: Network-First ============
  const isHTMLPage = 
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isHTMLPage) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response (if OK and not redirected)
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone).catch(() => {});
            }).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          // Network failed → try cache
          return caches.match(request).then(cached => {
            if (cached) return cached;
            // Fallback to index.html only for root
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // ============ Static Assets: Cache-First ============
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone).catch(() => {});
        }).catch(() => {});

        return response;
      }).catch(() => {
        // Offline fallback for static assets
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ===================================
// MESSAGE
// ===================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
