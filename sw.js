// Offline cache: everything the app needs is precached on install.
const CACHE = 'marinelab-v7';
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png",
  "./assets/maskable-192.png",
  "./assets/maskable-512.png",
  "./assets/voice/bolts_learn.mp3",
  "./assets/voice/bolts_test.mp3",
  "./assets/voice/clean_learn.mp3",
  "./assets/voice/clean_ok.mp3",
  "./assets/voice/clean_test.mp3",
  "./assets/voice/elbow_busy.mp3",
  "./assets/voice/elbow_ok.mp3",
  "./assets/voice/fit_learn.mp3",
  "./assets/voice/fit_test.mp3",
  "./assets/voice/flip.mp3",
  "./assets/voice/gasket_ok.mp3",
  "./assets/voice/gasket_small.mp3",
  "./assets/voice/leak_fail.mp3",
  "./assets/voice/no_gasket.mp3",
  "./assets/voice/orient.mp3",
  "./assets/voice/pass.mp3",
  "./assets/voice/ppe_learn.mp3",
  "./assets/voice/ppe_ok.mp3",
  "./assets/voice/ppe_sandal.mp3",
  "./assets/voice/ppe_scarf.mp3",
  "./assets/voice/ppe_test.mp3",
  "./assets/voice/ppe_watch.mp3",
  "./assets/voice/test_learn.mp3",
  "./assets/voice/test_test.mp3",
  "./assets/voice/torque_learn.mp3",
  "./assets/voice/torque_next.mp3",
  "./assets/voice/torque_opposite.mp3",
  "./assets/voice/torque_test.mp3",
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
  "./js/ambient.js",
  "./js/audio.js",
  "./js/grab3d.js",
  "./js/library-data.js",
  "./js/main.js",
  "./js/scene.js",
  "./js/symbols.js",
  "./js/tools3d.js",
  "./js/ui.js",
  "./js/voice-lines.js",
  "./js/work.js",
  "./js/worker3d.js",
  "./js/stations/cut.js",
  "./js/stations/drawing.js",
  "./js/stations/flange.js",
  "./js/stations/library.js",
  "./js/stations/measure.js",
  "./js/stations/thread.js",
  "./vendor/confetti.browser.js",
  "./vendor/gsap.min.js",
  "./vendor/three.module.min.js",
  "./vendor/addons/OrbitControls.js",
  "./vendor/addons/RoomEnvironment.js",
  "./vendor/addons/RoundedBoxGeometry.js"
];
// Updates are forced. A new worker installs fresh copies (bypassing the HTTP cache), then asks the open pages
// whether they run the update screen. Pages that do show it and send SKIP_WAITING; pages from older versions
// (without the update screen) get no choice: the worker activates and reloads them itself.
let ack = null, forced = false;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasUpdater = cs.length && await new Promise(res => { ack = res; cs.forEach(c => c.postMessage('NEW_VERSION?')); setTimeout(() => res(false), 2500); });
    if (!hasUpdater) { forced = true; self.skipWaiting(); }
  }));
});
self.addEventListener('message', e => {
  if (e.data === 'UPDATER' && ack) ack(true);
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'VERSION' && e.ports[0]) e.ports[0].postMessage(CACHE);
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(async () => {
    if (!forced) return;
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => c.navigate(c.url).catch(() => {}));
  }));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('./index.html'))));
});
