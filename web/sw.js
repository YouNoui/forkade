/* FORKADE service worker - caches everything so it runs offline once installed.
   Bump CACHE when you change files to push an update to installed users. */
const CACHE = "forkade-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./playground.html",
  "./engine.js",
  "./games/skyhop.js",
  "./games/swarm.js",
  "./games/striker.js",
  "./games/breaker.js",
  "./games/trail.js",
  "./games/drift.js",
  "./games/prism.js",
  "./games/wrecker.js",
  "./games/match.js",
  "./games3d/echo3d.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  // live data and other sites: always straight to the network, never cached
  if (u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  // cache-first: instant loads and full offline play
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
