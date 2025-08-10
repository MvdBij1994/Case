const CACHE_NAME = 'case-math-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method === 'GET' && request.destination !== 'document') {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }
  e.respondWith(
    fetch(request).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
      return res;
    }).catch(() => caches.match(request))
  );
});
