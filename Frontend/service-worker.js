/*
 * CAIGE PWA
 * Cacheia apenas arquivos estáticos da interface.
 * Dados de API e uploads de pacientes nunca são armazenados pelo Service Worker.
 */

const CACHE_NAME = 'caige-static-v1';
const CACHE_PREFIX = 'caige-static-';

const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/recursos/images/logo-caige.png',
  '/recursos/images/logocaige.png',
  '/recursos/images/logocaigebranco.png',
  '/recursos/images/pwa/apple-touch-icon.png',
  '/recursos/images/pwa/icon-192.png',
  '/recursos/images/pwa/icon-512.png',
  '/recursos/images/pwa/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

function podeCachear(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;

  // Nunca persistir respostas da API nem arquivos enviados de pacientes.
  if (url.pathname.startsWith('/api/')) return false;
  if (url.pathname.startsWith('/recursos/uploads/')) return false;

  if (url.pathname === '/manifest.webmanifest') return true;

  return ['style', 'script', 'font', 'image'].includes(request.destination);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!podeCachear(request, url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      });

      if (cached) {
        event.waitUntil(network.catch(() => {}));
        return cached;
      }

      return network;
    })
  );
});
