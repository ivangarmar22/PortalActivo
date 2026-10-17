-- PortalActivo · Dos formas de acceso para los vecinos (decisión del 16/10/2026)
--
-- 1. Acceso completo: DNI + contraseña → todo el portal (scope 'full').
--    Primer acceso: DNI + PIN de la administración + contraseña nueva elegida por el vecino.
--    La administración nunca conoce la contraseña; generar un PIN nuevo la restablece.
-- 2. Solo votación: formulario con nombre, DNI, vivienda y PIN. Solo se valida el PIN
--    (el resto solo tiene que estar relleno) → scope 'vote'.
--
-- Como el PIN pasa a identificar por sí solo la vivienda:
--   · cada PIN es único en todo el sistema (índice único sobre su huella SHA-256);
--   · cada sesión tiene un límite de 5 intentos fallidos (bloqueo de 15 minutos), además del
--     límite de sesiones anónimas por IP de Supabase Auth.

alter table public.member_credentials
  add column pin_lookup text,
  add column password_hash text,
  add column password_set_at timestamptz;
create unique index member_credentials_pin_lookup_key on public.member_credentials (pin_lookup);

create table public.login_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auxiliares
-- ---------------------------------------------------------------------------
create function private.pin_lookup(p_pin text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest('portalactivo-pin:' || p_pin, 'sha256'), 'hex');
$$;

create function private.generate_unique_pin()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_pin text;
begin
  loop
    v_pin := private.generate_pin();
    exit when not exists (
      select 1 from public.member_credentials where pin_lookup = private.pin_lookup(v_pin)
    );
  end loop;
  return v_pin;
end;
$$;

create function private.session_locked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.login_attempts
    where user_id = (select auth.uid()) and locked_until > now()
  );
$$;

-- Registra un intento fallido de la sesión; devuelve true si la sesión queda bloqueada.
create function private.register_failed_login()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locked timestamptz;
begin
  insert into public.login_attempts as la (user_id, failed_count)
  values ((select auth.uid()), 1)
  on conflict (user_id) do update
  set failed_count = case when la.failed_count + 1 >= 5 then 0 else la.failed_count + 1 end,
      locked_until = case when la.failed_count + 1 >= 5 then now() + interval '15 minutes' else la.locked_until end,
      updated_at = now()
  returning locked_until into v_locked;
  return v_locked is not null and v_locked > now();
end;
$$;

create function private.clear_failed_logins()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts where user_id = (select auth.uid());
$$;

create function private.link_session(p_member_id uuid, p_scope text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.member_sessions (user_id, member_id, access_scope)
  values ((select auth.uid()), p_member_id, p_scope)
  on conflict (user_id) do update
  set member_id = excluded.member_id, access_scope = excluded.access_scope, created_at = now();
$$;

create function private.require_anonymous_session()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous_session_required' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function
  private.pin_lookup(text), private.generate_unique_pin(), private.session_locked(),
  private.register_failed_login(), private.clear_failed_logins(), private.link_session(uuid, text),
  private.require_anonymous_session()
from public;

-- ---------------------------------------------------------------------------
-- Datos de la sesión (ahora incluye el tipo de acceso)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_membership()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'member_id', cm.id,
    'community_id', c.id,
    'community_name', c.name,
    'community_logo_url', c.logo_url,
    'dwelling_label', cm.dwelling_label,
    'full_name', cm.full_name,
    'access_scope', ms.access_scope
  )
  from public.member_sessions ms
  join public.community_members cm on cm.id = ms.member_id and cm.is_active
  join public.communities c on c.id = cm.community_id
  where ms.user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 2. Solo votación: valida únicamente el PIN
