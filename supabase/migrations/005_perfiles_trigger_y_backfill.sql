-- ============================================================
--  Migración 005 — Crear perfil automáticamente al registrarse
-- ============================================================
--  La base tiene una tabla public.perfiles (id, nombres, rol, …) y las
--  tablas parcelas / alertas_climaticas / notificaciones tienen una FK
--  usuario_id -> perfiles(id). Pero el registro (register/page.tsx) solo
--  hace supabase.auth.signUp(), sin crear la fila en perfiles, y no había
--  ningún trigger que lo hiciera. Resultado: los usuarios nuevos no tenían
--  perfil y al crear una parcela fallaba con:
--    insert or update on table "parcelas" violates foreign key
--    constraint "parcelas_usuario_id_fkey"
--
--  Esta migración añade el patrón estándar de Supabase: un trigger que
--  crea el perfil al insertarse el usuario en auth.users, y un backfill
--  para los usuarios que ya existían sin perfil. Es idempotente.
-- ============================================================

-- Función: crea el perfil de un usuario recién registrado.
-- security definer → se ejecuta con permisos del dueño (salta RLS de perfiles).
create or replace function public.crear_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombres)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombres', ''),
      nullif(new.raw_user_meta_data->>'nombre', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger: al crear un usuario en auth.users, genera su perfil.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario();

-- Backfill: crea el perfil de los usuarios que ya existen y aún no lo tienen.
insert into public.perfiles (id, nombres)
select u.id,
       coalesce(
         nullif(u.raw_user_meta_data->>'nombres', ''),
         nullif(u.raw_user_meta_data->>'nombre', ''),
         split_part(u.email, '@', 1)
       )
from auth.users u
left join public.perfiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
