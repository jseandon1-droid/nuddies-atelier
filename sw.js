/* Nuddies Atelier service worker — makes index.html an installable, offline-capable PWA.
   Caching strategy (chosen so saves are never stale or lossy):
   - App shell (index.html, manifest.webmanifest, sw-registered icons): precached; served
     network-first so a new deploy shows up on the next load, cache when offline.
   - traits/manifest.json: network-first. When its content changes, the trait-art cache is
     purged, so replaced or renamed art can never be served from an old cache.
   - Trait PNGs: cache-first (the generator preloads every layer, ~270 MB, so re-fetching in
     the background on each open would burn phone data). Freshness comes from the manifest
     purge above, which also re-caches the new library in the background. Bytes are
     cached untouched, so exports stay pixel-identical to the art.
   - Google Fonts: stale-while-revalidate.
   Bump VERSION only when this file's logic changes; content updates need no bump. */
const VERSION = 'v1';
const SHELL = `nuddies-shell-${VERSION}`;
const ART = `nuddies-art-${VERSION}`;
const FONTS = `nuddies-fonts-${VERSION}`;
const SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'traits/manifest.json',
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
    .then(() => self.clients.claim())
    // first install: cache the whole library now, so the app works offline after one visit
    .then(() => caches.match('traits/manifest.json'))
    .then((r) => r && r.text()).then((t) => t && warmArt(t)));
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

// When the trait manifest changes, drop cached art so no stale layer is ever composited,
// then re-cache the new library in the background so the app stays fully usable offline
// (a same-tab reload is served from the browser's memory cache and would not refill it).
async function warmArt(manifestText) {
  let M; try { M = JSON.parse(manifestText); } catch { return; }
  const cache = await caches.open(ART);
  const urls = M.categories.flatMap((c) => c.options.filter((o) => o.file)
    .map((o) => new URL(`traits/${c.name}/${o.file}`, self.registration.scope).href));
  for (let i = 0; i < urls.length; i += 8) {
    await Promise.all(urls.slice(i, i + 8).map(async (u) => {
      if (await cache.match(u)) return;
      try { const r = await fetch(u, { cache: 'no-cache' }); if (r.ok) await cache.put(u, r); } catch {}
    }));
  }
}
function purgeArtIfManifestChanged(event) {
  return async (fresh, cached) => {
    if (!cached) return;
    const a = await fresh.text();
    if (a === await cached.text()) return;
    await caches.delete(ART);
    event.waitUntil(warmArt(a));
  };
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
    e.respondWith(networkFirst(req, SHELL, purgeArtIfManifestChanged(e)));
  } else if (rel.startsWith('traits/') && rel.toLowerCase().endsWith('.png')) {
    e.respondWith(cacheFirst(req, ART));
  } else if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('index.html')));
  } else {
    e.respondWith(networkFirst(req, SHELL));
  }
});
