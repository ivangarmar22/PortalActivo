-- PortalActivo · Identidad de la comunidad y archivos compartidos
-- Bucket privado «community-files». Ruta: {community_id}/{área}/…
--   notices/    adjuntos de avisos            → leen todas las viviendas de la comunidad
--   documents/  facturas, presupuestos, cuentas → leen todas las viviendas
--   incidents/  fotos de incidencias          → leen todas; suben vecinos y administración
--   receipts/{member_id}/  recibos            → solo la vivienda titular y la administración

alter table public.communities
  add column logo_url text check (logo_url is null or char_length(logo_url) <= 500);

-- Tipo de acceso de cada sesión de propietario:
--   full → entró con DNI + contraseña: ve todo el portal (y vota).
--   vote → entró con el formulario de votación (solo se valida el PIN): solo ve las votaciones.
alter table public.member_sessions
  add column access_scope text not null default 'vote' check (access_scope in ('full', 'vote'));

create function private.full_member_id(p_community_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.id
  from public.member_sessions ms
  join public.community_members cm on cm.id = ms.member_id
  where ms.user_id = (select auth.uid())
    and ms.access_scope = 'full'
    and cm.community_id = p_community_id
    and cm.is_active
  limit 1;
$$;

create function private.is_full_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.full_member_id(p_community_id) is not null;
$$;

revoke all on function private.full_member_id(uuid), private.is_full_member(uuid) from public;
grant execute on function private.full_member_id(uuid), private.is_full_member(uuid) to authenticated;

-- Vivienda vinculada a la sesión actual con acceso completo (para los módulos de comunidad).
create function private.session_member()
returns public.community_members
language sql
stable
security definer
set search_path = ''
as $$
  select cm.*
  from public.member_sessions ms
  join public.community_members cm on cm.id = ms.member_id and cm.is_active
  where ms.user_id = (select auth.uid()) and ms.access_scope = 'full'
  limit 1;
$$;

-- Vivienda de la sesión o error (para las RPC de propietarios).
create function private.require_session_member()
returns public.community_members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.session_member();
begin
  if v_member.id is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return v_member;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-files', 'community-files', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create function private.can_read_community_file(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_community uuid := private.try_uuid(split_part(p_name, '/', 1));
  v_area text := split_part(p_name, '/', 2);
begin
  if v_community is null then
    return false;
  end if;
  if private.is_community_admin(v_community) then
    return true;
  end if;
  if v_area in ('notices', 'documents', 'incidents') then
    return private.is_full_member(v_community);
  end if;
  if v_area = 'receipts' then
    return split_part(p_name, '/', 3) = private.full_member_id(v_community)::text;
  end if;
  return false;
end;
$$;

create function private.can_write_community_file(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_community uuid := private.try_uuid(split_part(p_name, '/', 1));
  v_area text := split_part(p_name, '/', 2);
begin
  if v_community is null or v_area not in ('notices', 'documents', 'incidents', 'receipts') then
    return false;
  end if;
  if private.is_community_admin(v_community) then
    return true;
  end if;
  -- Los vecinos solo pueden subir fotos de incidencias.
  return v_area = 'incidents'
    and lower(p_name) ~ '\.(jpe?g|png|webp)$'
    and private.is_full_member(v_community);
end;
$$;

create function private.can_manage_community_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_community_admin(private.try_uuid(split_part(p_name, '/', 1)));
$$;

revoke all on function
  private.session_member(),
  private.require_session_member(),
  private.can_read_community_file(text),
  private.can_write_community_file(text),
  private.can_manage_community_file(text)
from public;
grant execute on function
  private.session_member(),
  private.can_read_community_file(text),
  private.can_write_community_file(text),
  private.can_manage_community_file(text)
to authenticated;

create policy community_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'community-files' and private.can_read_community_file(name));
create policy community_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-files' and private.can_write_community_file(name));
create policy community_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'community-files' and private.can_manage_community_file(name))
  with check (bucket_id = 'community-files' and private.can_manage_community_file(name));
create policy community_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-files' and private.can_manage_community_file(name));
