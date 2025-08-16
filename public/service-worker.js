const CACHE_NAME = "my-pwa-cache-v1";
const urlsToCache = [
  "/",               // root
  "/index.html",     // main page
  "/manifest.json",  // manifest
  "/favicon.ico",    // favicon
  "/styles.css",     // your Tailwind build file
  "/script.js"       // your main JS file
];

// Install Service Worker and Cache Files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate and Cleanup Old Caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept Fetch Requests
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response OR fetch new one
      return response || fetch(event.request);
    })
  );
});
