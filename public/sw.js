/**
 * Minimal service worker so Chrome/Edge on Android will offer "Install app".
 * Network-first for everything: the shop always wants live prices and stock.
 * A tiny offline fallback page is cached so a dropped connection still shows something useful.
 */
const CACHE = "pb-shell-v1";
const SHELL = ["/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Never cache API calls or auth; always go to the network.
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
        }
        throw new Error("offline");
      }),
  );
});
