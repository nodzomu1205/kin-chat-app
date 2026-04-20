const CACHE_NAME = "kin-chat-cache-v2";
const NAVIGATION_FALLBACK_URL = "/";
const urlsToCache = [NAVIGATION_FALLBACK_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(NAVIGATION_FALLBACK_URL, responseClone);
              })
            );
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(NAVIGATION_FALLBACK_URL);
          if (cachedResponse) return cachedResponse;
          throw new Error("Navigation request failed and no fallback page was cached.");
        })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
