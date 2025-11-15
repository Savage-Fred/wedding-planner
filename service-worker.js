const CACHE_NAME = 'wedding-planner-ai-cache-v1';
// Add all the files that make up your app shell to this list.
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/contexts/AuthContext.tsx',
  '/components/icons.tsx',
  '/services/geminiService.ts',
  '/services/googleAuthService.ts',
  '/services/googleSheetsService.ts',
  '/types.ts',
  '/App.tsx',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Note: Caching external resources (like Google Fonts or aistudio cdn) can be tricky
        // and might require more advanced service worker logic for production use.
        // For simplicity, we are attempting to cache them directly here.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
