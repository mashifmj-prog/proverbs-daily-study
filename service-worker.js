const CACHE_NAME = 'proverbs-cache-base-v2';
// We’ll store specific translation caches too: proverbs-cache-WEB, proverbs-cache-KJV, etc.

const FILES_TO_CACHE = [
  '/', '/index.html', '/style.css', '/script.js', '/manifest.json',
  '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && !key.startsWith('proverbs-cache-')) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // If request is for a translation JSON
  if (url.pathname.endsWith('proverbs.json') || url.hostname.includes('example.com')) {
    event.respondWith(
      caches.match(req).then(resp => resp || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }))
    );
    return;
  }

  // Otherwise, default cache-first for app shell
  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req))
  );
});
