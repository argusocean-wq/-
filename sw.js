const CACHE_NAME = 'exam-prep-shell-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './data/questions.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/data/questions.json')) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(cached => cached || Response.error())));
    return;
  }
  if (req.mode === 'navigate' || CORE.some(path => url.href === new URL(path, self.registration.scope).href)) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html'))));
  }
});