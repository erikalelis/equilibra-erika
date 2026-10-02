const CACHE_NAME = "equilibra-v41";

self.addEventListener("install", (event) => {
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

// Network-first: siempre intenta traer la versión más nueva primero,
// así los cambios llegan enseguida. Si no hay señal, usa lo último
// guardado para que la app igual abra.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Avisos en segundo plano (si el sistema lo permite): lee la lista que guardó la app.
self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "equilibra-avisos") return;
  event.waitUntil((async () => {
    const c = await caches.open("equilibra-avisos");
    const r = await c.match("/avisos.json"); if (!r) return;
    const data = await r.json();
    const d = new Date(), hoy = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (d.getHours() < (data.hora || 9)) return;
    const vr = await c.match("/vistos.json"); const vistos = vr ? await vr.json() : {};
    for (const it of data.items) {
      if (it.desde <= hoy && vistos[it.id] !== hoy) {
        vistos[it.id] = hoy;
        await self.registration.showNotification("Equilibra", { body: it.texto, tag: it.id, icon: "icon-192.png", badge: "badge-96.png", vibrate: [300,150,300,150,600], requireInteraction: true });
      }
    }
    await c.put("/vistos.json", new Response(JSON.stringify(vistos)));
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window" }).then((l) => (l.length ? l[0].focus() : clients.openWindow("./"))));
});
