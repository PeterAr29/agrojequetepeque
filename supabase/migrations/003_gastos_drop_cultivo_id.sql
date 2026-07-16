-- ============================================================
--  Migración 003 — Quitar "cultivo_id" de la tabla "gastos"
-- ============================================================
--  Algunas bases se crearon con una columna "cultivo_id NOT NULL"
--  en "gastos" que nunca formó parte del esquema versionado
--  (los gastos se relacionan con PARCELAS, no con cultivos).
--
--  Esa columna provocaba el error al registrar un gasto:
--    null value in column "cultivo_id" of relation "gastos"
--    violates not-null constraint
--
--  Ejecuta esto en el SQL Editor de Supabase si tu tabla "gastos"
--  todavía tiene la columna "cultivo_id".
-- ============================================================

alter table public.gastos
  drop column if exists cultivo_id;
