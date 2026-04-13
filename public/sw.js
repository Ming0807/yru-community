const CACHE_NAME = 'yru-community-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/manifest.webmanifest',
];

const DYNAMIC_CACHE = 'yru-dynamic-v2';
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Install — precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/**
 * Check if a request is a Next.js RSC (React Server Component) request.
 * These MUST NOT be cached because they contain dynamic component payloads
 * that become stale immediately and cause the app to freeze.
 */
function isNextRSCRequest(request) {
  // RSC header used by Next.js App Router for client-side navigation
  if (request.headers.get('RSC') === '1') return true;
  if (request.headers.get('Next-Router-State-Tree')) return true;
  if (request.headers.get('Next-Router-Prefetch')) return true;

  // RSC query param (some Next.js versions use this)
  const url = new URL(request.url);
  if (url.searchParams.has('_rsc')) return true;

  // Next.js action requests
  if (request.headers.get('Next-Action')) return true;

  return false;
}

/**
 * Check if a URL should be completely excluded from caching.
 */
function shouldSkipCache(request) {
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return true;

  // Skip external API calls — always fetch fresh
  if (url.hostname.includes('supabase.co') || url.hostname.includes('cloudinary.com')) return true;

  // Skip Next.js RSC requests — CRITICAL for preventing navigation freeze
  if (isNextRSCRequest(request)) return true;

  // Skip Next.js data routes
  if (url.pathname.startsWith('/_next/data/')) return true;

  // Skip auth-related routes
  if (url.pathname.startsWith('/auth/')) return true;
  if (url.pathname.startsWith('/api/auth/')) return true;

  // Skip Supabase auth endpoints in URL
  if (url.pathname.includes('/auth/')) return true;

  return false;
}

/**
 * Trim the dynamic cache to prevent unbounded growth.
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries first
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip requests that should never be cached
  if (shouldSkipCache(request)) return;

  const url = new URL(request.url);

  // For navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // For static assets (_next/static, images, fonts): Cache-first
  // สำหรับ static assets (_next/static, images, fonts): Cache-first
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          
          // บรรทัดที่ 130: เพิ่ม .catch เพื่อดักจับตอนเน็ตหลุด
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
                trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
              }
              return response;
            })
            .catch((err) => {
              console.warn('SW: Fetch failed for static asset:', url.pathname, err);
              // ส่งกลับเป็น undefined หรือจะส่งรูป fallback เล็กๆ ก็ได้ครับ
              return new Response('Network error occurred', { status: 408 });
            });
        })
      )
    );
    return;
  }

  // For local API calls (non-auth): Network-only, no caching
  // API responses should always be fresh to prevent stale data issues
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle it normally
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'YRU Community';
  const options = {
    body: data.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: data.url || '/notifications' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'yru-notification',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if no existing one
      return self.clients.openWindow(targetUrl);
    })
  );
});
