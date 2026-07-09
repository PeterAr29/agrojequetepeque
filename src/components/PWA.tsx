"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker (solo en producción para no interferir con el
 * hot-reload de desarrollo). Habilita instalación como PWA y notificaciones.
 */
export default function PWA() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* si falla, la app sigue funcionando sin PWA */
      });
    }
  }, []);

  return null;
}
