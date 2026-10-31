const CACHE_NAME = 'ai-coach-kyle-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles/site.css',
  './scripts/app.js',
  './scripts/analytics.js',
  './scripts/data.js',
  './scripts/kenburns.js',
  './scripts/logger.js',
  './scripts/router.js',
  './scripts/storage.js',
  './scripts/studio.js',
  './scripts/theme.js',
  './scripts/utils.js',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/icon.svg',
  './assets/icon-maskable.svg',
  './assets/og-card.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        }),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate';
  const isSameOrigin = url.origin === self.location.origin;

  if (isNavigation && isSameOrigin) {
    event.respondWith(
      caches
        .match('./index.html')
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});

