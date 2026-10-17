-- PortalActivo · Reservas de zonas comunes
-- Decisión aprobada: franjas fijas por espacio, confirmación automática, máximo de reservas futuras
-- por vivienda (2 por defecto) y cancelación con antelación mínima (24 h por defecto).
-- Los vecinos ven «Ocupado» sin saber quién reservó; la administración ve la vivienda.
-- Las dobles reservas son imposibles: restricción EXCLUDE sobre el rango horario de cada espacio.

create extension if not exists btree_gist with schema extensions;

create table public.common_spaces (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 1000),
  rules text check (rules is null or char_length(rules) <= 2000),
  max_future_per_member integer not null default 2 check (max_future_per_member between 1 and 10),
  cancel_notice_hours integer not null default 24 check (cancel_notice_hours between 0 and 168),
  booking_window_days integer not null default 30 check (booking_window_days between 1 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint common_spaces_name_unique unique (community_id, name)
);

create table public.space_slots (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.common_spaces (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  start_time time not null,
  -- Si end_time <= start_time, la franja termina al día siguiente (p. ej. 20:00–00:00).
  end_time time not null,
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(weekdays) >= 1 and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[]),
  position integer not null default 1,
  is_active boolean not null default true,
  constraint space_slots_distinct_times check (start_time <> end_time)
);
create index space_slots_space_idx on public.space_slots (space_id, position);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  space_id uuid not null references public.common_spaces (id) on delete cascade,
  slot_id uuid references public.space_slots (id) on delete set null,
  slot_label text not null,
  member_id uuid not null references public.community_members (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('member', 'admin')),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  constraint reservations_valid_range check (ends_at > starts_at),
  constraint reservations_cancel_consistent check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint reservations_no_overlap exclude using gist (
    space_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);
create index reservations_member_idx on public.reservations (member_id, starts_at);
create index reservations_space_idx on public.reservations (space_id, starts_at);

create trigger common_spaces_updated_at before update on public.common_spaces
  for each row execute function private.set_updated_at();

create function private.space_community_id(p_space_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select community_id from public.common_spaces where id = p_space_id;
$$;
revoke all on function private.space_community_id(uuid) from public;
grant execute on function private.space_community_id(uuid) to authenticated;

-- Inicio y fin reales (zona horaria de España) de una franja en un día concreto.
create function private.slot_range(p_day date, p_start time, p_end time, out o_starts timestamptz, out o_ends timestamptz)
language sql
stable
set search_path = ''
as $$
  select (p_day + p_start) at time zone 'Europe/Madrid',
         ((case when p_end <= p_start then p_day + 1 else p_day end) + p_end) at time zone 'Europe/Madrid';
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on public.common_spaces, public.space_slots, public.reservations from anon, authenticated;
grant select on public.common_spaces, public.space_slots, public.reservations to authenticated;
alter table public.common_spaces enable row level security;
alter table public.space_slots enable row level security;
alter table public.reservations enable row level security;

create policy common_spaces_select on public.common_spaces
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or (is_active and private.is_full_member(community_id))
  );

create policy space_slots_select on public.space_slots
  for select to authenticated
  using (
    private.is_community_admin(private.space_community_id(space_id))
    or private.is_full_member(private.space_community_id(space_id))
  );

-- Cada vivienda ve solo sus reservas; la ocupación ajena se consulta con get_space_availability.
create policy reservations_select on public.reservations
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or member_id = private.full_member_id(community_id)
  );

