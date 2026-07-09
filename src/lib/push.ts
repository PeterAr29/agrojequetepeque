// ============================================================
//  Web Push (Nivel 3) — suscripción del navegador a notificaciones
//  que llegan aunque la app esté cerrada.
// ============================================================

import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function pushConfigurado(): boolean {
  return !!VAPID_PUBLIC;
}

export function soportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Convierte la clave VAPID (base64url) al formato que espera PushManager. */
function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const salida = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) salida[i] = raw.charCodeAt(i);
  return salida;
}

/** ¿Ya está suscrito este navegador? */
export async function estaSuscrito(): Promise<boolean> {
  if (!soportaPush()) return false;
  try {
    // getRegistration() resuelve rápido (undefined si no hay SW); ready se
    // quedaría colgado en desarrollo, donde no registramos el service worker.
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/**
 * Suscribe este navegador a las notificaciones push y guarda la suscripción
 * en Supabase (ligada al usuario). Requiere permiso de notificaciones.
 */
export async function suscribirPush(): Promise<boolean> {
  if (!soportaPush() || !VAPID_PUBLIC) return false;

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return false;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false; // el SW solo se registra en producción

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const datos = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: user.id,
      endpoint: sub.endpoint,
      p256dh: datos.keys?.p256dh ?? "",
      auth: datos.keys?.auth ?? "",
    },
    { onConflict: "endpoint" }
  );

  return !error;
}

/** Cancela la suscripción push de este navegador y la borra de Supabase. */
export async function desuscribirPush(): Promise<boolean> {
  if (!soportaPush()) return false;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return true;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return true;
}
