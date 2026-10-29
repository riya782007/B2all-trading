// Minimal service worker: lets the app install and show a friendly page when offline.
// It never caches the console's data, so numbers are always fresh.
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => { e.waitUntil(caches.open("b2-shell-1").then((c) => c.add(OFFLINE))); self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
