/* FORKADE service worker - caches everything so it runs offline once installed.
   Bump CACHE when you change files to push an update to installed users. */
const CACHE = "forkade-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./playground.html",
  "./terms.html",
  "./privacy.html",
  "./guidelines.html",
  "./delete.html",
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
  // cache: "reload" skips the browser's HTTP cache so a new version never stores old files
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(u => fetch(u, { cache: "reload" }).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
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
  // pages and code: NETWORK FIRST so players always get the newest games; the saved copy is
  // only used when offline (or the network takes over 3s). Icons/images: cache first.
  const code = e.request.mode === "navigate" || /\.(html|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/");
  if (code) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(e.request).then(hit => hit || caches.match("./index.html"));
      const timer = setTimeout(() => { if (!done) fallback().then(r => { if (r && !done) { done = true; resolve(r); } }); }, 3000);
      fetch(e.request, { cache: "no-cache" }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
        if (!done) { done = true; clearTimeout(timer); resolve(res); }
      }).catch(() => fallback().then(r => { if (!done) { done = true; clearTimeout(timer); resolve(r || Response.error()); } }));
    }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }))
  );
});
