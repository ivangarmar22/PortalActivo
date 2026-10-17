-- PortalActivo · Esquema base
-- Comunidades, administradores, censo de viviendas, reuniones, preguntas, opciones y votos.
-- Decisiones del modelo: docs/modelo-datos.md

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Esquema no expuesto por la API (PostgREST solo publica "public").
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.meeting_status as enum ('draft', 'in_progress', 'finished');
create type public.question_status as enum ('draft', 'open', 'closed');
create type public.response_type as enum ('single_choice');

-- ---------------------------------------------------------------------------
-- Utilidades puras
-- ---------------------------------------------------------------------------

-- "3º B", "3ºB", "3-b" → "3b"; "Ático" y "atico" → "atico". Identifica la vivienda al iniciar sesión.
-- translate (y no unaccent) porque la función debe ser IMMUTABLE para la columna generada.
create function private.normalize_dwelling(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(coalesce(p_value, '')), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu'),
    '[^a-z0-9ñ]', '', 'g'
  );
$$;

create function private.normalize_dni(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(upper(coalesce(p_value, '')), '[^0-9A-Z]', '', 'g');
$$;

-- DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) con letra de control válida.
create function private.is_valid_dni(p_value text)
returns boolean
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  v_value text := private.normalize_dni(p_value);
  v_digits text;
begin
  if v_value !~ '^[0-9XYZ][0-9]{7}[A-Z]$' then
    return false;
  end if;
  v_digits := translate(substr(v_value, 1, 8), 'XYZ', '012');
  return substr('TRWAGMYFPDXBNJZSQVHLCKE', (v_digits::bigint % 23)::int + 1, 1) = right(v_value, 1);
end;
$$;

create function private.normalize_name(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent(btrim(coalesce(p_value, '')))), '\s+', ' ', 'g');
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comunidades y administración
-- ---------------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  address text check (address is null or char_length(address) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Autorización de administradores por comunidad. Sin escrituras desde el cliente:
-- el alta se hace con scripts/create-admin.mjs o desde SQL.
create table public.community_admins (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_admins_user_id_idx on public.community_admins (user_id);

-- ---------------------------------------------------------------------------
-- Censo: una fila por vivienda (un voto por vivienda)
-- ---------------------------------------------------------------------------
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  dwelling_label text not null check (char_length(btrim(dwelling_label)) between 1 and 40),
  dwelling_key text generated always as (private.normalize_dwelling(dwelling_label)) stored,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_members_dwelling_key_not_empty check (dwelling_key <> ''),
  constraint community_members_dwelling_unique unique (community_id, dwelling_key)
);
create index community_members_dwelling_key_idx on public.community_members (dwelling_key);

-- Datos personales sensibles separados del censo: solo los ve el administrador.
create table public.member_private (
  member_id uuid primary key references public.community_members (id) on delete cascade,
  dni text not null check (private.is_valid_dni(dni) and dni = private.normalize_dni(dni)),
  updated_at timestamptz not null default now()
);
create index member_private_dni_idx on public.member_private (dni);

-- PIN de acceso (hash bcrypt). Ningún rol de cliente tiene acceso a esta tabla.
create table public.member_credentials (
  member_id uuid primary key references public.community_members (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  pin_updated_at timestamptz not null default now()
);

-- Sesiones (anónimas de Supabase Auth) vinculadas a una vivienda tras validar nombre+DNI+piso+PIN.
create table public.member_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  member_id uuid not null references public.community_members (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index member_sessions_member_id_idx on public.member_sessions (member_id);

-- ---------------------------------------------------------------------------
-- Reuniones, preguntas y opciones
-- ---------------------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text check (description is null or char_length(description) <= 4000),
  meeting_date timestamptz not null,
  minutes_content text check (minutes_content is null or char_length(minutes_content) <= 100000),
  minutes_file_path text,
  minutes_file_name text check (minutes_file_name is null or char_length(minutes_file_name) <= 200),
  status public.meeting_status not null default 'draft',
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_started_consistent check (status = 'draft' or started_at is not null),
  constraint meetings_finished_consistent check (status <> 'finished' or finished_at is not null),
  constraint meetings_minutes_file_consistent
    check ((minutes_file_path is null) = (minutes_file_name is null))
);
create index meetings_community_date_idx on public.meetings (community_id, meeting_date desc);
create index meetings_community_status_idx on public.meetings (community_id, status);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 300),
  description text check (description is null or char_length(description) <= 4000),
  position integer not null check (position >= 1),
  response_type public.response_type not null default 'single_choice',
  status public.question_status not null default 'draft',
  opened_at timestamptz,
  closed_at timestamptz,
  reopen_count integer not null default 0 check (reopen_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_position_unique unique (meeting_id, position) deferrable initially immediate,
  constraint questions_opened_consistent check (status = 'draft' or opened_at is not null),
  constraint questions_closed_consistent check (status <> 'closed' or closed_at is not null)
);
create index questions_meeting_status_idx on public.questions (meeting_id, status);

create table public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 200),
  position integer not null check (position >= 1),
  created_at timestamptz not null default now(),
  constraint answer_options_position_unique unique (question_id, position) deferrable initially immediate,
  -- Destino de la FK compuesta de votes: impide votar una opción de otra pregunta.
  constraint answer_options_question_id_id_unique unique (question_id, id)
);
create unique index answer_options_label_unique on public.answer_options (question_id, lower(btrim(label)));

