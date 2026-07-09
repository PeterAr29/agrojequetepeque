// ============================================================
//  Notificaciones del sistema (nivel 2: app abierta o PWA en 2.º plano)
//  El nivel 3 (app cerrada) se hará con Web Push + servidor.
// ============================================================

export function soportaNotificaciones(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function estadoPermiso(): NotificationPermission | "unsupported" {
  if (!soportaNotificaciones()) return "unsupported";
  return Notification.permission;
}

/** Pide permiso al usuario para enviar notificaciones. */
export async function pedirPermiso(): Promise<NotificationPermission> {
  if (!soportaNotificaciones()) return "denied";
  return Notification.requestPermission();
}

/** Muestra una notificación usando el Service Worker (o el fallback nativo). */
export async function mostrarNotificacion(
  titulo: string,
  cuerpo: string
): Promise<void> {
  if (!soportaNotificaciones() || Notification.permission !== "granted") return;

  const opciones: NotificationOptions = {
    body: cuerpo,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "clima-agro",
  };

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(titulo, opciones);
  } catch {
    new Notification(titulo, opciones);
  }
}

// --- Control anti-spam: no repetir el aviso de una parcela con frecuencia ---
const HORAS_ENTRE_AVISOS = 3;

function claveAviso(parcelaId: string): string {
  return `aviso-lluvia-${parcelaId}`;
}

/**
 * Notifica lluvia para una parcela, pero solo si no se notificó en las últimas
 * horas (evita repetir el mismo aviso una y otra vez).
 */
export async function notificarLluvia(
  parcelaId: string,
  nombreParcela: string,
  enHoras: number,
  probabilidad: number
): Promise<void> {
  const clave = claveAviso(parcelaId);
  const ultimo = Number(localStorage.getItem(clave) || 0);
  const ahora = Date.now();

  if (ahora - ultimo < HORAS_ENTRE_AVISOS * 3600_000) return;

  const cuando =
    enHoras <= 0 ? "ahora mismo" : `en ~${enHoras} h`;

  await mostrarNotificacion(
    "🌧️ Alerta de lluvia — AgroJequetepeque",
    `Se espera lluvia ${cuando} en "${nombreParcela}" (${probabilidad}% de probabilidad).`
  );

  localStorage.setItem(clave, String(ahora));
}
