import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { esAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notificaciones/prueba
 *
 * Envía una notificación push de PRUEBA a los dispositivos del usuario
 * autenticado (los suyos, no los de otros). Sirve para que cada agricultor
 * verifique desde la app que sus alertas llegan, sin depender del clima.
 *
 * Autenticación: cabecera `Authorization: Bearer <access_token>` con el
 * token de la sesión de Supabase (no usa CRON_SECRET; ese es solo del cron).
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@agrojeque.app";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: "Faltan variables de entorno (Supabase service role o VAPID)" },
      { status: 500 }
    );
  }

  // --- 1. Autenticación por sesión del usuario ---
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  // --- 2. Suscripciones ---
  // Admin → notifica a TODOS los dispositivos suscritos (útil para demostrar).
  // Usuario normal → solo a los suyos.
  const admin = esAdmin(user.email);

  const consulta = db.from("push_subscriptions").select("*");
  const { data: subs } = admin
    ? await consulta
    : await consulta.eq("usuario_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      enviados: 0,
      mensaje: admin
        ? "No hay ningún dispositivo con alertas activadas."
        : "Este dispositivo no tiene alertas activadas.",
    });
  }

  // --- 3. Envía la notificación de prueba ---
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const payload = JSON.stringify({
    title: "🔔 Prueba de alerta — AgroJequetepeque",
    body: "¡Funciona! Así se verá el aviso cuando se espere lluvia en tus parcelas. 🌧️",
    url: "/dashboard/clima",
  });

  let enviados = 0;
  let eliminadas = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err) {
      // 404/410 = suscripción caducada → la borramos.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id);
        eliminadas++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    modo: admin ? "todos" : "propias",
    suscripciones: subs.length,
    enviados,
    eliminadas,
  });
}
