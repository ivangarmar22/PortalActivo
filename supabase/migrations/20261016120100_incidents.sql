-- PortalActivo · Incidencias de zonas comunes
-- Decisión aprobada: los vecinos las reportan y TODA la comunidad ve cada incidencia y la vivienda
-- que la abrió. La administración gestiona estado y responsable; cada cambio queda en el historial.

create type public.incident_status as enum ('reported', 'in_review', 'in_progress', 'resolved', 'dismissed');
create type public.incident_responsible as enum ('administration', 'developer', 'company', 'insurance');
create type public.incident_category as enum (
  'electricity', 'plumbing', 'elevator', 'cleaning', 'gardening', 'security', 'structure', 'other'
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  reported_by_member uuid references public.community_members (id) on delete set null,
  -- Copia de la vivienda en el momento del aviso (null = abierta por la administración).
  reported_dwelling text check (reported_dwelling is null or char_length(reported_dwelling) <= 40),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  location text check (location is null or char_length(location) <= 120),
  category public.incident_category not null default 'other',
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),
  status public.incident_status not null default 'reported',
  responsible_type public.incident_responsible,
  responsible_name text check (responsible_name is null or char_length(responsible_name) <= 120),
  estimated_resolution date,
  resolved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incidents_resolved_consistent check ((status = 'resolved') = (resolved_at is not null))
);
create index incidents_community_status_idx on public.incidents (community_id, status, created_at desc);

create table public.incident_updates (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  message text check (message is null or char_length(message) <= 2000),
  status public.incident_status,
  responsible_type public.incident_responsible,
  responsible_name text,
  author_label text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index incident_updates_incident_idx on public.incident_updates (incident_id, created_at);

create trigger incidents_updated_at before update on public.incidents
  for each row execute function private.set_updated_at();

create function private.incident_community_id(p_incident_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select community_id from public.incidents where id = p_incident_id;
$$;
revoke all on function private.incident_community_id(uuid) from public;
grant execute on function private.incident_community_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos: solo lectura desde el cliente; escrituras por RPC
-- ---------------------------------------------------------------------------
revoke all on public.incidents, public.incident_updates from anon, authenticated;
grant select on public.incidents, public.incident_updates to authenticated;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;

create policy incidents_select on public.incidents
  for select to authenticated
  using (private.is_community_admin(community_id) or private.is_full_member(community_id));

create policy incident_updates_select on public.incident_updates
  for select to authenticated
  using (
    private.is_community_admin(private.incident_community_id(incident_id))
    or private.is_full_member(private.incident_community_id(incident_id))
  );

alter publication supabase_realtime add table public.incidents, public.incident_updates;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
create function public.member_report_incident(
  p_title text,
  p_description text,
  p_location text,
  p_category public.incident_category,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
  v_id uuid;
begin
  if p_photo_path is not null and p_photo_path not like v_member.community_id::text || '/incidents/%' then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;

  insert into public.incidents (
    community_id, reported_by_member, reported_dwelling, title, description, location, category,
    photo_path, created_by
  ) values (
    v_member.community_id, v_member.id, v_member.dwelling_label, btrim(p_title),
    btrim(coalesce(p_description, '')), nullif(btrim(coalesce(p_location, '')), ''), p_category,
    p_photo_path, (select auth.uid())
  )
  returning id into v_id;

  insert into public.incident_updates (incident_id, status, message, author_label, created_by)
  values (v_id, 'reported', 'Incidencia registrada.', 'Vivienda ' || v_member.dwelling_label, (select auth.uid()));

  return v_id;
end;
$$;

create function public.admin_create_incident(
  p_community_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_category public.incident_category,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.assert_community_admin(p_community_id);
  if p_photo_path is not null and p_photo_path not like p_community_id::text || '/incidents/%' then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;

  insert into public.incidents (community_id, title, description, location, category, photo_path, created_by)
  values (
    p_community_id, btrim(p_title), btrim(coalesce(p_description, '')),
    nullif(btrim(coalesce(p_location, '')), ''), p_category, p_photo_path, (select auth.uid())
  )
  returning id into v_id;

  insert into public.incident_updates (incident_id, status, message, author_label, created_by)
  values (v_id, 'reported', 'Incidencia registrada por la administración.', 'Administración', (select auth.uid()));
  return v_id;
end;
$$;

-- Cambia estado y/o responsable y deja constancia en el historial en la misma transacción.
create function public.admin_update_incident(
  p_incident_id uuid,
  p_status public.incident_status,
  p_responsible_type public.incident_responsible,
  p_responsible_name text,
  p_estimated_resolution date,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incident public.incidents;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_name text := nullif(btrim(coalesce(p_responsible_name, '')), '');
  v_status_changed boolean;
  v_responsible_changed boolean;
begin
  select * into v_incident from public.incidents where id = p_incident_id for update;
  if not found then
    raise exception 'incident_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_community_admin(v_incident.community_id);

  if p_responsible_type is null then
    v_name := null;
  end if;
  v_status_changed := p_status is distinct from v_incident.status;
  v_responsible_changed := p_responsible_type is distinct from v_incident.responsible_type
    or v_name is distinct from v_incident.responsible_name;

  if not v_status_changed and not v_responsible_changed and v_message is null
     and p_estimated_resolution is not distinct from v_incident.estimated_resolution then
    raise exception 'nothing_to_update' using errcode = 'P0001';
  end if;

  update public.incidents
  set status = p_status,
      responsible_type = p_responsible_type,
      responsible_name = v_name,
      estimated_resolution = p_estimated_resolution,
      resolved_at = case when p_status = 'resolved' then coalesce(resolved_at, now()) end
  where id = p_incident_id;

  if v_status_changed or v_responsible_changed or v_message is not null then
    insert into public.incident_updates (
      incident_id, message, status, responsible_type, responsible_name, author_label, created_by
    ) values (
      p_incident_id, v_message,
      case when v_status_changed then p_status end,
      case when v_responsible_changed then p_responsible_type end,
      case when v_responsible_changed then v_name end,
      'Administración', (select auth.uid())
    );
  end if;
end;
$$;

revoke all on function
  public.member_report_incident(text, text, text, public.incident_category, text),
  public.admin_create_incident(uuid, text, text, text, public.incident_category, text),
  public.admin_update_incident(uuid, public.incident_status, public.incident_responsible, text, date, text)
from public, anon;
grant execute on function
  public.member_report_incident(text, text, text, public.incident_category, text),
  public.admin_create_incident(uuid, text, text, text, public.incident_category, text),
  public.admin_update_incident(uuid, public.incident_status, public.incident_responsible, text, date, text)
to authenticated;
