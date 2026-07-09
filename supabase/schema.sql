-- ============================================================
--  AgroJequetepeque — Esquema de base de datos (Supabase / PostgreSQL)
-- ============================================================
--  Cómo usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Abre el "SQL Editor"
--    3. Pega TODO este archivo y ejecútalo ("Run")
--
--  Este script es idempotente: se puede ejecutar varias veces
--  sin romper nada (usa IF NOT EXISTS / CREATE OR REPLACE).
--
--  Modelo multi-tenant por usuario:
--    Cada fila tiene "usuario_id" = auth.uid() y está protegida
--    por Row Level Security (RLS). Un usuario solo ve/edita lo suyo.
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABLA: parcelas (terrenos agrícolas)
-- ------------------------------------------------------------
create table if not exists public.parcelas (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre             text not null,
  ubicacion          text,
  superficie         numeric(12, 2),
  unidad_superficie  text default 'ha',
  tipo_suelo         text,
  latitud            numeric(10, 6),
  longitud           numeric(10, 6),
  poligono           jsonb,               -- contorno dibujado: [[lat, lng], ...]
  descripcion        text,
  created_at         timestamptz not null default now()
);

-- Si la tabla ya existía sin la columna "poligono", añádela:
alter table public.parcelas
  add column if not exists poligono jsonb;

-- ------------------------------------------------------------
-- 2) TABLA: cultivos (siembras dentro de una parcela)
-- ------------------------------------------------------------
create table if not exists public.cultivos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parcela_id     uuid references public.parcelas (id) on delete cascade,
  nombre         text not null,
  tipo           text,
  fecha_siembra  date,
  fecha_cosecha  date,
  estado         text default 'Activo',   -- Activo | Cosechado | Finalizado
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3) TABLA: riegos (registros de riego)
-- ------------------------------------------------------------
create table if not exists public.riegos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parcela_id     uuid references public.parcelas (id) on delete cascade,
  cultivo_id     uuid references public.cultivos (id) on delete set null,
  fecha          date not null default current_date,
  metodo         text default 'Goteo',    -- Goteo | Aspersión | Gravedad | Manual
  cantidad_agua  numeric(12, 2),          -- en m³
  duracion_horas numeric(6, 2),
  observaciones  text,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4) TABLA: produccion (cosechas / rendimiento)
-- ------------------------------------------------------------
create table if not exists public.produccion (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parcela_id     uuid references public.parcelas (id) on delete set null,
  cultivo_id     uuid references public.cultivos (id) on delete set null,
  fecha_cosecha  date not null default current_date,
  cantidad       numeric(12, 2),
  unidad         text default 'kg',       -- kg | ton | quintal
  calidad        text default 'Primera',  -- Primera | Segunda | Tercera
  observaciones  text,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) TABLA: gastos (costos operativos)
-- ------------------------------------------------------------
create table if not exists public.gastos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parcela_id  uuid references public.parcelas (id) on delete set null,
  categoria   text default 'Insumos',     -- Insumos | Mano de obra | Maquinaria | Riego | Transporte | Otros
  descripcion text,
  monto       numeric(12, 2) not null default 0,
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6) TABLA: ingresos (ventas / ingresos)
-- ------------------------------------------------------------
create table if not exists public.ingresos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parcela_id  uuid references public.parcelas (id) on delete set null,
  cultivo_id  uuid references public.cultivos (id) on delete set null,
  concepto    text,
  cantidad_kg numeric(12, 2),
  monto       numeric(12, 2) not null default 0,
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES (aceleran los filtros por usuario y por parcela)
-- ------------------------------------------------------------
create index if not exists idx_parcelas_usuario   on public.parcelas   (usuario_id);
create index if not exists idx_cultivos_usuario   on public.cultivos   (usuario_id);
create index if not exists idx_cultivos_parcela   on public.cultivos   (parcela_id);
create index if not exists idx_riegos_usuario     on public.riegos     (usuario_id);
create index if not exists idx_produccion_usuario on public.produccion (usuario_id);
create index if not exists idx_gastos_usuario     on public.gastos     (usuario_id);
create index if not exists idx_ingresos_usuario   on public.ingresos   (usuario_id);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
--  Cada usuario solo puede ver y modificar SUS propias filas.
-- ============================================================
alter table public.parcelas   enable row level security;
alter table public.cultivos   enable row level security;
alter table public.riegos     enable row level security;
alter table public.produccion enable row level security;
alter table public.gastos     enable row level security;
alter table public.ingresos   enable row level security;

-- Función auxiliar: crea las 4 políticas estándar (select/insert/update/delete)
-- para una tabla dada. Se ejecuta abajo por cada tabla.
do $$
declare
  t text;
  tablas text[] := array['parcelas','cultivos','riegos','produccion','gastos','ingresos'];
begin
  foreach t in array tablas loop
    -- Limpia políticas previas para poder re-ejecutar el script
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);

    execute format($f$
      create policy "%1$s_select" on public.%1$I
        for select using (auth.uid() = usuario_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_insert" on public.%1$I
        for insert with check (auth.uid() = usuario_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_update" on public.%1$I
        for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_delete" on public.%1$I
        for delete using (auth.uid() = usuario_id);
    $f$, t);
  end loop;
end $$;

-- ============================================================
--  FIN DEL ESQUEMA
-- ============================================================
