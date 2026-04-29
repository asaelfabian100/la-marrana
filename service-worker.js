const CACHE_NAME = "la-marrana-cache-v18";

// Incrementar CACHE_NAME cuando cambien HTML/CSS/JS/manifest/iconos.
// La estrategia prioriza frescura en GitHub Pages/iPhone sin perder offline básico.
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/marranita.svg"
];

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && isSameOrigin(request)) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok && isSameOrigin(request)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      return caches.match("./index.html");
    }

    throw error;
  }
}

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isCriticalAsset = [
    "/",
    "/la-marrana/",
    "/la-marrana/index.html",
    "/la-marrana/app.js",
    "/la-marrana/styles.css",
    "/la-marrana/manifest.json"
  ].includes(url.pathname);

  if (isNavigation || isCriticalAsset) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
