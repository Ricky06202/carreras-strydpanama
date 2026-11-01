// Installability-only service worker: every request stays network-backed.
// No CacheStorage is used, so HTML, APIs, auth, admin, and personal data are never cached.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
