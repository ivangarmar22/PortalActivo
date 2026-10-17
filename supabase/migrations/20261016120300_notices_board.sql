-- PortalActivo · Avisos oficiales y tablón vecinal
-- Avisos: los publica la administración (categoría, urgente, fijado, adjunto, caducidad) y cada
-- vivienda puede marcarlos como leídos. Tablón: publican los vecinos, pero solo se ve tras la
-- aprobación de la administración (decisión aprobada).

create type public.notice_category as enum (
  'general', 'works', 'maintenance', 'meeting', 'security', 'cleaning', 'other'
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  category public.notice_category not null default 'general',
  is_urgent boolean not null default false,
  is_pinned boolean not null default false,
  attachment_path text check (attachment_path is null or char_length(attachment_path) <= 300),
  attachment_name text check (attachment_name is null or char_length(attachment_name) <= 200),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_expiry_after_publication check (expires_at is null or expires_at > published_at),
  constraint notices_attachment_consistent check ((attachment_path is null) = (attachment_name is null))
);
create index notices_community_idx on public.notices (community_id, published_at desc);

create table public.notice_reads (
  notice_id uuid not null references public.notices (id) on delete cascade,
  member_id uuid not null references public.community_members (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, member_id)
);
create index notice_reads_member_idx on public.notice_reads (member_id);

create type public.board_post_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
create type public.board_category as enum ('announcement', 'lost_found', 'buy_sell', 'recommendation', 'other');

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  member_id uuid not null references public.community_members (id) on delete cascade,
  author_dwelling text not null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  category public.board_category not null default 'other',
  status public.board_post_status not null default 'pending',
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_posts_community_idx on public.board_posts (community_id, status, created_at desc);

create trigger notices_updated_at before update on public.notices
  for each row execute function private.set_updated_at();
create trigger board_posts_updated_at before update on public.board_posts
  for each row execute function private.set_updated_at();

create function private.notice_community_id(p_notice_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select community_id from public.notices where id = p_notice_id;
$$;
revoke all on function private.notice_community_id(uuid) from public;
grant execute on function private.notice_community_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on public.notices, public.notice_reads, public.board_posts from anon, authenticated;
grant select,
  insert (community_id, title, body, category, is_urgent, is_pinned, attachment_path, attachment_name, published_at, expires_at),
  update (title, body, category, is_urgent, is_pinned, attachment_path, attachment_name, published_at, expires_at),
  delete
  on public.notices to authenticated;
grant select on public.notice_reads, public.board_posts to authenticated;

alter table public.notices enable row level security;
alter table public.notice_reads enable row level security;
alter table public.board_posts enable row level security;

-- Los vecinos ven los avisos publicados y no caducados; la administración, todos.
create policy notices_select on public.notices
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or (
      private.is_full_member(community_id)
      and published_at <= now()
      and (expires_at is null or expires_at > now())
    )
  );
create policy notices_insert on public.notices
  for insert to authenticated with check (private.is_community_admin(community_id));
create policy notices_update on public.notices
  for update to authenticated
  using (private.is_community_admin(community_id))
  with check (private.is_community_admin(community_id));
create policy notices_delete on public.notices
  for delete to authenticated using (private.is_community_admin(community_id));

create policy notice_reads_select on public.notice_reads
  for select to authenticated
  using (
    private.is_community_admin(private.notice_community_id(notice_id))
    or member_id = private.full_member_id(private.notice_community_id(notice_id))
  );

-- Tablón: publicaciones aprobadas para toda la comunidad; las propias en cualquier estado.
create policy board_posts_select on public.board_posts
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or (
      private.is_full_member(community_id)
      and (status = 'approved' or member_id = private.full_member_id(community_id))
    )
  );

alter publication supabase_realtime add table public.notices, public.board_posts;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
create function public.mark_notice_read(p_notice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
begin
  if not exists (
    select 1 from public.notices
    where id = p_notice_id and community_id = v_member.community_id and published_at <= now()
  ) then
    raise exception 'notice_not_found' using errcode = 'P0002';
  end if;
  insert into public.notice_reads (notice_id, member_id)
  values (p_notice_id, v_member.id)
  on conflict do nothing;
end;
$$;

create function public.member_create_board_post(
  p_title text,
  p_body text,
  p_category public.board_category
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
  v_pending integer;
  v_id uuid;
begin
  -- Evita inundar la cola de moderación.
  select count(*) into v_pending
  from public.board_posts
  where member_id = v_member.id and status = 'pending';
  if v_pending >= 3 then
    raise exception 'too_many_pending_posts' using errcode = 'P0001';
  end if;

  insert into public.board_posts (community_id, member_id, author_dwelling, title, body, category)
  values (v_member.community_id, v_member.id, v_member.dwelling_label, btrim(p_title), btrim(p_body), p_category)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.member_withdraw_board_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.community_members := private.require_session_member();
begin
  update public.board_posts
  set status = 'withdrawn'
  where id = p_post_id and member_id = v_member.id and status in ('pending', 'approved');
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_moderate_board_post(
  p_post_id uuid,
  p_decision public.board_post_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  select * into v_post from public.board_posts where id = p_post_id for update;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_community_admin(v_post.community_id);

  -- Transiciones válidas: pendiente → aprobada/rechazada; aprobada → retirada.
  if not (
    (v_post.status = 'pending' and p_decision in ('approved', 'rejected'))
    or (v_post.status = 'approved' and p_decision = 'withdrawn')
  ) then
    raise exception 'invalid_moderation' using errcode = 'P0001';
  end if;

  update public.board_posts
  set status = p_decision,
      moderation_note = nullif(btrim(coalesce(p_note, '')), ''),
      moderated_by = (select auth.uid()),
      moderated_at = now()
  where id = p_post_id;
end;
$$;

revoke all on function
  public.mark_notice_read(uuid),
  public.member_create_board_post(text, text, public.board_category),
  public.member_withdraw_board_post(uuid),
  public.admin_moderate_board_post(uuid, public.board_post_status, text)
from public, anon;
grant execute on function
  public.mark_notice_read(uuid),
  public.member_create_board_post(text, text, public.board_category),
  public.member_withdraw_board_post(uuid),
  public.admin_moderate_board_post(uuid, public.board_post_status, text)
to authenticated;
