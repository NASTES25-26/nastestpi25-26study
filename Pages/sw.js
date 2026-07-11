// NASTES Research Hub — Service Worker
// Network-first strategy: if the phone has data, it always fetches the
// latest version of a page and quietly updates the cache behind it. Only
// falls back to the cache when there's no connection. This means new pages
// (About NASTES, Departments, etc.) work automatically the moment they're
// uploaded — no need to edit this file or bump the cache name.
var CACHE_NAME = 'nastes-hub-v1';

// Only a small, guaranteed-safe set is pre-cached at install time, since
// cache.addAll() fails entirely if even one URL 404s. Everything else gets
// cached automatically the first time someone visits it while online.
var PRECACHE_URLS = [
  '/nastestpi25-26study/',
  '/nastestpi25-26study/index.html',
  '/nastestpi25-26study/manifest.json',
  '/nastestpi25-26study/icons/icon-192.png',
  '/nastestpi25-26study/icons/icon-512.png',
  '/nastestpi25-26study/icons/nastes-logo.png',
  '/nastestpi25-26study/icons/polytechnic-logo.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Network-first, cache fallback. Anything successfully fetched (any page,
// including ones added after this file was last touched) gets cached
// automatically for the next time the person is offline.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/nastestpi25-26study/index.html');
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS (Broadcast tab) ──
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  var title = data.title || 'NASTES Research Hub';
  var options = {
    body: data.body || '',
    icon: '/nastestpi25-26study/icons/icon-192.png',
    badge: '/nastestpi25-26study/icons/icon-192.png',
    data: { link: data.link || '/nastestpi25-26study/index.html' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var link = (event.notification.data && event.notification.data.link) || '/nastestpi25-26study/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === link && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