-- ---------------------------------------------------------------------------
-- Votos (nominales: un voto por vivienda y pregunta, modificable mientras la pregunta esté abierta)
-- ---------------------------------------------------------------------------
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  member_id uuid not null references public.community_members (id),
  option_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint votes_one_per_member unique (question_id, member_id),
  constraint votes_option_belongs_to_question foreign key (question_id, option_id)
    references public.answer_options (question_id, id)
);
create index votes_question_option_idx on public.votes (question_id, option_id);
create index votes_member_id_idx on public.votes (member_id);

-- Historial de cambios de estado (apertura, cierre, reapertura).
create table public.question_status_log (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  from_status public.question_status not null,
  to_status public.question_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index question_status_log_question_idx on public.question_status_log (question_id, changed_at);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger communities_updated_at before update on public.communities
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger community_members_updated_at before update on public.community_members
  for each row execute function private.set_updated_at();
create trigger member_private_updated_at before update on public.member_private
  for each row execute function private.set_updated_at();
create trigger meetings_updated_at before update on public.meetings
  for each row execute function private.set_updated_at();
create trigger questions_updated_at before update on public.questions
  for each row execute function private.set_updated_at();
create trigger votes_updated_at before update on public.votes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reglas de edición (independientes de quién escriba)
--   · Una reunión finalizada es de solo lectura.
--   · Una pregunta solo se edita en borrador; sus opciones también.
-- Las comprobaciones se omiten en borrados en cascada (pg_trigger_depth() > 1).
-- ---------------------------------------------------------------------------
create function private.guard_meeting_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'finished' then
      raise exception 'meeting_finished' using errcode = 'P0001';
    end if;
    if new.community_id <> old.community_id then
      raise exception 'meeting_community_immutable' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' and pg_trigger_depth() = 1 and old.status <> 'draft' then
    raise exception 'meeting_not_draft' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger meetings_guard before update or delete on public.meetings
  for each row execute function private.guard_meeting_write();

create function private.guard_question_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_meeting_id uuid := coalesce(new.meeting_id, old.meeting_id);
  v_meeting_status public.meeting_status;
begin
  if pg_trigger_depth() > 1 and tg_op = 'DELETE' then
    return old;
  end if;

  select status into v_meeting_status from public.meetings where id = v_meeting_id;
  if v_meeting_status = 'finished' then
    raise exception 'meeting_finished' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'question_must_start_as_draft' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.meeting_id <> old.meeting_id then
      raise exception 'question_meeting_immutable' using errcode = 'P0001';
    end if;
    if old.status <> 'draft' and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.response_type is distinct from old.response_type
    ) then
      raise exception 'question_locked' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.status <> 'draft' then
    raise exception 'question_locked' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger questions_guard before insert or update or delete on public.questions
  for each row execute function private.guard_question_write();

create function private.guard_option_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.question_status;
begin
  if pg_trigger_depth() > 1 and tg_op = 'DELETE' then
    return old;
  end if;

  select status into v_status from public.questions where id = coalesce(new.question_id, old.question_id);
  if v_status is distinct from 'draft' then
    raise exception 'question_locked' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.question_id <> old.question_id then
    raise exception 'option_question_immutable' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger answer_options_guard before insert or update or delete on public.answer_options
  for each row execute function private.guard_option_write();
