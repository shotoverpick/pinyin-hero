const CACHE_NAME = 'xiaoyongshi-v21';
const ASSETS = [
  './',
  './index.html',
  './all.html',
  './combo.html',
  './style.css?v=arcade2-tones1',
  './data.js',
  './math-unit4-literacy.js?v=1',
  './yuwen-garden5-literacy.js?v=1',
  './yuwen-garden5-voice.js?v=1',
  './math-unit4-voice.js?v=1',
  './pinyin-audio-data.js?v=tts3',
  './teacher-voice-data.js?v=tts3',
  './teacher-voice-player.js?v=tts3',
  './app.js?v=garden5-1',
  './hanzi-writer.min.js',
  './hanzi-data.js',
  './math.html',
  './math-style.css',
  './math-data.js',
  './math-app.js?v=real-sfx1',
  './math-fast-voice-data.js?v=fast1',
  './designs/arcade-upgrade/arcade-upgrade.css?v=arcade2',
  './designs/arcade-upgrade/arcade-fx.js?v=real-sfx1',
  './designs/arcade-upgrade/arcade-sound-data.js?v=real-sfx1',
  './designs/arcade-upgrade/assets/duck-flight-v2.png',
  './designs/arcade-upgrade/assets/tank-hull-v2.png',
  './designs/arcade-upgrade/assets/tank-turret-v2.png',
  './designs/arcade-upgrade/assets/balloon-v2.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(networkResp => {
      if (networkResp && networkResp.status === 200) {
        const clone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return networkResp;
    }).catch(() => caches.match(event.request))
  );
});
