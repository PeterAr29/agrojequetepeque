-- ============================================================
--  Migración 001 — Contorno (polígono) de parcelas
-- ============================================================
--  Ejecuta esto en el SQL Editor de Supabase si tu tabla
--  "parcelas" ya existe y NO tiene la columna "poligono".
--
--  Guarda el contorno dibujado en el mapa como un arreglo JSON
--  de pares [latitud, longitud]. La superficie (hectáreas) y el
--  centro (latitud/longitud) se calculan en el cliente a partir
--  de este contorno.
-- ============================================================

alter table public.parcelas
  add column if not exists poligono jsonb;
