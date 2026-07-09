-- ============================================================
--  Migración 002 — Suscripciones Web Push (alertas con app cerrada)
-- ============================================================
--  Ejecuta esto en el SQL Editor de Supabase.
--  Guarda la suscripción push de cada navegador/dispositivo del usuario.
-- ============================================================

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  ultima_alerta timestamptz,             -- para no repetir avisos con demasiada frecuencia
  created_at    timestamptz not null default now()
);

create index if not exists idx_push_usuario on public.push_subscriptions (usuario_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select" on public.push_subscriptions;
drop policy if exists "push_insert" on public.push_subscriptions;
drop policy if exists "push_update" on public.push_subscriptions;
drop policy if exists "push_delete" on public.push_subscriptions;

create policy "push_select" on public.push_subscriptions
  for select using (auth.uid() = usuario_id);

create policy "push_insert" on public.push_subscriptions
  for insert with check (auth.uid() = usuario_id);

create policy "push_update" on public.push_subscriptions
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "push_delete" on public.push_subscriptions
  for delete using (auth.uid() = usuario_id);

-- Nota: el cron del servidor usa la clave "service_role", que ignora RLS,
-- para leer las suscripciones de todos los usuarios y enviarles los avisos.
