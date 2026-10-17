-- PortalActivo · Recibos por vivienda y documentos económicos de la comunidad
-- Decisión aprobada: cada vivienda ve SOLO sus recibos (dato personal: deudas); todos los vecinos
-- ven las facturas y documentos de la comunidad. Sin pagos online: la administración registra cobros.
-- Importes en céntimos (integer) para evitar errores de redondeo.

create type public.receipt_status as enum ('pending', 'paid', 'returned');
create type public.document_kind as enum ('invoice', 'budget', 'accounts', 'contract', 'insurance', 'other');

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  member_id uuid not null references public.community_members (id) on delete cascade,
  concept text not null check (char_length(btrim(concept)) between 3 and 160),
  period_start date not null check (extract(day from period_start) = 1),
  amount_cents integer not null check (amount_cents > 0),
  due_date date not null,
  status public.receipt_status not null default 'pending',
  paid_at date,
  file_path text check (file_path is null or char_length(file_path) <= 300),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_paid_consistent check ((status = 'paid') = (paid_at is not null)),
  constraint receipts_file_consistent check ((file_path is null) = (file_name is null)),
  constraint receipts_unique_concept unique (member_id, period_start, concept)
);
create index receipts_community_idx on public.receipts (community_id, period_start desc);

create table public.community_documents (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  kind public.document_kind not null default 'other',
  title text not null check (char_length(btrim(title)) between 3 and 160),
  supplier text check (supplier is null or char_length(supplier) <= 120),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  document_date date not null,
  file_path text not null check (char_length(file_path) <= 300),
  file_name text not null check (char_length(file_name) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index community_documents_idx on public.community_documents (community_id, document_date desc);

create trigger receipts_updated_at before update on public.receipts
  for each row execute function private.set_updated_at();

-- Un recibo solo puede pertenecer a una vivienda de su misma comunidad.
create function private.guard_receipt_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.member_community_id(new.member_id) is distinct from new.community_id then
    raise exception 'member_not_in_community' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger receipts_member_guard before insert or update of member_id, community_id on public.receipts
  for each row execute function private.guard_receipt_member();

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on public.receipts, public.community_documents from anon, authenticated;
grant select,
  insert (community_id, member_id, concept, period_start, amount_cents, due_date, status, paid_at, file_path, file_name),
  update (concept, amount_cents, due_date, status, paid_at, file_path, file_name),
  delete
  on public.receipts to authenticated;
grant select,
  insert (community_id, kind, title, supplier, amount_cents, document_date, file_path, file_name),
  delete
  on public.community_documents to authenticated;

alter table public.receipts enable row level security;
alter table public.community_documents enable row level security;

create policy receipts_select on public.receipts
  for select to authenticated
  using (
    private.is_community_admin(community_id)
    or member_id = private.full_member_id(community_id)
  );
create policy receipts_insert on public.receipts
  for insert to authenticated with check (private.is_community_admin(community_id));
create policy receipts_update on public.receipts
  for update to authenticated
  using (private.is_community_admin(community_id))
  with check (private.is_community_admin(community_id));
create policy receipts_delete on public.receipts
  for delete to authenticated using (private.is_community_admin(community_id));

create policy community_documents_select on public.community_documents
  for select to authenticated
  using (private.is_community_admin(community_id) or private.is_full_member(community_id));
create policy community_documents_insert on public.community_documents
  for insert to authenticated with check (private.is_community_admin(community_id));
create policy community_documents_delete on public.community_documents
  for delete to authenticated using (private.is_community_admin(community_id));

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Emite el mismo recibo para todas las viviendas activas (p. ej. la cuota mensual).
-- No duplica: si una vivienda ya tiene ese concepto en ese periodo, se omite.
create function public.admin_issue_receipts(
  p_community_id uuid,
  p_concept text,
  p_period_start date,
  p_amount_cents integer,
  p_due_date date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.assert_community_admin(p_community_id);
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  with inserted as (
    insert into public.receipts (community_id, member_id, concept, period_start, amount_cents, due_date)
    select p_community_id, cm.id, btrim(p_concept), date_trunc('month', p_period_start)::date, p_amount_cents, p_due_date
    from public.community_members cm
    where cm.community_id = p_community_id and cm.is_active
    on conflict (member_id, period_start, concept) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;

-- Resumen económico para el panel de administración (sin datos individuales).
create function public.admin_finance_summary(p_community_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_community_admin(p_community_id);
  return (
    select jsonb_build_object(
      'pending_cents', coalesce(sum(amount_cents) filter (where status = 'pending'), 0),
      'pending_count', count(*) filter (where status = 'pending'),
      'overdue_count', count(*) filter (where status = 'pending' and due_date < current_date),
      'returned_count', count(*) filter (where status = 'returned'),
      'paid_cents', coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
    )
    from public.receipts
    where community_id = p_community_id
  );
end;
$$;

revoke all on function
  public.admin_issue_receipts(uuid, text, date, integer, date),
  public.admin_finance_summary(uuid)
from public, anon;
grant execute on function
  public.admin_issue_receipts(uuid, text, date, integer, date),
  public.admin_finance_summary(uuid)
to authenticated;
