/* Портик: офлайн-кэш. При смене файлов подними версию. */
const CACHE = 'portik-v12';
const ASSETS = ['./', './index.html', './app.css', './app.js', './theme.js', './manifest.webmanifest', './w.html', './w.js', './w.json',
  './fonts/forum.woff2', './fonts/literata.woff2', './fonts/literata-italic.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './vendor/pdf.min.mjs', './vendor/pdf.worker.min.mjs'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  /* страницы: сначала сеть, без сети из кэша */
  if (req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  /* код и данные: отдаем из кэша сразу, в фоне обновляем, чтобы правки доезжали без смены версии */
  if (/\.(js|css|json|webmanifest)$/.test(url.pathname) && !url.pathname.includes('/vendor/')){
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    }));
    return;
  }
  /* шрифты, иконки, pdf.js: сначала кэш */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
