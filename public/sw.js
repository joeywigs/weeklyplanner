const CACHE_NAME = 'weekly-planner-v1';
const BASE_PATH = '/weeklyplanner';

// Core assets to cache on install
const PRECACHE_URLS = [
  `${BASE_PATH}/planner`,
  `${BASE_PATH}/recipes`,
  `${BASE_PATH}/groceries`,
  `${BASE_PATH}/settings`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`,
  `${BASE_PATH}/apple-touch-icon.png`,
];

// Install: precache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, stale-while-revalidate for app assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (e.g., API calls to Cloudflare Workers)
  if (url.origin !== self.location.origin) return;

  // For navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          cache.put(request, response.clone());
          return response;
        });
        return cached || fetched;
      });
    })
  );
});
