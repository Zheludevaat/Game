/* Abyss of the Seven Lamps — service worker.
 *
 * Key invariants:
 *   - The cache name is versioned. Bump it on every deploy that changes
 *     bundle file names (Vite cache-busts JS/CSS by hash on every build).
 *   - HTML / navigation requests use NETWORK-FIRST. We never serve a stale
 *     index.html, because a stale index references stale (now-404) chunk
 *     filenames and the page goes white.
 *   - Static hashed assets (JS, CSS, fonts, images) use CACHE-FIRST. They
 *     are immutable for the lifetime of their filename.
 *   - On activate we wipe every cache that isn't the current one and we
 *     claim every open client immediately.
 *   - The page can post `NUKE_AND_UNREGISTER` to force a clean recovery.
 */

const CACHE_NAME = 'abyss-seven-lamps-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'NUKE_AND_UNREGISTER') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      for (const c of clients) c.navigate(c.url);
    })());
  }
});

function isNavigationRequest(req) {
  if (req.mode === 'navigate') return true;
  const accept = req.headers.get('accept') || '';
  return req.method === 'GET' && accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML / navigations. Falls back to cached index.html
  // only when offline, so the latest bundle URLs are always honoured.
  if (isNavigationRequest(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', clone)).catch(() => undefined);
        }
        return fresh;
      } catch {
        const cached = await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Cache-first for hashed assets, manifest, icons.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && fresh.type === 'basic') {
        const clone = fresh.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => undefined);
      }
      return fresh;
    } catch {
      return (await caches.match('./index.html')) || new Response('Offline', { status: 503 });
    }
  })());
});
