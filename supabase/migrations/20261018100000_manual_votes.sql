-- Votos presenciales registrados por administración con trazabilidad del autor.
alter table public.votes
  add column recorded_by uuid references auth.users (id) on delete set null,
  add column recorded_by_name text;

create table public.admin_vote_audit (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  member_id uuid not null references public.community_members (id) on delete cascade,
  option_label text not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_by_name text not null,
  changed_at timestamptz not null default now()
);
create index admin_vote_audit_member_idx
  on public.admin_vote_audit (question_id, member_id, changed_at);
alter table public.admin_vote_audit enable row level security;

create or replace function public.cast_vote(p_question_id uuid, p_option_id uuid)
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
    on conflict (question_id, member_id) do update
      set option_id = excluded.option_id,
          recorded_by = null,
          recorded_by_name = null
    returning id, (xmax <> 0) into v_vote_id, v_changed;
  exception when foreign_key_violation then
    raise exception 'invalid_option' using errcode = 'P0001';
  end;

  return jsonb_build_object('vote_id', v_vote_id, 'changed', v_changed);
end;
$$;

create function public.admin_record_vote(
  p_question_id uuid,
  p_member_id uuid,
  p_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.question_status;
  v_community_id uuid;
  v_member_exists boolean;
  v_option_label text;
  v_admin_id uuid := auth.uid();
  v_admin_name text;
begin
  select q.status, m.community_id
  into v_status, v_community_id
  from public.questions q
  join public.meetings m on m.id = q.meeting_id
  where q.id = p_question_id
  for update of q;

  if not found then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_community_admin(v_community_id);

  if v_status <> 'open' then
    raise exception 'question_not_open' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.community_members cm
    where cm.id = p_member_id and cm.community_id = v_community_id and cm.is_active
  ) into v_member_exists;
  if not v_member_exists then
    raise exception 'member_not_in_community' using errcode = 'P0001';
  end if;

  select ao.label into v_option_label
  from public.answer_options ao
  where ao.id = p_option_id and ao.question_id = p_question_id;
  if not found then
    raise exception 'invalid_option' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.votes v
    where v.question_id = p_question_id and v.member_id = p_member_id
  ) then
    raise exception 'vote_already_exists' using errcode = 'P0001';
  end if;

  select coalesce(p.display_name, 'Administración')
  into v_admin_name
  from (select 1) s
  left join public.profiles p on p.id = v_admin_id;

  insert into public.votes (
    question_id, member_id, option_id, recorded_by, recorded_by_name
  ) values (
    p_question_id, p_member_id, p_option_id, v_admin_id, v_admin_name
  );

  insert into public.admin_vote_audit (
    question_id, member_id, option_label, changed_by, changed_by_name
  ) values (
    p_question_id, p_member_id, v_option_label, v_admin_id, v_admin_name
  );

  return;
end;
$$;

drop function public.admin_meeting_votes(uuid);
create function public.admin_meeting_votes(p_meeting_id uuid)
returns table (
  member_id uuid,
  question_id uuid,
  question_position integer,
  question_title text,
  dwelling_label text,
  full_name text,
  option_label text,
  voted_at timestamptz,
  updated_at timestamptz,
  recorded_by_name text,
  manual_history jsonb
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
  select
    v.member_id, q.id, q.position, q.title, cm.dwelling_label, cm.full_name, o.label,
    v.created_at, v.updated_at, v.recorded_by_name,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'option_label', audit.option_label,
        'changed_by_name', audit.changed_by_name,
        'changed_at', audit.changed_at
      ) order by audit.changed_at)
      from public.admin_vote_audit audit
      where audit.question_id = v.question_id and audit.member_id = v.member_id
    ), '[]'::jsonb)
  from public.votes v
  join public.questions q on q.id = v.question_id
  join public.answer_options o on o.id = v.option_id
  join public.community_members cm on cm.id = v.member_id
  where q.meeting_id = p_meeting_id
  order by q.position, cm.dwelling_key;
end;
$$;

revoke all on function public.admin_record_vote(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_record_vote(uuid, uuid, uuid) to authenticated;

revoke all on function public.admin_meeting_votes(uuid) from public, anon, authenticated;
grant execute on function public.admin_meeting_votes(uuid) to authenticated;
