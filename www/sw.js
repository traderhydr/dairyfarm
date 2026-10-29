const CACHE_NAME = 'dairy-farm-v2.4';
const ASSETS = [
  './', './index.html', './manifest.json', './tailwind.css', './icon-192.png', './icon-512.png',
  './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2',
  './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2',
  './fonts/plus-jakarta-sans-latin-600-normal.woff2', './fonts/plus-jakarta-sans-latin-700-normal.woff2',
  './fonts/plus-jakarta-sans-latin-800-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
