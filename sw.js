/* Nuddies Atelier service worker — makes index.html an installable, offline-capable PWA.
   Caching strategy (chosen so saves are never stale or lossy):
   - App shell (index.html, manifest.webmanifest, sw-registered icons): precached; served
     network-first so a new deploy shows up on the next load, cache when offline.
   - traits/manifest.json: network-first. When its content changes, the trait-art cache is
     purged, so replaced or renamed art can never be served from an old cache.
   - Trait layers (lossless WebP, PNG fallback) + picker thumbnails: cache-first, on demand. The app only fetches the layers
     you actually view (no 270 MB preload), and each one is kept for offline use after its
     first view. Freshness comes from the manifest purge above. Bytes are cached untouched,
     so exports stay pixel-identical to the art.
   - Google Fonts: stale-while-revalidate.
   Bump VERSION only when this file's logic changes; content updates need no bump. */
const VERSION = 'v3';
const SHELL = `nuddies-shell-${VERSION}`;
const ART = `nuddies-art-${VERSION}`;
const FONTS = `nuddies-fonts-${VERSION}`;
const SHELL_FILES = [
  './', 'index.html', 'accounts.js', 'manifest.webmanifest', 'traits/manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  const keep = new Set([SHELL, ART, FONTS]);
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName, onFresh) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) {
      if (onFresh) await onFresh(res.clone(), await cache.match(req));
      await cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req, { cache: 'no-cache' });
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName, event) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') return cache.put(req, res.clone()).then(() => res);
    return res;
  });
  if (hit) { event.waitUntil(refresh.catch(() => {})); return hit; }
  return refresh;
}

// When the trait manifest changes, drop cached art + thumbnails so no stale layer is ever
// composited; layers are re-fetched on demand as they are viewed.
async function purgeArtIfManifestChanged(fresh, cached) {
  if (!cached) return;
  if (await fresh.text() !== await cached.text()) await caches.delete(ART);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, FONTS, e));
    return;
  }
  if (url.origin !== self.location.origin) return;

  const scope = new URL(self.registration.scope);
  const rel = url.pathname.startsWith(scope.pathname) ? url.pathname.slice(scope.pathname.length) : url.pathname;

  if (rel === 'traits/manifest.json') {
    e.respondWith(networkFirst(req, SHELL, purgeArtIfManifestChanged));
  } else if ((rel.startsWith('traits/') && rel.toLowerCase().endsWith('.png')) ||
             ((rel.startsWith('layers/') || rel.startsWith('thumbs/')) && rel.toLowerCase().endsWith('.webp'))) {
    e.respondWith(cacheFirst(req, ART));
  } else if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('index.html')));
  } else {
    e.respondWith(networkFirst(req, SHELL));
  }
});
