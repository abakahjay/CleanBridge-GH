// CleanBridge GH service worker.
// - Pages: network first, falling back to the cached app shell when offline.
// - Hashed build assets (/assets/*) and icons: cache first (they never change).
// - Everything else, including the API and map tiles (other origins), is not
//   touched - prices, pickups and payments must always be live.
const VERSION = 'cb-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(async () => (await caches.match('/index.html')) || caches.match('/offline.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
        return res;
      }))
    );
  }
});

// Web Push from FullBackendd (utils/push.js): { title, body, url, tag }.
// Skipped while the app is open and visible - it shows the update itself.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      if (data.tag !== 'test' && wins.some((w) => w.focused && w.visibilityState === 'visible')) return undefined;
      return self.registration.showNotification(data.title || 'CleanBridge GH', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        tag: data.tag,
        renotify: Boolean(data.tag),
        data: { url: data.url || '/notifications' },
      });
    })
  );
});

// Tapping a job alert / update notification opens (or focuses) the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) { open.navigate(target).catch(() => {}); return open.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
