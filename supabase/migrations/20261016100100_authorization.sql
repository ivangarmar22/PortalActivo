-- PortalActivo · Autorización
-- Principio: el cliente (rol "authenticated", que incluye sesiones anónimas de propietarios)
-- solo recibe los permisos mínimos. Las operaciones críticas pasan por funciones RPC
-- (20261016100200_rpc.sql). El rol "anon" (sin sesión) no tiene acceso a nada.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de autorización (SECURITY DEFINER para no recursar en RLS)
-- ---------------------------------------------------------------------------
create function private.is_community_admin(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_admins
    where community_id = p_community_id and user_id = (select auth.uid())
  );
$$;

-- Vivienda (activa) vinculada a la sesión actual dentro de una comunidad.
create function private.current_member_id(p_community_id uuid)
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
    and cm.community_id = p_community_id
    and cm.is_active
  limit 1;
$$;

create function private.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_member_id(p_community_id) is not null;
$$;

create function private.can_admin_meeting(p_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.meetings m
    where m.id = p_meeting_id and private.is_community_admin(m.community_id)
  );
$$;

-- Los propietarios ven reuniones que ya no están en preparación.
create function private.can_read_meeting(p_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.meetings m
    where m.id = p_meeting_id
      and (
        private.is_community_admin(m.community_id)
        or (m.status <> 'draft' and private.is_community_member(m.community_id))
      )
  );
$$;

create function private.can_admin_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    join public.meetings m on m.id = q.meeting_id
    where q.id = p_question_id and private.is_community_admin(m.community_id)
  );
$$;

-- Los propietarios ven las preguntas que ya se han abierto alguna vez.
create function private.can_read_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    join public.meetings m on m.id = q.meeting_id
    where q.id = p_question_id
      and (
        private.is_community_admin(m.community_id)
        or (q.status <> 'draft' and m.status <> 'draft' and private.is_community_member(m.community_id))
      )
  );
$$;

create function private.member_community_id(p_member_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select community_id from public.community_members where id = p_member_id;
$$;

create function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_community_admin(uuid),
  private.current_member_id(uuid),
  private.is_community_member(uuid),
  private.can_admin_meeting(uuid),
  private.can_read_meeting(uuid),
  private.can_admin_question(uuid),
  private.can_read_question(uuid),
  private.member_community_id(uuid),
  private.try_uuid(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos de tabla: se parte de cero y se concede lo mínimo
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

grant select, update (name, address) on public.communities to authenticated;
grant select, update (display_name) on public.profiles to authenticated;
grant select on public.community_admins to authenticated;
grant select on public.community_members to authenticated;
grant select on public.member_private to authenticated;
grant select on public.member_sessions to authenticated;
grant select,
  insert (community_id, title, description, meeting_date, minutes_content),
  update (title, description, meeting_date, minutes_content, minutes_file_path, minutes_file_name),
  delete
  on public.meetings to authenticated;
grant select on public.questions to authenticated;
grant select on public.answer_options to authenticated;
grant select on public.votes to authenticated;
grant select on public.question_status_log to authenticated;
-- member_credentials: sin permisos para ningún rol de cliente.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.community_admins enable row level security;
alter table public.community_members enable row level security;
alter table public.member_private enable row level security;
alter table public.member_credentials enable row level security;
alter table public.member_sessions enable row level security;
alter table public.meetings enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.votes enable row level security;
alter table public.question_status_log enable row level security;

-- communities
create policy communities_select on public.communities
  for select to authenticated
  using (private.is_community_admin(id) or private.is_community_member(id));
create policy communities_update on public.communities
  for update to authenticated
  using (private.is_community_admin(id))
  with check (private.is_community_admin(id));

-- profiles: cada usuario solo su perfil
create policy profiles_select on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- community_admins: cada administrador ve sus propias asignaciones (sin escrituras)
create policy community_admins_select on public.community_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- community_members: el administrador ve el censo; el propietario, solo su vivienda
create policy community_members_select on public.community_members
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or id = private.current_member_id(community_id)
  );

-- member_private (DNI): solo administradores de la comunidad
create policy member_private_select on public.member_private
  for select to authenticated
  using (private.is_community_admin(private.member_community_id(member_id)));

-- member_sessions: cada sesión ve su propio vínculo
create policy member_sessions_select on public.member_sessions
  for select to authenticated using (user_id = (select auth.uid()));

-- meetings
-- La política usa las columnas de la fila (no una búsqueda por id): así funciona también en
-- INSERT ... RETURNING, cuando la fila nueva aún no es visible para una consulta aparte.
create policy meetings_select on public.meetings
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or (status <> 'draft' and private.is_community_member(community_id))
  );
create policy meetings_insert on public.meetings
  for insert to authenticated
  with check (private.is_community_admin(community_id) and status = 'draft');
create policy meetings_update on public.meetings
  for update to authenticated
  using (private.is_community_admin(community_id))
  with check (private.is_community_admin(community_id));
create policy meetings_delete on public.meetings
  for delete to authenticated
  using (private.is_community_admin(community_id) and status = 'draft');

-- questions / answer_options: lectura; las escrituras van por RPC
create policy questions_select on public.questions
  for select to authenticated
  using (
    private.can_admin_meeting(meeting_id)
    or (status <> 'draft' and private.can_read_meeting(meeting_id))
  );
create policy answer_options_select on public.answer_options
  for select to authenticated using (private.can_read_question(question_id));

-- votes: el administrador ve los votos nominales; el propietario, solo los suyos
create policy votes_select on public.votes
  for select to authenticated
  using (
    private.can_admin_question(question_id)
    or member_id in (select ms.member_id from public.member_sessions ms where ms.user_id = (select auth.uid()))
  );

create policy question_status_log_select on public.question_status_log
  for select to authenticated using (private.can_admin_question(question_id));

-- ---------------------------------------------------------------------------
-- Realtime: actualizar estados y recuentos en las pantallas abiertas (respeta RLS)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.meetings, public.questions, public.votes;
