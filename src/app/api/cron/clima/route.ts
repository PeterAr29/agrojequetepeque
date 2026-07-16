import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { obtenerClima, detectarAlertaLluvia } from "@/lib/clima";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No repetir el aviso a una misma suscripción si ya se envió hace poco.
const HORAS_DEDUP = 6;

export async function GET(request: Request) {
  // --- 1. Autorización (Vercel Cron manda "Authorization: Bearer CRON_SECRET") ---
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const enviado =
    request.headers.get("authorization") === `Bearer ${secret}` ||
    url.searchParams.get("secret") === secret;

  if (secret && !enviado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // --- 2. Configuración ---
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

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // Cliente con service_role: ignora RLS para leer datos de todos los usuarios.
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- 3. Suscripciones ---
  const { data: subs } = await db.from("push_subscriptions").select("*");
  if (!subs || subs.length === 0) {
    return NextResponse.json({ enviados: 0, mensaje: "Sin suscripciones" });
  }

  const ahora = Date.now();
  let enviados = 0;
  let eliminadas = 0;

  // --- 3.5 MODO DE PRUEBA (?test=1) ---
  // Envía una notificación de demostración a TODAS las suscripciones,
  // sin revisar el clima ni respetar el anti-spam. Útil para verificar
  // que las alertas llegan (p. ej. durante una exposición). Sigue
  // protegido por CRON_SECRET como el resto del endpoint.
  if (url.searchParams.get("test") === "1") {
    const payload = JSON.stringify({
      title: "🔔 Prueba de alerta — AgroJequetepeque",
      body: "¡Funciona! Así se verá el aviso cuando se espere lluvia en tus parcelas. 🌧️",
      url: "/dashboard/clima",
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        enviados++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          eliminadas++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      modo: "prueba",
      suscripciones: subs.length,
      enviados,
      eliminadas,
    });
  }

  // Calcula la alerta de cada usuario una sola vez (varias suscripciones/usuario).
  const cacheAlerta = new Map<string, string | null>();

  async function alertaDeUsuario(usuarioId: string): Promise<string | null> {
    if (cacheAlerta.has(usuarioId)) return cacheAlerta.get(usuarioId)!;

    const { data: parcelas } = await db
      .from("parcelas")
      .select("nombre,latitud,longitud")
      .eq("usuario_id", usuarioId);

    const conCoords = (parcelas || []).filter(
      (p) => p.latitud != null && p.longitud != null
    );

    for (const p of conCoords) {
      try {
        const clima = await obtenerClima(p.latitud, p.longitud);
        const a = detectarAlertaLluvia(clima);
        if (a.hay) {
          const cuando =
            (a.enHoras ?? 0) > 0 ? `en ~${a.enHoras} h` : "muy pronto";
          const texto = `Se espera lluvia ${cuando} en "${p.nombre}" (${a.probabilidad}% de probabilidad).`;
          cacheAlerta.set(usuarioId, texto);
          return texto;
        }
      } catch {
        /* ignora el error de una parcela y sigue con la siguiente */
      }
    }

    cacheAlerta.set(usuarioId, null);
    return null;
  }

  // --- 4. Recorre suscripciones y envía ---
  for (const sub of subs) {
    if (
      sub.ultima_alerta &&
      ahora - new Date(sub.ultima_alerta).getTime() < HORAS_DEDUP * 3600_000
    ) {
      continue;
    }

    const texto = await alertaDeUsuario(sub.usuario_id);
    if (!texto) continue;

    const payload = JSON.stringify({
      title: "🌧️ Alerta de lluvia — AgroJequetepeque",
      body: texto,
      url: "/dashboard/clima",
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      enviados++;
      await db
        .from("push_subscriptions")
        .update({ ultima_alerta: new Date().toISOString() })
        .eq("id", sub.id);
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
    suscripciones: subs.length,
    enviados,
    eliminadas,
  });
}
