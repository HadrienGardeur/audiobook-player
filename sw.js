var CACHE_NAME = 'audiobook-player';
//HINT: Make sure that this correctly points to the static resources used for the player
var urlsToCache = [
  'index.html',
  'polyfills/fetch.js',
  'polyfills/urlsearchparams.js',
  'player.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  clients.claim();
});

/* For audiobooks, files are massive, always do cache first then network. */

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});