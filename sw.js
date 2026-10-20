/* A.K Legal Law — service worker.
   Pages (navigations): NETWORK-FIRST — site updates always arrive fresh;
   the cache is only an offline fallback.
   Static files: stale-while-revalidate. Cross-origin requests untouched.
   All paths are relative to this script, so it works under any base path. */
var CACHE = "aklegal-v1";
function abs(p) { return new URL(p, self.location.href).toString(); }
var INDEX = abs("index.html");
var CORE = ["", "index.html", "manifest.webmanifest", "logo.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Ek file fail ho jaye to bhi install na ruke
      return Promise.all(CORE.map(function (p) {
        return c.add(abs(p)).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(INDEX, copy); });
        return res;
      }).catch(function () {
        return caches.match(INDEX);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
