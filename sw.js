/* Портик: офлайн-кэш. При смене шрифтов, иконок или pdf.js подними версию. */
const CACHE = 'portik-v14';
const ASSETS = ['./', './index.html', './app.css', './app.js', './theme.js', './manifest.webmanifest', './w.html', './w.js', './w.json',
  './fonts/forum.woff2', './fonts/literata.woff2', './fonts/literata-italic.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './vendor/pdf.min.mjs', './vendor/pdf.worker.min.mjs'];

self.addEventListener('install', e => {
  /* по одному файлу: если какого-то нет на сервере, остальное все равно закэшируется и новая версия встанет */
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.search.includes('reset')) return;
  const isStatic = /\/(fonts|icons|vendor)\//.test(url.pathname);
  if (!isStatic){
    /* страница, код и данные: сначала сеть, чтобы index.html, app.js и app.css всегда были одной версии; без сети из кэша */
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req).then(hit => hit || caches.match(req))));
    return;
  }
  /* шрифты, иконки, pdf.js: сначала кэш */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
