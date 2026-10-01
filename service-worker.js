const CACHE_NAME = "toda-qr-prototype-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json"
];

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(FILES_TO_CACHE);
            })
    );

    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames
                    .filter(function(cacheName) {
                        return cacheName !== CACHE_NAME;
                    })
                    .map(function(cacheName) {
                        return caches.delete(cacheName);
                    })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", function(event) {
    const request = event.request;

    // Only handle normal GET requests
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Let external sites (Google Forms, etc.) load normally
    if (url.origin !== self.location.origin) {
        return;
    }

    // Network-first: always try to get the newest files, fall back to cache offline
    event.respondWith(
        fetch(request)
            .then(function(networkResponse) {
                const copy = networkResponse.clone();

                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(request, copy);
                });

                return networkResponse;
            })
            .catch(function() {
                // ignoreSearch lets "./?driver=TRIKE-103" match the cached page
                return caches.match(request, { ignoreSearch: true })
                    .then(function(cachedResponse) {
                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        if (request.mode === "navigate") {
                            return caches.match("./index.html");
                        }

                        return Response.error();
                    });
            })
    );
});