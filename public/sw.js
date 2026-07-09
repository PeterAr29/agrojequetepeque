// ============================================================
//  Service Worker — AgroJequetepeque PWA
// ============================================================
const CACHE = "agro-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Estrategia network-first para recursos propios (permite uso offline básico).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET del mismo origen (no interceptar Supabase, Open-Meteo, tiles…).
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// --- Notificaciones push (nivel 3: llegan con la app cerrada) ---
self.addEventListener("push", (event) => {
  let data = { title: "AgroJequetepeque", body: "Alerta climática" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    /* payload no-JSON */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "clima-agro",
      data: { url: data.url || "/dashboard/clima" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/dashboard/clima";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientes) => {
        for (const c of clientes) {
          if (c.url.includes(destino) && "focus" in c) return c.focus();
        }
        return self.clients.openWindow(destino);
      })
  );
});
