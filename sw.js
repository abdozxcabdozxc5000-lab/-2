
const CACHE_NAME = 'mowazeb-pro-v1';
const DYNAMIC_CACHE_NAME = 'mowazeb-dynamic-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Supabase requests should go to network first, but we don't cache them in SW
  // becuase the Supabase client handles its own state.
  if (request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((fetchRes) => {
          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            // Only cache valid http/https responses
            if (request.url.startsWith('http')) {
                cache.put(request.url, fetchRes.clone());
            }
            return fetchRes;
          });
        })
      );
    }).catch(() => {
        // Fallback logic if needed
    })
  );
});
