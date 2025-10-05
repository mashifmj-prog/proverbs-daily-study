const CACHE_NAME = 'proverbs-cache-v3';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Pre-cache bundled translations (add as you create them—ensures offline from install)
  '/web-proverbs.json',
  '/kjv-proverbs.json',
  '/asv-proverbs.json',
  '/bbe-proverbs.json',
  '/ceb-proverbs.json',
  '/ylt-proverbs.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => Promise.all(
      keyList.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // For all requests: Cache-first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => cachedResponse || fetch(event.request).then(networkResponse => {
        // Cache successful network responses for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }))
      .catch(() => new Response('Offline: App cached, but resource unavailable.', { status: 503 }))
  );
});
