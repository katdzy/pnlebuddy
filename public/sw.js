/*
 * PNLE Buddy service worker: network first, cache as a fallback.
 * The 3D models (/anatomy/<system>.<hash>.glb) are the exception: their names change whenever they do, so they're
 * served from the cache once fetched, which saves re-downloading megabytes and lets an opened system work offline.
 *
 * When online, every request goes to the network, so updates are never held
 * back by a stale cache. Successful same-origin GET responses are kept so the
 * app can still open when the connection drops. Study data lives in
 * localStorage, not here.
 */

const CACHE = "pnlebuddy-v2";
const IMMUTABLE = /^\/anatomy\/[a-z]+\.[0-9a-f]{10}\.glb$/;
const PRECACHE = ["/", "/notebook", "/progress", "/study", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match(url.pathname, { ignoreVary: true });
          return shell || (await caches.match("/", { ignoreVary: true })) || Response.error();
        }
        return Response.error();
      }),
  );
});
