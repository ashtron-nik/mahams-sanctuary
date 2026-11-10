var CACHE = 'ash-v60'; // ponytail: bump version when adding/renaming cached files
var urlsToCache = [
  '/',
  '/index.html',
  '/birthday.html',
  '/birthday-defaults.js',
  '/mahams-images/memory-01.jpeg',
  '/mahams-images/memory-02.jpeg',
  '/mahams-images/memory-03.jpeg',
  '/mahams-images/memory-04.jpeg',
  '/mahams-images/memory-05.jpeg',
  '/mahams-images/memory-06.jpeg',
  '/100-organs.html',
  '/love.html',
  '/sky-observatory.html',
  '/photo-gallery.html',
  '/admin.html',
  '/admin.js',
  '/stats.html',
  '/404.html',
  '/dream.html',
  '/sky-generator.html',
  '/sky-generator-living.html',
  '/music.js',
  '/songs/list.json',
  '/skies.js',
  '/sky-observatory.js',
  '/firefly-jar.js',
  '/sky-living.js',
  '/track.js',
  '/fb-db.js',
  '/feature-flags.js',
  '/style.css',
  '/content-common.js',
  '/anime.min.js',
  '/motion-masterpiece.js',
  '/dragon-companion.js',
  '/companion-girl.js',
  '/girl-assets/atlas.json',
  '/girl-assets/atlas.png',
  '/companion-boy.js',
  '/boy-assets/atlas.json',
  '/boy-assets/atlas.png',

  '/matrix-rain.js',
  '/adaptive-text.js',
  '/global-easter-eggs.js',
  '/landscape.js',
  '/interactive.js',
  '/tree-of-memories.js',
  '/secret-letters.js',
  '/butterfly-collection.js',
  '/world-progress.js',
  '/random-constellations.js',
  '/manifest.json',
  '/activity.html',
  '/events.js',
  '/puzzle-hunt.js',
  '/letters.js',
  '/dynamic-content.js',
  '/activity-tracker.js',
  '/section-lock.js',
  '/lock.js',
  '/quiz.js',
  '/quiz.json',
  '/i-remember.html',
  '/letter-that-writes-itself.html',
  '/guide.html',
  '/timeline.html',
  '/install-prompt.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(urlsToCache);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // ponytail: HTML = network-first so fresh content always loads; assets = cache-first
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        return caches.open(CACHE).then(function (cache) { cache.put(e.request, res.clone()); return res; });
      }).catch(function () { return caches.match(e.request); })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (res) {
          return caches.open(CACHE).then(function (cache) {
            if (e.request.url.startsWith(self.location.origin)) { cache.put(e.request, res.clone()); }
            return res;
          });
        });
      })
    );
  }
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      ).then(function () { return self.clients.claim(); });
    })
  );
});