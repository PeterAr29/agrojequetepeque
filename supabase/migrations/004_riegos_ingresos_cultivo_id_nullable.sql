-- ============================================================
--  Migración 004 — "cultivo_id" opcional en "riegos" e "ingresos"
-- ============================================================
--  El formulario de Riegos y el de Ingresos permiten NO elegir un
--  cultivo (el campo es opcional). Sin embargo, algunas bases se
--  crearon con "cultivo_id NOT NULL" en esas tablas, lo que hacía
--  fallar el registro al guardar sin cultivo:
--    null value in column "cultivo_id" ... violates not-null constraint
--
--  Esta migración quita la restricción NOT NULL para alinear la base
--  con el esquema versionado (donde cultivo_id es nullable, on delete
--  set null). Nota: en "produccion" el cultivo SÍ es obligatorio en el
--  formulario, por eso ahí se conserva NOT NULL.
--
--  Ejecuta esto en el SQL Editor de Supabase si tus tablas todavía
--  tienen cultivo_id como NOT NULL.
-- ============================================================

alter table public.riegos   alter column cultivo_id drop not null;
alter table public.ingresos alter column cultivo_id drop not null;
