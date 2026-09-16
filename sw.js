const CACHE_NAME = 'smartattend-shell-v2';
const APP_SHELL = ['./', './index.html', './styles.css', './script.js', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const isAppShell = APP_SHELL.some(path => new URL(path, self.location).pathname === new URL(event.request.url).pathname);
  event.respondWith((isAppShell ? fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)) : caches.match(event.request).then(cached => cached || fetch(event.request))).catch(() => caches.match('./index.html')));
});
