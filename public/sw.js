/*
 * Service worker de VIORA TRAVEL.
 * A propósito NO guarda páginas ni datos: las propuestas, el cuestionario y el panel
 * siempre se piden al servidor (son privados y cambian). Solo guarda una página
 * «sin conexión» y los íconos, para mostrar algo útil si se corta internet.
 */
const CACHE = "viora-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
});
