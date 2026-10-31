const CACHE_NAME = 'xiaoyongshi-v16';
const ASSETS = [
  './',
  './index.html',
  './all.html',
  './combo.html',
  './style.css',
  './data.js',
  './pinyin-audio-data.js?v=tts3',
  './teacher-voice-data.js?v=tts3',
  './teacher-voice-player.js?v=tts3',
  './app.js?v=tts3',
  './hanzi-writer.min.js',
  './hanzi-data.js',
  './math.html',
  './math-style.css',
  './math-data.js',
  './math-app.js?v=tts3',
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
