// Service worker for /offline/ only. Three strategies:
//   navigations  -> network first, cached copy, then the fallback page
//   /api/*       -> network first, cached copy
//   everything else same-origin -> stale-while-revalidate
// Frameworks package this as plugins (vite-plugin-pwa / Workbox, @serwist, next-pwa). The update flow below
// (wait for the person to accept) is the part most of them get wrong by default.
const VERSION = 'v1';
const CACHE = `baseline-${VERSION}`;
const FALLBACK = '/offline/fallback.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([FALLBACK])));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') event.respondWith(networkFirst(event.request, FALLBACK));
  else if (url.pathname.startsWith('/api/')) event.respondWith(networkFirst(event.request));
  else event.respondWith(staleWhileRevalidate(event.request));
});

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return markCached(cached);
    if (fallback) return cache.match(fallback);
    return Response.error();
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached ? markCached(cached) : (await network) ?? Response.error();
}
function markCached(response) {
  const headers = new Headers(response.headers);
  headers.set('x-served-by', 'service-worker cache');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