-- ---------------------------------------------------------------------------
create or replace function public.member_sign_in(
  p_full_name text,
  p_dni text,
  p_dwelling text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credentials public.member_credentials;
begin
  perform private.require_anonymous_session();
  if private.session_locked() then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;
  if btrim(coalesce(p_full_name, '')) = '' or btrim(coalesce(p_dni, '')) = ''
     or btrim(coalesce(p_dwelling, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;

  if coalesce(p_pin, '') ~ '^[0-9]{6}$' then
    select mc.* into v_credentials
    from public.member_credentials mc
    join public.community_members cm on cm.id = mc.member_id and cm.is_active
    where mc.pin_lookup = private.pin_lookup(p_pin)
      and extensions.crypt(p_pin, mc.pin_hash) = mc.pin_hash;
  end if;

  if v_credentials.member_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', case when private.register_failed_login() then 'locked' else 'invalid_pin' end
    );
  end if;

  perform private.clear_failed_logins();
  perform private.link_session(v_credentials.member_id, 'vote');
  return jsonb_build_object('ok', true) || public.get_my_membership();
end;
$$;

-- ---------------------------------------------------------------------------
-- 1a. Primer acceso: DNI + PIN → el vecino crea su contraseña
-- ---------------------------------------------------------------------------
create function public.member_activate(p_dni text, p_pin text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credentials public.member_credentials;
begin
  perform private.require_anonymous_session();
  if private.session_locked() then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;
  if char_length(coalesce(p_password, '')) < 8 or char_length(p_password) > 72 then
    return jsonb_build_object('ok', false, 'error', 'weak_password');
  end if;

  if coalesce(p_pin, '') ~ '^[0-9]{6}$' then
    select mc.* into v_credentials
    from public.member_credentials mc
    join public.community_members cm on cm.id = mc.member_id and cm.is_active
    join public.member_private mp on mp.member_id = cm.id
    where mc.pin_lookup = private.pin_lookup(p_pin)
      and mp.dni = private.normalize_dni(p_dni)
      and extensions.crypt(p_pin, mc.pin_hash) = mc.pin_hash
    for update of mc;
  end if;

  if v_credentials.member_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', case when private.register_failed_login() then 'locked' else 'invalid_activation' end
    );
  end if;
  if v_credentials.password_hash is not null then
    return jsonb_build_object('ok', false, 'error', 'already_activated');
  end if;

  update public.member_credentials
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      password_set_at = now(), failed_attempts = 0, locked_until = null
  where member_id = v_credentials.member_id;

  perform private.clear_failed_logins();
  perform private.link_session(v_credentials.member_id, 'full');
  return jsonb_build_object('ok', true) || public.get_my_membership();
end;
$$;

-- ---------------------------------------------------------------------------
-- 1b. Acceso completo: DNI + contraseña
-- Bloqueo por vivienda (5 intentos → 15 min) y por sesión.
-- ---------------------------------------------------------------------------
create function public.member_password_sign_in(p_dni text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_match uuid;
  v_member_locked boolean := false;
begin
  perform private.require_anonymous_session();
  if private.session_locked() then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;

  for v_candidate in
    select mc.member_id, mc.password_hash, mc.locked_until
    from public.member_credentials mc
    join public.community_members cm on cm.id = mc.member_id and cm.is_active
    join public.member_private mp on mp.member_id = cm.id
    where mp.dni = private.normalize_dni(p_dni) and mc.password_hash is not null
    order by cm.dwelling_key
    for update of mc
  loop
    if v_candidate.locked_until is not null and v_candidate.locked_until > now() then
      v_member_locked := true;
      continue;
    end if;
    if extensions.crypt(coalesce(p_password, ''), v_candidate.password_hash) = v_candidate.password_hash then
      v_match := v_candidate.member_id;
      exit;
    end if;
    update public.member_credentials
    set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end
    where member_id = v_candidate.member_id;
  end loop;

  if v_match is null then
    return jsonb_build_object(
      'ok', false,
      'error', case when private.register_failed_login() or v_member_locked then 'locked' else 'invalid_credentials' end
    );
  end if;

  update public.member_credentials set failed_attempts = 0, locked_until = null where member_id = v_match;
  perform private.clear_failed_logins();
  perform private.link_session(v_match, 'full');
  return jsonb_build_object('ok', true) || public.get_my_membership();
end;
$$;

create function public.member_change_password(p_current text, p_new text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
  v_hash text;
begin
  if char_length(coalesce(p_new, '')) < 8 or char_length(p_new) > 72 then
    raise exception 'weak_password' using errcode = 'P0001';
  end if;
  select password_hash into v_hash from public.member_credentials where member_id = v_member.id for update;
  if v_hash is null or extensions.crypt(coalesce(p_current, ''), v_hash) <> v_hash then
    raise exception 'wrong_password' using errcode = 'P0001';
  end if;
  update public.member_credentials
  set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)), password_set_at = now()
  where member_id = v_member.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administración: PIN únicos y restablecimiento de la cuenta
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_member(
  p_community_id uuid,
  p_dwelling_label text,
  p_full_name text,
  p_dni text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_pin text := private.generate_unique_pin();
  v_dni text := private.normalize_dni(p_dni);
begin
  perform private.assert_community_admin(p_community_id);
  if not private.is_valid_dni(v_dni) then
    raise exception 'invalid_dni' using errcode = 'P0001';
  end if;

  begin
    insert into public.community_members (community_id, dwelling_label, full_name)
    values (p_community_id, btrim(p_dwelling_label), btrim(p_full_name))
    returning id into v_member_id;
  exception when unique_violation then
    raise exception 'dwelling_taken' using errcode = 'P0001';
  end;

  insert into public.member_private (member_id, dni) values (v_member_id, v_dni);
  insert into public.member_credentials (member_id, pin_hash, pin_lookup)
  values (v_member_id, private.hash_pin(v_pin), private.pin_lookup(v_pin));

  return jsonb_build_object('member_id', v_member_id, 'pin', v_pin);
end;
$$;

-- PIN nuevo: invalida el anterior, borra la contraseña (el vecino la vuelve a crear con el PIN),
-- desbloquea la vivienda y cierra sus sesiones abiertas.
create or replace function public.admin_reset_member_pin(p_member_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pin text := private.generate_unique_pin();
begin
  perform private.assert_community_admin(private.member_community_id(p_member_id));

  update public.member_credentials
  set pin_hash = private.hash_pin(v_pin), pin_lookup = private.pin_lookup(v_pin),
      password_hash = null, password_set_at = null,
      failed_attempts = 0, locked_until = null, pin_updated_at = now()
  where member_id = p_member_id;

  delete from public.member_sessions where member_id = p_member_id;
  return v_pin;
end;
$$;

-- Estado de acceso de cada vivienda (sin exponer hashes).
create function public.admin_member_access_status(p_community_id uuid)
returns table (member_id uuid, has_password boolean, password_set_at timestamptz, locked_until timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.assert_community_admin(p_community_id);
  return query
  select mc.member_id, mc.password_hash is not null, mc.password_set_at,
         case when mc.locked_until > now() then mc.locked_until end
  from public.member_credentials mc
  join public.community_members cm on cm.id = mc.member_id
  where cm.community_id = p_community_id;
end;
$$;

revoke all on function
  public.member_activate(text, text, text),
  public.member_password_sign_in(text, text),
  public.member_change_password(text, text),
  public.admin_member_access_status(uuid)
from public, anon;
grant execute on function
  public.member_activate(text, text, text),
  public.member_password_sign_in(text, text),
  public.member_change_password(text, text),
  public.admin_member_access_status(uuid)
to authenticated;
