// Offline cache: everything the app needs is precached on install.
const CACHE = 'marinelab-v1';
const FILES = [
  "./",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png",
  "./assets/maskable-192.png",
  "./assets/maskable-512.png",
  "./css/app.css",
  "./fonts/jetbrains-mono-latin-500-normal.woff2",
  "./fonts/jetbrains-mono-latin-700-normal.woff2",
  "./fonts/lalezar-arabic-400-normal.woff2",
  "./fonts/lalezar-latin-400-normal.woff2",
  "./fonts/readex-pro-arabic-400-normal.woff2",
  "./fonts/readex-pro-arabic-500-normal.woff2",
  "./fonts/readex-pro-arabic-600-normal.woff2",
  "./fonts/readex-pro-arabic-700-normal.woff2",
  "./fonts/readex-pro-latin-400-normal.woff2",
  "./fonts/readex-pro-latin-500-normal.woff2",
  "./fonts/readex-pro-latin-600-normal.woff2",
  "./fonts/readex-pro-latin-700-normal.woff2",
  "./index.html",
  "./js/audio.js",
  "./js/main.js",
  "./js/scene.js",
  "./manifest.webmanifest",
  "./vendor/addons/OrbitControls.js",
  "./vendor/addons/RoomEnvironment.js",
  "./vendor/confetti.browser.js",
  "./vendor/gsap.min.js",
  "./vendor/three.module.min.js",
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('./index.html'))));
});
