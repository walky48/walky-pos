'use strict';

const CACHE = 'walky-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app.js',
  './ui/styles.css',
  './backend/constants.js',
  './backend/helpers.js',
  './backend/seed.js',
  './backend/store.js',
  './backend/state.js',
  './backend/logic.js',
  './backend/sync.js',
  './ui/js/common.js',
  './ui/js/login.js',
  './ui/js/kasa.js',
  './ui/js/layout.js',
  './ui/js/tables.js',
  './ui/js/order.js',
  './ui/js/print.js',
  './ui/js/stock.js',
  './ui/js/stats.js',
  './ui/js/cari.js',
  './ui/js/menu.js',
  './ui/js/users.js',
  './ui/js/gunsonu.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Ağ öncelikli: çevrimiçiyken her zaman güncel dosya gelir ve önbellek
   tazelenir; çevrimdışıyken önbellekten çalışır. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/api/')) return; /* API ve canlı yayın (SSE) önbelleğe girmez */
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(hit =>
          hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
        )
      )
  );
});
