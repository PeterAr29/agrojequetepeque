# 🔔 Notificaciones push de lluvia (Nivel 3) — Guía de configuración

Alertas de lluvia que llegan al agricultor **aunque tenga la app cerrada**, usando
**Web Push** + un **cron** que revisa el clima y envía los avisos.

```
Navegador (PWA)  ──suscribe──►  Supabase (push_subscriptions)
                                      ▲
Vercel Cron (cada hora) ──►  /api/cron/clima  ──lee suscripciones + parcelas──┘
                                      │
                                      └─ revisa Open-Meteo ─► si va a llover ─► Web Push ─► 📱
```

---

## 1. Variables de entorno

Ya están generadas tus claves VAPID (en `.env.local`). Debes añadir estas **5 variables**
también en **Vercel** (Project → Settings → Environment Variables):

| Variable | Dónde va | Valor |
|----------|----------|-------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | cliente + servidor | (tu clave pública VAPID) |
| `VAPID_PRIVATE_KEY` | **solo servidor** | (tu clave privada VAPID) |
| `VAPID_SUBJECT` | servidor | `mailto:tucorreo@ejemplo.com` |
| `CRON_SECRET` | servidor | (cadena aleatoria; protege el endpoint) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Supabase → Settings → API → `service_role` |

> ⚠️ `VAPID_PRIVATE_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son **secretas**. Nunca las
> pongas en variables `NEXT_PUBLIC_*` ni las subas a git (`.env.local` ya está ignorado).

Para regenerar claves VAPID: `node -e "console.log(require('web-push').generateVAPIDKeys())"`

---

## 2. Base de datos

Ejecuta en el **SQL Editor** de Supabase el archivo
[`supabase/migrations/002_push_subscriptions.sql`](../supabase/migrations/002_push_subscriptions.sql)
(crea la tabla `push_subscriptions` con RLS).

---

## 3. El cron (quién dispara la revisión)

El endpoint es **`GET /api/cron/clima`** y está protegido con `CRON_SECRET`.

### Opción A — Vercel Cron (ya configurado en `vercel.json`)
Se ejecuta según `"schedule": "0 11 * * *"` (una vez al día, 11:00 UTC = 6 a.m. Perú).
Vercel añade automáticamente la cabecera `Authorization: Bearer $CRON_SECRET`.

> 🔸 **Plan Hobby (gratis)**: los cron de Vercel se ejecutan **solo 1 vez al día** (por eso
> el horario es diario). Para avisos **por hora**, usa la Opción B o sube al plan Pro y
> cambia el schedule a `0 * * * *`.

### Opción B — Cron externo gratis (recomendado en Hobby)
Usa [cron-job.org](https://cron-job.org) (gratis) para llamar cada hora a:

```
https://TU-APP.vercel.app/api/cron/clima?secret=TU_CRON_SECRET
```

### Probarlo manualmente
```
https://TU-APP.vercel.app/api/cron/clima?secret=TU_CRON_SECRET
```
Responde algo como `{"ok":true,"suscripciones":1,"enviados":1,"eliminadas":0}`.

---

## 4. Cómo lo usa el agricultor

1. Abre la app en el navegador (o instala la PWA: "Añadir a pantalla de inicio").
2. Va a **Clima** y pulsa **🔔 Activar alertas de lluvia** → acepta el permiso.
3. Listo: su navegador queda suscrito. Cuando el cron detecte lluvia próxima en alguna
   de sus parcelas, recibirá la notificación **aunque no tenga la app abierta**.

---

## 5. Notas importantes

- **HTTPS obligatorio**: las notificaciones solo funcionan en `https://` (Vercel lo da).
  En local, solo funciona el Nivel 2 (con la app abierta) y en `npm run build && npm start`.
- **iPhone / iOS**: el push web solo funciona si el usuario **instala la PWA** en la
  pantalla de inicio (iOS 16.4+). En el navegador normal de iOS no llega.
- **Anti-spam**: no se repite el aviso a una misma suscripción antes de 6 h
  (columna `ultima_alerta`).
- **Suscripciones caducadas**: si el navegador ya no acepta el push (404/410), el cron
  borra esa suscripción automáticamente.
- **Umbral de lluvia**: se avisa si en las próximas 12 h hay ≥50 % de probabilidad o
  ≥0,2 mm (ajustable en `src/lib/clima.ts`).
