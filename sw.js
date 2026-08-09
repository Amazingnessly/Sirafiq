const CACHE_NAME = 'sirafiq-shell-v5';
const APP_FILES = [
  './', './index.html', './styles.css?v=5', './app.js?v=5', './db.js?v=5', './lot1.js?v=5',
  './writing.js?v=5', './pronunciation.js?v=5', './learning.js?v=5', './manifest.webmanifest',
  './assets/logo-sirafiq-verrouille.png', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try { const response = await fetch(request); if (response.ok) cache.put(request, response.clone()); return response; }
  catch { const cached = await cache.match(request) || await cache.match(request, { ignoreSearch: true }); if (cached) return cached; throw new Error('Ressource indisponible hors ligne'); }
}
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url); if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request).catch(async () => (await caches.open(CACHE_NAME)).match('./index.html')));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
