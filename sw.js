// Minimal service worker — exists only to satisfy Chrome's requirement
// for a registered service worker with a fetch handler before it will
// offer "Install app" for this site.
//
// Deliberately does NOT cache anything. This site is updated frequently
// (a new index.html gets uploaded regularly), and a caching service
// worker risks showing people an old, stale version even after a fresh
// upload. Every request is simply passed straight through to the
// network, exactly as if this file didn't exist at all — just enough
// for installability, nothing more.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
