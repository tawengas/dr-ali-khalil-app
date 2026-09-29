// ===================================
// Service Worker — النخبة الطبية
// ===================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `elite-medical-${CACHE_VERSION}`;

// الملفات الأساسية (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/services.html',
  '/book.html',
  '/track.html',
  '/login.html',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/ui.js',
  '/manifest.json'
];

// ===================================
// INSTALL — تخزين App Shell
// ===================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ===================================
// ACTIVATE — تنظيف الكاش القديم
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
// FETCH — استراتيجيات ذكية
// ===================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير GET
  if (request.method !== 'GET') return;

  // تجاهل طلبات API (محتاجة إنترنت دايماً)
  if (url.pathname.startsWith('/api/')) {
    return; // اتركها للمتصفح
  }

  // تجاهل الـ Chrome extensions
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // تجاهل الـ API الخارجي (Cloudflare Worker)
  if (url.hostname.includes('workers.dev')) {
    // Network-first للـ API
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          }).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first للـ App Shell
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // ميتخزّنش لو مش 200 أو من origin مختلف
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        }).catch(() => {});

        return response;
      }).catch(() => {
        // لو الصفحة مش موجودة في الكاش و في offline
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ===================================
// MESSAGE — التواصل مع الصفحة
// ===================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ===================================
// PUSH NOTIFICATIONS (للمستقبل)
// ===================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'النخبة الطبية';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
