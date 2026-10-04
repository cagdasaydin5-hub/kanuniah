/* Trabzon Kanuni EAH Aile Hekimliği – service worker.
   Otomatik üretildi: tools/build_pwa.py. Elle düzenlemeyin; sürüm, dosyaların içeriğinden hesaplanır. */
"use strict";
var VERSION = "17e099c06efd";
var CACHE = "kanuniah-" + VERSION;
var RUNTIME = "kanuniah-runtime";
var PRECACHE = [
  "./",
  "404.html",
  "araclar.html",
  "hakkinda.html",
  "index.html",
  "makaleler.html",
  "rehberler.html",
  "takvim.html",
  "manifest.webmanifest",
  "data/araclar.json",
  "data/etkinlikler.json",
  "data/inr-algoritma.json",
  "data/makaleler.json",
  "data/mamalar.json",
  "data/meta.json",
  "data/rehberler.json",
  "data/sut.json",
  "assets/apple-touch-icon.png",
  "assets/arac-etkilesim.js",
  "assets/arac-inr.js",
  "assets/arac-mama.js",
  "assets/arac-sut.js",
  "assets/araclar.js",
  "assets/emblem.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/site.css",
  "assets/site.js",
  "assets/takvim.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    /* HTTP önbelleğini atla: her sürüm sunucudaki güncel dosyaları alsın */
    return c.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf("kanuniah-") === 0 && k !== CACHE && k !== RUNTIME;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function put(cacheName, req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    var copy = res.clone();
    caches.open(cacheName).then(function (c) { c.put(req, copy); });
  }
  return res;
}

/* Sayfalar ve veri: önce ağ (güncel içerik), ağ yoksa önbellek */
function networkFirst(req, fallback) {
  return fetch(req).then(function (res) { return put(CACHE, req, res); }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (fallback && caches.match(fallback));
    }).then(function (hit) { return hit || Response.error(); });
  });
}

/* Varlıklar (css, js, svg, png): önce önbellek; listede olmayan yeni bir dosya (ör. sonradan
   eklenen assets/arac-*.js) ilk açılışta ağdan alınıp önbelleğe eklenir */
function cacheFirst(req, cacheName) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) { return put(cacheName, req, res); });
  });
}

/* Google Fonts: önbellekten hemen ver, arka planda tazele */
function staleWhileRevalidate(req) {
  return caches.open(RUNTIME).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { return put(RUNTIME, req, res); }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") { e.respondWith(networkFirst(req, "index.html")); return; }
    var path = url.pathname.slice(self.registration.scope.length - self.location.origin.length);
    if (/^data\/.*\.json$/.test(path) || /\.(html|webmanifest)$/.test(path)) { e.respondWith(networkFirst(req)); return; }
    if (path === "sw.js") return;
    e.respondWith(cacheFirst(req, CACHE));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(req));
  }
});
