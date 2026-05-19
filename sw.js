const CACHE_NAME = 'werewolf-tools-v2026.5.19.2';
const ASSETS = [
  './index.html',
  './history-formatters.js',
  './timer-utils.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&family=Cinzel:wght@400;700;900&display=swap'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets reliably; fonts may fail on first offline install
      return cache.addAll(['./index.html', './history-formatters.js', './timer-utils.js', './manifest.json', './icon-192.png', './icon-512.png'])
        .then(() => cache.add('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&family=Cinzel:wght@400;700;900&display=swap').catch(() => {}));
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
