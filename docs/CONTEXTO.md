# 🌱 AgroJequetepeque — Contexto del Proyecto

> Documento vivo. Describe **qué es**, **cómo está construido** y **hacia dónde va** el
> proyecto. Mantenerlo actualizado a medida que se avanza.

---

## 1. ¿Qué es?

**AgroJequetepeque** es una plataforma web para la **gestión agrícola** del valle de
Jequetepeque. Permite a un agricultor administrar, desde un solo lugar:

- 🚜 **Parcelas** — sus terrenos (ubicación, superficie, tipo de suelo, coordenadas).
- 🌱 **Cultivos** — las siembras de cada parcela (tipo, fechas de siembra/cosecha, estado).
- 💧 **Riegos** — registro de riegos (método, cantidad de agua, duración).
- 📈 **Producción** — cosechas y rendimiento (cantidad, calidad).
- 💰 **Gastos** — costos operativos (insumos, mano de obra, maquinaria…).
- 🏦 **Ingresos** — ventas y rentabilidad.

Cada usuario tiene su propia cuenta y **solo ve sus propios datos** (multi-tenant por usuario).

---

## 2. Stack tecnológico

| Capa            | Tecnología                                   |
|-----------------|----------------------------------------------|
| Framework       | **Next.js 16** (App Router, React 19)        |
| Lenguaje        | **TypeScript**                               |
| Estilos         | **Tailwind CSS v4**                          |
| Backend / BD    | **Supabase** (PostgreSQL + Auth + RLS)       |
| Autenticación   | Supabase Auth (email + contraseña)           |
| Despliegue      | **Vercel**                                   |

> ⚠️ Next.js 16 tiene cambios importantes respecto a versiones anteriores. Ver `AGENTS.md`.

---

## 3. Estructura del proyecto

```
agrojequetepeque/
├── docs/
│   └── CONTEXTO.md            ← este documento
├── supabase/
│   └── schema.sql            ← esquema de BD + RLS (ejecutar en Supabase)
├── src/
│   ├── app/
│   │   ├── page.tsx          ← raíz: redirige a /dashboard
│   │   ├── layout.tsx        ← layout raíz (metadata, fuentes)
│   │   ├── globals.css       ← estilos globales + variables de tema
│   │   ├── login/            ← inicio de sesión
│   │   ├── register/         ← registro
│   │   ├── forgot-password/  ← recuperar contraseña
│   │   ├── update-password/  ← establecer nueva contraseña
│   │   └── dashboard/
│   │       ├── layout.tsx    ← Sidebar + Header + AuthGuard
│   │       ├── page.tsx      ← panel con KPIs y accesos rápidos
│   │       ├── parcelas/     ← CRUD parcelas
│   │       ├── cultivos/     ← CRUD cultivos
│   │       ├── riegos/       ← CRUD riegos
│   │       ├── produccion/   ← CRUD producción
│   │       ├── gastos/       ← CRUD gastos
│   │       └── ingresos/     ← CRUD ingresos
│   ├── components/
│   │   ├── Sidebar.tsx       ← menú lateral responsive + cerrar sesión
│   │   ├── Header.tsx        ← cabecera con usuario + botón menú móvil
│   │   ├── AuthGuard.tsx     ← protege el dashboard si no hay sesión
│   │   ├── DashboardShell.tsx← coordina sidebar/header (estado del menú móvil)
│   │   └── ui/
│   │       ├── FeedbackProvider.tsx ← toasts + diálogo de confirmación
│   │       ├── GraficoMensual.tsx   ← gráfico ingresos vs gastos (sin librerías)
│   │       ├── Toolbar.tsx          ← búsqueda + filtros + exportación
│   │       └── MapaParcela.tsx      ← mapa Leaflet: dibuja contorno + calcula superficie
│   └── lib/
│       ├── supabase.ts       ← cliente de Supabase (singleton)
│       └── types.ts          ← tipos del dominio + helpers (formatoSoles, hoyISO…)
├── .env.example              ← plantilla de variables de entorno
└── .env.local                ← variables reales (NO se sube a git)
```

---

## 4. Modelo de datos

Todas las tablas viven en el esquema `public` y tienen:

- `id` (uuid, PK)
- `usuario_id` (uuid) → dueño de la fila (`auth.uid()`)
- `created_at` (timestamptz)

Relaciones principales:

```
auth.users
   └── parcelas (1—N)
          └── cultivos (1—N)
                 ├── riegos
                 ├── produccion
                 └── ingresos
          └── gastos
```

El detalle exacto de columnas está en **`supabase/schema.sql`**, que también define:

- **Índices** por `usuario_id` / `parcela_id`.
- **Row Level Security (RLS)**: 4 políticas por tabla (select/insert/update/delete)
  con la condición `auth.uid() = usuario_id`. Esto garantiza el aislamiento de datos
  entre usuarios **incluso aunque el frontend no filtre** (la clave anon es pública).

---

## 5. Autenticación y seguridad

- El cliente de Supabase (`src/lib/supabase.ts`) usa la **clave anon/publishable**, que
  es pública por diseño. La seguridad real la impone **RLS** en la base de datos.
- El flujo de auth es **del lado del cliente** (`@supabase/supabase-js`), guardando la
  sesión en `localStorage`.
- `AuthGuard` (en el layout del dashboard) redirige a `/login` si no hay sesión activa.
- `forgot-password` usa `window.location.origin` para construir el enlace de retorno,
  de modo que funcione tanto en `localhost` como en producción (Vercel).