alter publication supabase_realtime add table public.reservations;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Disponibilidad de un espacio: libre / ocupado / mía / pasada. Nunca revela qué vivienda reservó.
create function public.get_space_availability(p_space_id uuid, p_from date, p_days integer default 14)
returns table (
  slot_id uuid,
  slot_label text,
  day date,
  starts_at timestamptz,
  ends_at timestamptz,
  state text,
  my_reservation_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_space public.common_spaces;
  v_member_id uuid;
begin
  select * into v_space from public.common_spaces where id = p_space_id;
  if not found
     or not (private.is_community_admin(v_space.community_id) or private.is_full_member(v_space.community_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_member_id := private.full_member_id(v_space.community_id);

  return query
  with days as (
    select d::date as day
    from generate_series(p_from, p_from + least(greatest(p_days, 1), 62) - 1, interval '1 day') d
  ),
  candidates as (
    select s.id as slot_id, s.label, s.position, days.day, r.o_starts, r.o_ends
    from public.space_slots s
    cross join days
    cross join lateral private.slot_range(days.day, s.start_time, s.end_time) r
    where s.space_id = p_space_id
      and s.is_active
      and extract(isodow from days.day)::smallint = any (s.weekdays)
  )
  select
    c.slot_id, c.label, c.day, c.o_starts, c.o_ends,
    case
      when mine.id is not null then 'mine'
      when c.o_starts <= now() then 'past'
      when taken.id is not null then 'taken'
      when c.day > (now() at time zone 'Europe/Madrid')::date + v_space.booking_window_days then 'closed'
      else 'free'
    end,
    mine.id
  from candidates c
  left join lateral (
    select r.id from public.reservations r
    where r.space_id = p_space_id and r.status = 'confirmed'
      and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(c.o_starts, c.o_ends, '[)')
    limit 1
  ) taken on true
  left join lateral (
    select r.id from public.reservations r
    where r.space_id = p_space_id and r.status = 'confirmed' and r.member_id = v_member_id
      and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(c.o_starts, c.o_ends, '[)')
    limit 1
  ) mine on true
  order by c.day, c.position, c.o_starts;
end;
$$;

create function public.member_book_slot(p_slot_id uuid, p_day date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
  v_slot public.space_slots;
  v_space public.common_spaces;
  v_starts timestamptz;
  v_ends timestamptz;
  v_future integer;
  v_id uuid;
begin
  select * into v_slot from public.space_slots where id = p_slot_id;
  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;
  select * into v_space from public.common_spaces where id = v_slot.space_id;
  if v_space.community_id <> v_member.community_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_space.is_active or not v_slot.is_active
     or not (extract(isodow from p_day)::smallint = any (v_slot.weekdays)) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  select o_starts, o_ends into v_starts, v_ends from private.slot_range(p_day, v_slot.start_time, v_slot.end_time);
  if v_starts <= now() then
    raise exception 'slot_in_past' using errcode = 'P0001';
  end if;
  if p_day > (now() at time zone 'Europe/Madrid')::date + v_space.booking_window_days then
    raise exception 'slot_too_far' using errcode = 'P0001';
  end if;

  -- Orden de bloqueo fijo (espacio → vivienda):
  --  · el espacio serializa las reservas que compiten por él; sin esto, dos inserciones simultáneas
  --    que chocan en la restricción EXCLUDE pueden acabar en interbloqueo (comprobado en pruebas)
  --    en lugar de devolver «slot_taken»;
  --  · la vivienda serializa sus propias reservas para que el límite no se pueda saltar en paralelo.
  perform 1 from public.common_spaces where id = v_space.id for no key update;
  perform 1 from public.community_members where id = v_member.id for update;
  select count(*) into v_future
  from public.reservations
  where member_id = v_member.id and space_id = v_space.id and status = 'confirmed' and ends_at > now();
  if v_future >= v_space.max_future_per_member then
    raise exception 'reservation_limit' using errcode = 'P0001';
  end if;

  begin
    insert into public.reservations (community_id, space_id, slot_id, slot_label, member_id, starts_at, ends_at)
    values (v_space.community_id, v_space.id, v_slot.id, v_slot.label, v_member.id, v_starts, v_ends)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create function public.member_cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
  v_reservation public.reservations;
  v_notice integer;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if not found or v_reservation.member_id <> v_member.id then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;
  if v_reservation.status <> 'confirmed' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;
  select cancel_notice_hours into v_notice from public.common_spaces where id = v_reservation.space_id;
  if v_reservation.starts_at - now() < make_interval(hours => v_notice) then
    raise exception 'cancel_too_late' using errcode = 'P0001';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'member'
  where id = p_reservation_id;
end;
$$;

create function public.admin_cancel_reservation(p_reservation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_community_admin(v_reservation.community_id);
  if v_reservation.status <> 'confirmed' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin',
      cancel_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_reservation_id;
end;
$$;

-- Crea o edita un espacio y sus franjas en una sola transacción.
-- p_slots: [{ "id"?: uuid, "label": text, "start": "HH:MM", "end": "HH:MM", "weekdays": [1..7] }]
create function public.admin_save_space(
  p_community_id uuid,
  p_space_id uuid,
  p_name text,
  p_description text,
  p_rules text,
  p_max_future integer,
  p_cancel_hours integer,
  p_window_days integer,
  p_is_active boolean,
  p_slots jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid := p_space_id;
  v_keep uuid[];
  v_slot jsonb;
  v_position integer := 0;
begin
  perform private.assert_community_admin(p_community_id);
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 then
    raise exception 'invalid_slots' using errcode = 'P0001';
  end if;

  begin
    if v_space_id is null then
      insert into public.common_spaces (
        community_id, name, description, rules, max_future_per_member, cancel_notice_hours,
        booking_window_days, is_active
      ) values (
        p_community_id, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''),
        nullif(btrim(coalesce(p_rules, '')), ''), p_max_future, p_cancel_hours, p_window_days, p_is_active
      )
      returning id into v_space_id;
    else
      update public.common_spaces
      set name = btrim(p_name), description = nullif(btrim(coalesce(p_description, '')), ''),
          rules = nullif(btrim(coalesce(p_rules, '')), ''), max_future_per_member = p_max_future,
          cancel_notice_hours = p_cancel_hours, booking_window_days = p_window_days, is_active = p_is_active
      where id = v_space_id and community_id = p_community_id;
      if not found then
        raise exception 'space_not_found' using errcode = 'P0002';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'space_name_taken' using errcode = 'P0001';
  end;

  select coalesce(array_agg((s ->> 'id')::uuid), '{}')
  into v_keep
  from jsonb_array_elements(p_slots) s
  where s ? 'id' and s ->> 'id' is not null;

  delete from public.space_slots where space_id = v_space_id and not (id = any (v_keep));

  for v_slot in select * from jsonb_array_elements(p_slots) loop
    v_position := v_position + 1;
    if v_slot ? 'id' and v_slot ->> 'id' is not null then
      update public.space_slots
      set label = btrim(v_slot ->> 'label'), start_time = (v_slot ->> 'start')::time,
          end_time = (v_slot ->> 'end')::time,
          weekdays = array(select jsonb_array_elements_text(v_slot -> 'weekdays')::smallint),
          position = v_position, is_active = true
      where id = (v_slot ->> 'id')::uuid and space_id = v_space_id;
    else
      insert into public.space_slots (space_id, label, start_time, end_time, weekdays, position)
      values (
        v_space_id, btrim(v_slot ->> 'label'), (v_slot ->> 'start')::time, (v_slot ->> 'end')::time,
        array(select jsonb_array_elements_text(v_slot -> 'weekdays')::smallint), v_position
      );
    end if;
  end loop;

  return v_space_id;
end;
$$;

revoke all on function
  public.get_space_availability(uuid, date, integer),
  public.member_book_slot(uuid, date),
  public.member_cancel_reservation(uuid),
  public.admin_cancel_reservation(uuid, text),
  public.admin_save_space(uuid, uuid, text, text, text, integer, integer, integer, boolean, jsonb)
from public, anon;
grant execute on function
  public.get_space_availability(uuid, date, integer),
  public.member_book_slot(uuid, date),
  public.member_cancel_reservation(uuid),
  public.admin_cancel_reservation(uuid, text),
  public.admin_save_space(uuid, uuid, text, text, text, integer, integer, integer, boolean, jsonb)
to authenticated;
