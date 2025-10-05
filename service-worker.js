// service-worker.js - Modified to unregister and clear caches

self.addEventListener('install', event => {
  // Skip waiting to immediately take control
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then(keyList => Promise.all(
        keyList.map(key => caches.delete(key))
      )),
      // Unregister this Service Worker
      self.registration.unregister()
    ]).then(() => {
      console.log('Service Worker unregistered and all caches cleared');
    })
  );
});

// No fetch handling to prevent caching
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
