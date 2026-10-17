-- PortalActivo · Operaciones críticas (RPC)
-- Todas las funciones son SECURITY DEFINER con search_path vacío, comprueban la autorización
-- al principio y se ejecutan en una única transacción. Solo el rol "authenticated" puede llamarlas.
-- Los errores de negocio se lanzan como P0001 con un código en el mensaje (ver src/lib/errors.ts).

-- ---------------------------------------------------------------------------
-- Auxiliares internas
-- ---------------------------------------------------------------------------
create function private.generate_pin()
returns text
language sql
volatile
set search_path = ''
as $$
  select lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
$$;

create function private.hash_pin(p_pin text)
returns text
language sql
volatile
set search_path = ''
as $$
  select extensions.crypt(p_pin, extensions.gen_salt('bf', 8));
$$;

create function private.log_question_status(
  p_question_id uuid,
  p_from public.question_status,
  p_to public.question_status
)
returns void
language sql
set search_path = ''
as $$
  insert into public.question_status_log (question_id, from_status, to_status, changed_by)
  values (p_question_id, p_from, p_to, (select auth.uid()));
$$;

create function private.assert_community_admin(p_community_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_community_id is null or not private.is_community_admin(p_community_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Bloquea la reunión (evita carreras entre operaciones administrativas) y comprueba permisos.
create function private.lock_meeting_for_admin(p_meeting_id uuid)
returns public.meetings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings;
begin
  select * into v_meeting from public.meetings where id = p_meeting_id for no key update;
  if not found then
    raise exception 'meeting_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_community_admin(v_meeting.community_id);
  return v_meeting;
end;
$$;

revoke all on all functions in schema private from public;

-- ---------------------------------------------------------------------------
-- Acceso de propietarios: nombre + DNI + vivienda + PIN sobre una sesión anónima
-- ---------------------------------------------------------------------------
create function public.member_sign_in(
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
  v_uid uuid := auth.uid();
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_dni text := private.normalize_dni(p_dni);
  v_key text := private.normalize_dwelling(p_dwelling);
  v_name text := private.normalize_name(p_full_name);
  v_candidate record;
  v_match_id uuid;
  v_locked boolean := false;
  v_max_attempts constant integer := 5;
begin
  if v_uid is null or not v_is_anonymous then
    raise exception 'anonymous_session_required' using errcode = 'P0001';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or v_key = '' or v_name = '' or not private.is_valid_dni(v_dni) then
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  for v_candidate in
    select cm.id, cm.full_name, mc.pin_hash, mc.locked_until
    from public.community_members cm
    join public.member_private mp on mp.member_id = cm.id
    join public.member_credentials mc on mc.member_id = cm.id
    where cm.dwelling_key = v_key and mp.dni = v_dni and cm.is_active
    for update of mc
  loop
    if v_candidate.locked_until is not null and v_candidate.locked_until > now() then
      v_locked := true;
      continue;
    end if;

    if private.normalize_name(v_candidate.full_name) = v_name
       and extensions.crypt(p_pin, v_candidate.pin_hash) = v_candidate.pin_hash then
      v_match_id := v_candidate.id;
      exit;
    end if;

    update public.member_credentials
    set failed_attempts = case when failed_attempts + 1 >= v_max_attempts then 0 else failed_attempts + 1 end,
        locked_until = case when failed_attempts + 1 >= v_max_attempts then now() + interval '15 minutes' end
    where member_id = v_candidate.id;
  end loop;

  if v_match_id is null then
    return jsonb_build_object('ok', false, 'error', case when v_locked then 'locked' else 'invalid_credentials' end);
  end if;

  update public.member_credentials
  set failed_attempts = 0, locked_until = null
  where member_id = v_match_id;

  insert into public.member_sessions (user_id, member_id)
  values (v_uid, v_match_id)
  on conflict (user_id) do update set member_id = excluded.member_id, created_at = now();

  return jsonb_build_object('ok', true) || public.get_my_membership();
end;
$$;

create function public.get_my_membership()
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
    'dwelling_label', cm.dwelling_label,
    'full_name', cm.full_name
  )
  from public.member_sessions ms
  join public.community_members cm on cm.id = ms.member_id and cm.is_active
  join public.communities c on c.id = cm.community_id
  where ms.user_id = (select auth.uid());
$$;

create function public.member_sign_out()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.member_sessions where user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Censo (solo administradores). El PIN en claro solo se devuelve al crearlo o regenerarlo.
-- ---------------------------------------------------------------------------
create function public.admin_create_member(
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
  v_pin text := private.generate_pin();
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
  insert into public.member_credentials (member_id, pin_hash) values (v_member_id, private.hash_pin(v_pin));

  return jsonb_build_object('member_id', v_member_id, 'pin', v_pin);
end;
$$;

create function public.admin_update_member(
  p_member_id uuid,
  p_dwelling_label text,
  p_full_name text,
  p_dni text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dni text := private.normalize_dni(p_dni);
begin
  perform private.assert_community_admin(private.member_community_id(p_member_id));
  if not private.is_valid_dni(v_dni) then
    raise exception 'invalid_dni' using errcode = 'P0001';
  end if;

  begin
    update public.community_members
    set dwelling_label = btrim(p_dwelling_label), full_name = btrim(p_full_name), is_active = p_is_active
    where id = p_member_id;
  exception when unique_violation then
    raise exception 'dwelling_taken' using errcode = 'P0001';
  end;

  update public.member_private set dni = v_dni where member_id = p_member_id and dni <> v_dni;

  if not p_is_active then
    delete from public.member_sessions where member_id = p_member_id;
  end if;
end;
$$;

-- Genera un PIN nuevo, desbloquea la cuenta y cierra las sesiones abiertas de esa vivienda.
create function public.admin_reset_member_pin(p_member_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pin text := private.generate_pin();
begin
  perform private.assert_community_admin(private.member_community_id(p_member_id));

  update public.member_credentials
  set pin_hash = private.hash_pin(v_pin), failed_attempts = 0, locked_until = null, pin_updated_at = now()
  where member_id = p_member_id;

  delete from public.member_sessions where member_id = p_member_id;
  return v_pin;
end;
$$;

-- ---------------------------------------------------------------------------
-- Preguntas y opciones (solo en borrador; los triggers lo garantizan también)
-- ---------------------------------------------------------------------------
create function public.admin_save_question(
  p_meeting_id uuid,
  p_title text,
  p_description text,
  p_options text[],
  p_question_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
  v_question_id uuid := p_question_id;
  v_status public.question_status;
  v_options text[];
begin
  if v_meeting.status = 'finished' then
    raise exception 'meeting_finished' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(btrim(o) order by ord), '{}')
  into v_options
  from unnest(coalesce(p_options, '{}')) with ordinality as t(o, ord)
  where btrim(o) <> '';

  if cardinality(v_options) < 2 or cardinality(v_options) > 10
     or (select count(distinct lower(o)) from unnest(v_options) o) <> cardinality(v_options) then
    raise exception 'invalid_options' using errcode = 'P0001';
  end if;

  if v_question_id is null then
    insert into public.questions (meeting_id, title, description, position)
    values (
      p_meeting_id,
      btrim(p_title),
      nullif(btrim(coalesce(p_description, '')), ''),
      coalesce((select max(position) from public.questions where meeting_id = p_meeting_id), 0) + 1
    )
    returning id into v_question_id;
  else
    select status into v_status
    from public.questions
    where id = v_question_id and meeting_id = p_meeting_id
    for update;
    if not found then
      raise exception 'question_not_found' using errcode = 'P0002';
    end if;
    if v_status <> 'draft' then
      raise exception 'question_locked' using errcode = 'P0001';
    end if;

    update public.questions
    set title = btrim(p_title), description = nullif(btrim(coalesce(p_description, '')), '')
    where id = v_question_id;

    delete from public.answer_options where question_id = v_question_id;
  end if;

  insert into public.answer_options (question_id, label, position)
  select v_question_id, o, ord::integer
  from unnest(v_options) with ordinality as t(o, ord);

  return v_question_id;
end;
$$;

create function public.admin_delete_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting_id uuid;
begin
  select meeting_id into v_meeting_id from public.questions where id = p_question_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;
  perform private.lock_meeting_for_admin(v_meeting_id);

  delete from public.questions where id = p_question_id;

  update public.questions q
  set position = s.rn
  from (
    select id, row_number() over (order by position)::integer as rn
    from public.questions where meeting_id = v_meeting_id
  ) s
  where q.id = s.id and q.position <> s.rn;
end;
$$;

create function public.admin_reorder_questions(p_meeting_id uuid, p_question_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
begin
  if v_meeting.status = 'finished' then
    raise exception 'meeting_finished' using errcode = 'P0001';
  end if;

  if (select array_agg(id order by id) from public.questions where meeting_id = p_meeting_id)
     is distinct from (select array_agg(x order by x) from unnest(p_question_ids) x) then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  update public.questions q
  set position = t.ord::integer
  from unnest(p_question_ids) with ordinality as t(id, ord)
  where q.id = t.id and q.position <> t.ord;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estados de la reunión
-- ---------------------------------------------------------------------------
create function public.start_meeting(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
begin
  if v_meeting.status <> 'draft' then
    raise exception 'meeting_not_draft' using errcode = 'P0001';
  end if;
  -- Abrir la reunión NO abre ninguna pregunta.
  update public.meetings set status = 'in_progress', started_at = now() where id = p_meeting_id;
end;
$$;

-- Cierra las preguntas abiertas y finaliza la reunión. Devuelve cuántas preguntas se cerraron.
create function public.finish_meeting(p_meeting_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
  v_closed integer;
begin
  if v_meeting.status <> 'in_progress' then
    raise exception 'meeting_not_in_progress' using errcode = 'P0001';
  end if;

  v_closed := public.close_open_questions(p_meeting_id);
  update public.meetings set status = 'finished', finished_at = now() where id = p_meeting_id;
  return v_closed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estados de las preguntas: individual
-- ---------------------------------------------------------------------------
create function private.lock_question_for_admin(p_question_id uuid, out o_status public.question_status, out o_meeting_status public.meeting_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting_id uuid;
begin
  select meeting_id into v_meeting_id from public.questions where id = p_question_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;
  -- Orden de bloqueo fijo (reunión → pregunta) para no provocar interbloqueos con las operaciones globales.
  o_meeting_status := (private.lock_meeting_for_admin(v_meeting_id)).status;
  select status into o_status from public.questions where id = p_question_id for no key update;
end;
$$;

revoke all on function private.lock_question_for_admin(uuid) from public;

create function public.open_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from private.lock_question_for_admin(p_question_id);
  if v.o_meeting_status <> 'in_progress' then
    raise exception 'meeting_not_in_progress' using errcode = 'P0001';
  end if;
  if v.o_status <> 'draft' then
    raise exception 'question_not_draft' using errcode = 'P0001';
  end if;
  if (select count(*) from public.answer_options where question_id = p_question_id) < 2 then
    raise exception 'question_needs_options' using errcode = 'P0001';
  end if;

  update public.questions set status = 'open', opened_at = now() where id = p_question_id;
  perform private.log_question_status(p_question_id, 'draft', 'open');
end;
$$;

create function public.close_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from private.lock_question_for_admin(p_question_id);
  if v.o_status <> 'open' then
    raise exception 'question_not_open' using errcode = 'P0001';
  end if;

  update public.questions set status = 'closed', closed_at = now() where id = p_question_id;
  perform private.log_question_status(p_question_id, 'open', 'closed');
end;
$$;

-- Reabre una pregunta cerrada conservando los votos: todos pueden votar o cambiar su voto.
create function public.reopen_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from private.lock_question_for_admin(p_question_id);
  if v.o_meeting_status <> 'in_progress' then
    raise exception 'meeting_not_in_progress' using errcode = 'P0001';
  end if;
  if v.o_status <> 'closed' then
    raise exception 'question_not_closed' using errcode = 'P0001';
  end if;

  update public.questions
  set status = 'open', closed_at = null, reopen_count = reopen_count + 1
  where id = p_question_id;
  perform private.log_question_status(p_question_id, 'closed', 'open');
end;
$$;

-- ---------------------------------------------------------------------------
-- Estados de las preguntas: global (transaccional)
-- Elegibles para abrir: en borrador y con al menos dos opciones. Las cerradas no se tocan.
-- ---------------------------------------------------------------------------
create function public.open_eligible_questions(p_meeting_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
  v_count integer;
begin
  if v_meeting.status <> 'in_progress' then
    raise exception 'meeting_not_in_progress' using errcode = 'P0001';
  end if;

  with opened as (
    update public.questions q
    set status = 'open', opened_at = now()
    where q.meeting_id = p_meeting_id
      and q.status = 'draft'
      and (select count(*) from public.answer_options o where o.question_id = q.id) >= 2
    returning q.id
  ), logged as (
    insert into public.question_status_log (question_id, from_status, to_status, changed_by)
    select id, 'draft', 'open', (select auth.uid()) from opened
    returning 1
  )
  select count(*) into v_count from logged;

  return v_count;
end;
$$;

create function public.close_open_questions(p_meeting_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings := private.lock_meeting_for_admin(p_meeting_id);
  v_count integer;
begin
  if v_meeting.status <> 'in_progress' then
    raise exception 'meeting_not_in_progress' using errcode = 'P0001';
  end if;

  with closed as (
    update public.questions q
    set status = 'closed', closed_at = now()
    where q.meeting_id = p_meeting_id and q.status = 'open'
    returning q.id
  ), logged as (
    insert into public.question_status_log (question_id, from_status, to_status, changed_by)
    select id, 'open', 'closed', (select auth.uid()) from closed
    returning 1
  )
  select count(*) into v_count from logged;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Votación
-- El bloqueo FOR SHARE sobre la pregunta serializa el voto con el cierre (UPDATE): si el cierre
-- llega antes, el voto ve la pregunta cerrada; si el voto llega antes, el cierre espera a que termine.
-- La restricción UNIQUE (question_id, member_id) garantiza un voto por vivienda; si ya existe,
-- se sustituye la opción (el voto se puede modificar mientras la pregunta esté abierta).
-- ---------------------------------------------------------------------------
create function public.cast_vote(p_question_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.question_status;
  v_community_id uuid;
  v_member_id uuid;
  v_vote_id uuid;
  v_changed boolean;
begin
  select q.status, m.community_id
  into v_status, v_community_id
  from public.questions q
  join public.meetings m on m.id = q.meeting_id
  where q.id = p_question_id
  for share of q;

  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;

  v_member_id := private.current_member_id(v_community_id);
  if v_member_id is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  if v_status <> 'open' then
    raise exception 'question_not_open' using errcode = 'P0001';
  end if;

  begin
    insert into public.votes (question_id, member_id, option_id)
    values (p_question_id, v_member_id, p_option_id)
    on conflict (question_id, member_id) do update set option_id = excluded.option_id
    returning id, (xmax <> 0) into v_vote_id, v_changed;
  exception when foreign_key_violation then
    raise exception 'invalid_option' using errcode = 'P0001';
  end;

  return jsonb_build_object('vote_id', v_vote_id, 'changed', v_changed);
end;
$$;

-- ---------------------------------------------------------------------------
-- Resultados
-- Administrador: todas las preguntas abiertas o cerradas (en vivo).
-- Propietario: solo preguntas cerradas de su comunidad.
-- Porcentaje por opción = votos de la opción / votos emitidos en la pregunta (null si no hay votos).
-- Participación = votos emitidos / viviendas activas del censo.
-- ---------------------------------------------------------------------------
create function public.get_meeting_results(p_meeting_id uuid)
returns table (
  question_id uuid,
  question_position integer,
  question_title text,
  question_status public.question_status,
  question_opened_at timestamptz,
  question_closed_at timestamptz,
  option_id uuid,
  option_position integer,
  option_label text,
  vote_count integer,
  total_votes integer,
  eligible_members integer,
  percentage numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_community_id uuid;
  v_is_admin boolean;
begin
  select m.community_id into v_community_id from public.meetings m where m.id = p_meeting_id;
  if v_community_id is null or not private.can_read_meeting(p_meeting_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_is_admin := private.is_community_admin(v_community_id);

  return query
  with eligible as (
    select count(*)::integer as n
    from public.community_members cm
    where cm.community_id = v_community_id and cm.is_active
  ),
  visible_questions as (
    select q.*
    from public.questions q
    where q.meeting_id = p_meeting_id
      and q.status <> 'draft'
      and (v_is_admin or q.status = 'closed')
  ),
  per_option as (
    select o.question_id, o.id as option_id, count(v.id)::integer as n
    from public.answer_options o
    join visible_questions vq on vq.id = o.question_id
    left join public.votes v on v.question_id = o.question_id and v.option_id = o.id
    group by o.question_id, o.id
  ),
  per_question as (
    select po.question_id, sum(po.n)::integer as n from per_option po group by po.question_id
  )
  select
    vq.id, vq.position, vq.title, vq.status, vq.opened_at, vq.closed_at,
    o.id, o.position, o.label,
    po.n, pq.n, e.n,
    case when pq.n = 0 then null else round(100.0 * po.n / pq.n, 1) end
  from visible_questions vq
  join public.answer_options o on o.question_id = vq.id
  join per_option po on po.option_id = o.id
  join per_question pq on pq.question_id = vq.id
  cross join eligible e
  order by vq.position, o.position;
end;
$$;

-- Detalle nominal (solo administradores): quién votó qué. Para la vista de detalle y el CSV.
create function public.admin_meeting_votes(p_meeting_id uuid)
returns table (
  question_id uuid,
  question_position integer,
  question_title text,
  dwelling_label text,
  full_name text,
  option_label text,
  voted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.can_admin_meeting(p_meeting_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select q.id, q.position, q.title, cm.dwelling_label, cm.full_name, o.label, v.created_at, v.updated_at
  from public.votes v
  join public.questions q on q.id = v.question_id
  join public.answer_options o on o.id = v.option_id
  join public.community_members cm on cm.id = v.member_id
  where q.meeting_id = p_meeting_id
  order by q.position, cm.dwelling_key;
end;
$$;

-- Indicadores del panel de administración.
create function public.admin_dashboard(p_community_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_community_admin(p_community_id);

  with ms as (
    select * from public.meetings where community_id = p_community_id
  ),
  qs as (
    select q.* from public.questions q join ms on ms.id = q.meeting_id
  ),
  members as (
    select count(*)::integer as n from public.community_members where community_id = p_community_id and is_active
  ),
  participation as (
    select ms.id, ms.title, ms.meeting_date, ms.status,
      (select count(distinct v.member_id) from public.votes v join qs on qs.id = v.question_id where qs.meeting_id = ms.id)::integer as voters,
      (select count(*) from qs where qs.meeting_id = ms.id and qs.status <> 'draft')::integer as voted_questions
    from ms
    where ms.status <> 'draft'
  )
  select jsonb_build_object(
    'meetings', jsonb_build_object(
      'total', (select count(*) from ms),
      'draft', (select count(*) from ms where status = 'draft'),
      'in_progress', (select count(*) from ms where status = 'in_progress'),
      'finished', (select count(*) from ms where status = 'finished')
    ),
    'questions', jsonb_build_object(
      'draft', (select count(*) from qs where status = 'draft'),
      'open', (select count(*) from qs where status = 'open'),
      'closed', (select count(*) from qs where status = 'closed')
    ),
    'votes_total', (select count(*) from public.votes v join qs on qs.id = v.question_id),
    'members_active', (select n from members),
    'participation', coalesce((
      select jsonb_agg(jsonb_build_object(
        'meeting_id', p.id, 'title', p.title, 'meeting_date', p.meeting_date, 'status', p.status,
        'voters', p.voters, 'voted_questions', p.voted_questions, 'eligible', (select n from members)
      ) order by p.meeting_date)
      from participation p
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.member_sign_in(text, text, text, text),
  public.get_my_membership(),
  public.member_sign_out(),
  public.admin_create_member(uuid, text, text, text),
  public.admin_update_member(uuid, text, text, text, boolean),
  public.admin_reset_member_pin(uuid),
  public.admin_save_question(uuid, text, text, text[], uuid),
  public.admin_delete_question(uuid),
  public.admin_reorder_questions(uuid, uuid[]),
  public.start_meeting(uuid),
  public.finish_meeting(uuid),
  public.open_question(uuid),
  public.close_question(uuid),
  public.reopen_question(uuid),
  public.open_eligible_questions(uuid),
  public.close_open_questions(uuid),
  public.cast_vote(uuid, uuid),
  public.get_meeting_results(uuid),
  public.admin_meeting_votes(uuid),
  public.admin_dashboard(uuid)
to authenticated;
