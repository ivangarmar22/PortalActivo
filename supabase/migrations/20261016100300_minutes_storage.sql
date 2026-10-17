-- PortalActivo · Actas en PDF (Supabase Storage, bucket privado)
-- Ruta de cada archivo: {meeting_id}/{nombre}.pdf
-- Lectura: administradores de la comunidad y propietarios cuando la reunión no está en preparación.
-- Escritura: administradores, salvo en reuniones finalizadas (solo lectura).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('minutes', 'minutes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create function private.minutes_meeting_id(p_object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select private.try_uuid(split_part(p_object_name, '/', 1));
$$;

create function private.can_write_minutes(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.meetings m
    where m.id = private.minutes_meeting_id(p_object_name)
      and m.status <> 'finished'
      and private.is_community_admin(m.community_id)
  );
$$;

revoke all on function private.minutes_meeting_id(text), private.can_write_minutes(text) from public;
grant execute on function private.minutes_meeting_id(text), private.can_write_minutes(text) to authenticated;

create policy minutes_select on storage.objects
  for select to authenticated
  using (bucket_id = 'minutes' and private.can_read_meeting(private.minutes_meeting_id(name)));

create policy minutes_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'minutes' and private.can_write_minutes(name));

create policy minutes_update on storage.objects
  for update to authenticated
  using (bucket_id = 'minutes' and private.can_write_minutes(name))
  with check (bucket_id = 'minutes' and private.can_write_minutes(name));

create policy minutes_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'minutes' and private.can_write_minutes(name));
