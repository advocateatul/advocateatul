/* A.K Legal Law — service worker.
   Pages (navigations): INSTANT-FIRST — the copy saved on the phone is shown
   immediately (native-app feel); a fast network answer (within ~1.2s) still
   wins so updates arrive fresh, and the network copy always refreshes the
   saved copy in the background for the next open.
   Static files: stale-while-revalidate. Cross-origin requests untouched.
   All paths are relative to this script, so it works under any base path. */
var CACHE = "aklegal-v5";
function abs(p) { return new URL(p, self.location.href).toString(); }
var INDEX = abs("index.html");
var CORE = ["", "index.html", "hero.webp", "manifest.webmanifest", "logo.webp", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

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
  var path = url.pathname;
  var isIndexNav = path.endsWith("/") || path.endsWith("/index.html");
  // Sirf homepage navigation ko hi instant-first cache milega; clients.html ya
  // APK download jaisi dusri navigations ko browser khud handle karega —
  // warna galat file homepage ke cache me ghus sakti thi (bug fix 2026-10-23).
  if (req.mode === "navigate" && !isIndexNav) return;
  if (path.endsWith(".apk")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(INDEX).then(function (cached) {
          var net = fetch(req).then(function (res) {
            cache.put(INDEX, res.clone());
            return res;
          }).catch(function () { return null; });
          if (!cached) return net;
          // App launch (?appv=): saved copy TURANT — opening fast, upar wali
          // Chrome loading-line lagbhag gayab; network copy background me
          // cache refresh karti rehti hai (net promise upar chal raha hai).
          if (url.search.indexOf("appv=") !== -1) return cached;
          // Saved copy ready: fresh network within 1.2s wins, warna turant saved copy
          return Promise.race([
            net,
            new Promise(function (r) { setTimeout(function () { r(null); }, 1200); })
          ]).then(function (fresh) { return fresh || cached; });
        });
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