> 🔒 **Nunca** exponer la `service_role key` en el frontend ni en variables `NEXT_PUBLIC_*`.

---

## 6. Puesta en marcha (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local   # y rellenar con tus datos de Supabase

# 3. Crear las tablas en Supabase
#    - BD nueva: copiar supabase/schema.sql en el SQL Editor y ejecutarlo.
#    - BD que ya existía: ejecutar además supabase/migrations/001_parcelas_poligono.sql
#      (añade la columna "poligono" que usa el mapa de parcelas).

# 4. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:3000
```

---

## 7. Despliegue en Vercel

1. Subir el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importar el repo.
3. Framework: **Next.js** (autodetectado). Root directory: `agrojequetepeque`.
4. En **Environment Variables** añadir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy**.
6. En **Supabase → Authentication → URL Configuration**, añadir la URL de producción
   de Vercel a *Site URL* y *Redirect URLs* (para que funcione el reset de contraseña).

Ver la guía paso a paso en `README.md`.

---

## 8. Estado actual y próximos pasos

### ✅ Hecho
- Autenticación completa con **validación, estados de carga y mostrar/ocultar contraseña**.
- Dashboard con KPIs, **balance neto** y **gráfico de ingresos vs gastos** (últimos 6 meses).
- CRUD de **Parcelas, Cultivos, Riegos, Producción, Gastos e Ingresos**.
- Esquema de BD + RLS documentado y versionado.
- Protección de rutas del dashboard (`AuthGuard`).
- **Sistema de notificaciones (toasts) y diálogo de confirmación** (`FeedbackProvider`)
  que reemplaza a `alert()`/`confirm()`.
- **Navegación responsive**: menú lateral deslizable en móvil (`DashboardShell`).
- **Tipos compartidos** y helpers (`src/lib/types.ts`): `formatoSoles`, `hoyISO`, constantes.
- Estados de carga en listados y botones.
- **Búsqueda y filtros** en los 6 listados (por texto + filtro específico de cada módulo).
- **Exportación a Excel (CSV) y PDF** en cada listado, respetando los filtros aplicados.
- **Mapa interactivo en Parcelas** (Leaflet + OpenStreetMap/satélite, sin API key):
  se dibuja el contorno de la parcela (vértices **arrastrables**) y se calculan solos la
  **superficie (ha)** y las **coordenadas del centro**; incluye botón de **GPS**. El
  contorno se guarda en la columna `poligono` (jsonb) → requiere la **migración 001**.
- **Clima y alertas de lluvia** (Open-Meteo, gratis y sin API key): página
  `/dashboard/clima` con pronóstico por parcela, banner de alerta en el dashboard y
  **notificaciones del sistema** cuando se espera lluvia (nivel 2: app abierta / PWA).
- **PWA instalable** (manifest + service worker + iconos): se instala en PC y celular
  desde el navegador, sin tienda de apps. Iconos generados con `npm run iconos`.
- **Notificaciones push de lluvia con la app CERRADA (Nivel 3)**: Web Push con claves
  VAPID, tabla `push_subscriptions`, endpoint `GET /api/cron/clima` (usa `web-push` +
  service_role) y **Vercel Cron** (`vercel.json`) que revisa Open-Meteo cada hora y
  envía los avisos. Guía completa en **[docs/NOTIFICACIONES.md](NOTIFICACIONES.md)**.
- Preparado para desplegar en Vercel.

### 🔜 Ideas para continuar
- [ ] Preferencias de alerta por usuario (umbral, horario de "no molestar").
- [ ] Historial de alertas enviadas.
- [ ] Otras alertas: heladas, viento fuerte, calor extremo (Open-Meteo las trae).

### 🔜 Ideas para continuar
- [ ] Paginación en los listados (cuando haya muchos registros).
- [ ] Relacionar visualmente riegos/producción/ingresos con su cultivo y parcela.
- [ ] Migrar a auth con cookies (`@supabase/ssr`) + middleware para protección en servidor.
- [ ] Reportes/exportación (PDF, Excel).
- [ ] Roles (administrador, técnico, agricultor).
- [ ] Pruebas automatizadas.
- [ ] Modo oscuro.

### 🧩 Piezas reutilizables (para futuras pantallas)
- `useToast()` → `toast.success/error/info(mensaje)`.
- `useConfirm()` → `await confirmar({ titulo, mensaje, peligro })`.
- `formatoSoles(n)` y `hoyISO()` desde `@/lib/types`.
- Tipos del dominio y listas de opciones (`CATEGORIAS_GASTO`, `METODOS_RIEGO`, …).
- `<Toolbar>` (`@/components/ui/Toolbar`) → búsqueda + filtros (children) + botones de export.
- `exportarExcel(base, columnas, filas)` y `exportarPDF(base, titulo, columnas, filas)`
  desde `@/lib/export`. `columnas` es `{ header, valor: (fila) => ... }[]`.
  El PDF carga `jspdf`/`jspdf-autotable` de forma diferida (no pesa en el bundle inicial).

---

## 9. Convenciones

- **Idioma del dominio**: español (nombres de variables, tablas y UI en español).
- **Componentes de página** que usan hooks/estado llevan `"use client"`.
- Los formularios validan lo mínimo antes de enviar y muestran errores de Supabase.
- Mantener el estilo visual: verde (`green-600/700/800`), tarjetas `rounded-2xl`/`3xl`,
  `shadow-lg`, fondo `slate-100`.
