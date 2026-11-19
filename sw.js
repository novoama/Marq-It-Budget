/* Keeps the budget app working offline. The page and the locked data come from the network first, so an update
   shows up the next time the app opens online; without a connection the saved copies open instead. */
var VERSION = 'budget-20261119T140700Z';
var SHELL = ['./', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable.png', './app.enc'];
var FONTS = 'budget-fonts';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== FONTS && k.indexOf('budget-') === 0; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// network first, with a time limit so a weak signal does not hold the app up
function fresh(req, key) {
  return caches.open(VERSION).then(function (cache) {
    var net = fetch(req, { cache: 'no-cache' }).then(function (r) {
      if (r && r.ok) cache.put(key, r.clone());
      return r;
    });
    var late = new Promise(function (ok) { setTimeout(ok, 4000); }).then(function () { return cache.match(key); });
    return Promise.race([net.catch(function () { return null; }), late]).then(function (r) {
      return r || net.catch(function () { return null; }).then(function (r2) { return r2 || cache.match(key); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    var scope = new URL(self.registration.scope);
    if (req.mode === 'navigate') { e.respondWith(fresh(req, new Request(scope.href))); return; }
    if (/\/app\.enc$/.test(url.pathname)) { e.respondWith(fresh(req, new Request(new URL('app.enc', scope).href))); return; }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); }));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; });
        return hit || net;
      });
    }));
  }
});
