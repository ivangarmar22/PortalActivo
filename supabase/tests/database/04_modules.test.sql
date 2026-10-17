-- Acceso completo / solo votación y módulos de comunidad: incidencias, reservas, avisos,
-- tablón, recibos y documentos.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(66);

insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', true, now(), now()
from unnest(array[
  '99999999-0000-4000-8000-000000000021', -- 4º A, acceso completo
  '99999999-0000-4000-8000-000000000022', -- 2º B, solo votación
  '99999999-0000-4000-8000-000000000023', -- 1º de Mirador, acceso completo
  '99999999-0000-4000-8000-000000000024', -- primer acceso de 2º A
  '99999999-0000-4000-8000-000000000025', -- 1º A con contraseña
  '99999999-0000-4000-8000-000000000026'  -- segunda activación de 2º A
]::uuid[]) as id;

insert into member_sessions (user_id, member_id, access_scope) values
  ('99999999-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000007', 'full'),
  ('99999999-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000004', 'vote'),
  ('99999999-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000011', 'full');

create function pg_temp.as_user(p_uid text, p_anonymous boolean) returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anonymous)::text,
    true
  );
$$;

-- ================================================================ primer acceso y contraseña
select pg_temp.as_user('99999999-0000-4000-8000-000000000024', true);
set local role authenticated;
select is(public.member_activate('10000001S', '333333', 'MiClave2026') ->> 'error', 'invalid_activation',
  'primer acceso: el DNI tiene que ser el de la vivienda del PIN');
select is(public.member_activate('10000003V', '333333', 'corta') ->> 'error', 'weak_password',
  'primer acceso: la contraseña necesita al menos 8 caracteres');
select is((public.member_activate('10000003-v', '333333', 'MiClave2026') ->> 'ok')::boolean, true,
  'primer acceso correcto con DNI + PIN');
select is(public.get_my_membership() ->> 'access_scope', 'full', 'el primer acceso abre una sesión completa');
reset role;

select pg_temp.as_user('99999999-0000-4000-8000-000000000026', true);
set local role authenticated;
select is(public.member_activate('10000003V', '333333', 'OtraClave2026') ->> 'error', 'already_activated',
  'una cuenta ya activada no se puede volver a activar con el PIN');
reset role;

select pg_temp.as_user('99999999-0000-4000-8000-000000000025', true);
set local role authenticated;
select is(public.member_password_sign_in('10000001S', 'mala-clave') ->> 'error', 'invalid_credentials',
  'DNI + contraseña incorrecta: denegado');
select is((public.member_password_sign_in('10000001s', 'Vecinos2026') ->> 'ok')::boolean, true,
  'DNI + contraseña correcta: acceso completo');
select lives_ok($$ select public.member_change_password('Vecinos2026', 'NuevaClave2026') $$,
  'el vecino puede cambiar su contraseña');
select throws_ok($$ select public.member_change_password('Vecinos2026', 'OtraMas2026') $$,
  'P0001', 'wrong_password', 'cambiar la contraseña exige la actual');
reset role;

-- La administración nunca ve la contraseña; generar un PIN nuevo la borra
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select matches(public.admin_reset_member_pin('d0000000-0000-4000-8000-000000000003'), '^[0-9]{6}$',
  'el PIN nuevo tiene 6 dígitos');
select is(
  (select has_password from public.admin_member_access_status('c0000000-0000-4000-8000-000000000001')
   where member_id = 'd0000000-0000-4000-8000-000000000003'),
  false, 'el PIN nuevo restablece la contraseña (el vecino la vuelve a crear)');
reset role;
select is((select count(distinct pin_lookup) from member_credentials)::int, (select count(*) from member_credentials)::int,
  'cada PIN es único en todo el sistema');

-- ================================================================ solo votación: sin módulos
select pg_temp.as_user('99999999-0000-4000-8000-000000000022', true);
set local role authenticated;
select is((select count(*) from incidents)::int, 0, 'solo votación: no ve incidencias');
select is((select count(*) from receipts)::int, 0, 'solo votación: no ve recibos');
select is((select count(*) from notices)::int, 0, 'solo votación: no ve avisos');
select is((select count(*) from meetings)::int, 2, 'solo votación: sí ve las votaciones');
select throws_ok($$ select public.member_report_incident('Prueba de acceso', '', null, 'other') $$,
  '42501', 'not_a_member', 'solo votación: no puede reportar incidencias');
select throws_ok($$ select * from public.get_space_availability('2b000000-0000-4000-8000-000000000001', current_date, 7) $$,
  '42501', 'forbidden', 'solo votación: no puede consultar reservas');
reset role;

-- ================================================================ incidencias (4º A, acceso completo)
select pg_temp.as_user('99999999-0000-4000-8000-000000000021', true);
set local role authenticated;
select is((select count(*) from incidents)::int, 6, 've todas las incidencias de su comunidad y no las de otra');
select is((select reported_dwelling from incidents where id = '1a000000-0000-4000-8000-000000000001'), '2º B',
  've qué vivienda abrió cada incidencia (decisión aprobada)');
select is((select count(*) from incident_updates where incident_id = '1a000000-0000-4000-8000-000000000001')::int, 4,
  've el historial completo');
select isnt(public.member_report_incident('Bombilla fundida en el portal 1', 'No se enciende', 'Portal 1', 'electricity'), null,
  'puede reportar una incidencia');
select is((select reported_dwelling from incidents where title = 'Bombilla fundida en el portal 1'), '4º A',
  'la incidencia queda asociada a su vivienda');
select throws_ok(
  $$ select public.member_report_incident('Foto de otra comunidad', '', null, 'other', 'c0000000-0000-4000-8000-000000000002/incidents/x.jpg') $$,
  'P0001', 'invalid_file', 'no puede adjuntar una foto de otra comunidad');
select throws_ok(
  $$ select public.admin_update_incident('1a000000-0000-4000-8000-000000000004', 'resolved', null, null, null, 'Hecho') $$,
  '42501', 'forbidden', 'un vecino no puede cambiar el estado');
select throws_ok($$ insert into incidents (community_id, title) values ('c0000000-0000-4000-8000-000000000001', 'Directa') $$,
  '42501', null, 'no se puede escribir en incidencias sin pasar por la RPC');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select lives_ok(
  $$ select public.admin_update_incident('1a000000-0000-4000-8000-000000000004', 'in_progress', 'company', 'Puertas Rápidas (ficticia)', current_date + 2, 'Avisado el técnico.') $$,
  'la administración asigna una empresa y cambia el estado');
select is((select responsible_name from incidents where id = '1a000000-0000-4000-8000-000000000004'), 'Puertas Rápidas (ficticia)',
  'el responsable queda guardado');
select lives_ok(
  $$ select public.admin_update_incident('1a000000-0000-4000-8000-000000000004', 'resolved', 'company', 'Puertas Rápidas (ficticia)', null, 'Reparada.') $$,
  'la administración la marca como resuelta');
select isnt((select resolved_at from incidents where id = '1a000000-0000-4000-8000-000000000004'), null,
  'al resolverla se guarda la fecha');
select is((select count(*) from incident_updates where incident_id = '1a000000-0000-4000-8000-000000000004')::int, 3,
  'cada cambio queda en el historial');
select throws_ok(
  $$ select public.admin_update_incident('1a000000-0000-4000-8000-000000000004', 'resolved', 'company', 'Puertas Rápidas (ficticia)', null, '') $$,
  'P0001', 'nothing_to_update', 'una actualización sin cambios se rechaza');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000002', false);
set local role authenticated;
select throws_ok(
  $$ select public.admin_update_incident('1a000000-0000-4000-8000-000000000001', 'resolved', null, null, null, 'x') $$,
  '42501', 'forbidden', 'la administración de otra comunidad no puede tocarla');
reset role;

-- ================================================================ reservas
select pg_temp.as_user('99999999-0000-4000-8000-000000000021', true);
set local role authenticated;
select is((select count(*) from public.get_space_availability('2b000000-0000-4000-8000-000000000001', current_date, 14))::int, 28,
  'la barbacoa ofrece 2 franjas diarias durante 14 días');
select is(
  (select state from public.get_space_availability('2b000000-0000-4000-8000-000000000001', current_date + 1, 1) where slot_label = 'Cena'),
  'taken', 'una franja reservada por otra vivienda aparece ocupada');
select is(
  (select my_reservation_id from public.get_space_availability('2b000000-0000-4000-8000-000000000001', current_date + 1, 1) where slot_label = 'Cena'),
  null, 'sin revelar quién la reservó');
select is(
  (select state from public.get_space_availability('2b000000-0000-4000-8000-000000000002', current_date + 1, 1) where slot_label = '18:30'),
  'mine', 'sus propias reservas aparecen como suyas');
select throws_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000002', current_date + 1) $$,
  'P0001', 'slot_taken', 'no se puede reservar una franja ocupada');
select lives_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000001', current_date + 4) $$, 'primera reserva');
select lives_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000001', current_date + 6) $$, 'segunda reserva');
select throws_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000001', current_date + 7) $$,
  'P0001', 'reservation_limit', 'máximo 2 reservas futuras por vivienda en el espacio');
select throws_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000008', current_date - 1) $$,
  'P0001', 'slot_in_past', 'no se reserva en el pasado');
select throws_ok($$ select public.member_book_slot('3c000000-0000-4000-8000-000000000003', current_date + 30) $$,
  'P0001', 'slot_too_far', 'no se reserva más allá de la ventana del espacio');
select lives_ok(
  $$ select public.member_cancel_reservation((select id from reservations where member_id = 'd0000000-0000-4000-8000-000000000007' and starts_at::date >= current_date + 6 and status = 'confirmed' and space_id = '2b000000-0000-4000-8000-000000000001' order by starts_at desc limit 1)) $$,
  'cancela con antelación suficiente');
select is((select count(*) from reservations where member_id <> 'd0000000-0000-4000-8000-000000000007')::int, 0,
  'solo ve sus propias reservas');
reset role;

-- Cancelación tardía: reserva que empieza dentro de 2 horas (salón: 48 h de antelación)
insert into reservations (community_id, space_id, slot_label, member_id, starts_at, ends_at)
values ('c0000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000003', 'Prueba',
        'd0000000-0000-4000-8000-000000000007', now() + interval '2 hours', now() + interval '3 hours');
select throws_ok(
  $$ insert into reservations (community_id, space_id, slot_label, member_id, starts_at, ends_at)
     values ('c0000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000003', 'Solape',
             'd0000000-0000-4000-8000-000000000001', now() + interval '150 minutes', now() + interval '4 hours') $$,
  '23P01', null, 'la base de datos impide dos reservas solapadas del mismo espacio');
select pg_temp.as_user('99999999-0000-4000-8000-000000000021', true);
set local role authenticated;
select throws_ok(
  $$ select public.member_cancel_reservation((select id from reservations where slot_label = 'Prueba')) $$,
  'P0001', 'cancel_too_late', 'no se cancela con menos antelación de la exigida');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select cmp_ok((select count(distinct member_id) from reservations)::int, '>=', 4,
  'la administración ve las reservas de todas las viviendas');
select lives_ok($$ select public.admin_cancel_reservation((select id from reservations where slot_label = 'Prueba'), 'Mantenimiento') $$,
  'la administración puede cancelar cualquier reserva');
reset role;

-- ================================================================ avisos y tablón
select pg_temp.as_user('99999999-0000-4000-8000-000000000021', true);
set local role authenticated;
select is((select count(*) from notices)::int, 4, 'el vecino no ve avisos programados ni caducados');
select lives_ok($$ select public.mark_notice_read('4d000000-0000-4000-8000-000000000002'); select public.mark_notice_read('4d000000-0000-4000-8000-000000000002') $$,
  'marcar como leído es idempotente');
select throws_ok($$ insert into notices (community_id, title, body) values ('c0000000-0000-4000-8000-000000000001', 'Falso aviso', 'x') $$,
  '42501', null, 'un vecino no puede publicar avisos oficiales');
select is((select count(*) from board_posts)::int, 4, 'tablón: ve las aprobadas y las suyas, no las pendientes ni rechazadas de otros');
select lives_ok($$ select public.member_create_board_post('Segunda publicación', 'Texto de prueba', 'other'); select public.member_create_board_post('Tercera publicación', 'Texto de prueba', 'other') $$,
  'puede proponer publicaciones');
select throws_ok($$ select public.member_create_board_post('Cuarta publicación', 'Texto de prueba', 'other') $$,
  'P0001', 'too_many_pending_posts', 'máximo 3 publicaciones pendientes de revisión');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select lives_ok($$ select public.admin_moderate_board_post('5e000000-0000-4000-8000-000000000004', 'approved', null) $$,
  'la administración aprueba una publicación');
select throws_ok($$ select public.admin_moderate_board_post('5e000000-0000-4000-8000-000000000004', 'rejected', 'x') $$,
  'P0001', 'invalid_moderation', 'una publicación aprobada no pasa a rechazada (solo se retira)');
reset role;

-- ================================================================ recibos y documentos
select pg_temp.as_user('99999999-0000-4000-8000-000000000021', true);
set local role authenticated;
select is((select count(*) from receipts)::int, 4, 'cada vivienda ve solo sus recibos');
select is((select count(*) from community_documents)::int, 5, 'todas las viviendas ven los documentos de la comunidad');
with changed as (update receipts set status = 'paid', paid_at = current_date returning 1)
select is((select count(*) from changed)::int, 0, 'un vecino no puede marcar sus recibos como pagados (RLS no le deja tocar ninguno)');
select ok(private.can_read_community_file('c0000000-0000-4000-8000-000000000001/receipts/d0000000-0000-4000-8000-000000000007/r.pdf'),
  'puede descargar sus propios recibos');
select ok(not private.can_read_community_file('c0000000-0000-4000-8000-000000000001/receipts/d0000000-0000-4000-8000-000000000001/r.pdf'),
  'no puede descargar recibos de otra vivienda');
select ok(private.can_write_community_file('c0000000-0000-4000-8000-000000000001/incidents/foto.jpg')
          and not private.can_write_community_file('c0000000-0000-4000-8000-000000000001/documents/factura.pdf'),
  'solo puede subir fotos de incidencias');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select is(public.admin_issue_receipts('c0000000-0000-4000-8000-000000000001', 'Seguro anual', date_trunc('month', current_date)::date, 4200, current_date + 15), 10,
  'emitir un recibo crea uno por vivienda activa');
select is(public.admin_issue_receipts('c0000000-0000-4000-8000-000000000001', 'Seguro anual', date_trunc('month', current_date)::date, 4200, current_date + 15), 0,
  'volver a emitirlo no duplica recibos');
reset role;

select pg_temp.as_user('a0000000-0000-4000-8000-000000000002', false);
set local role authenticated;
select is((select count(*) from receipts where community_id = 'c0000000-0000-4000-8000-000000000001')::int, 0,
  'la administración de otra comunidad no ve estos recibos');
reset role;

select * from finish();
rollback;
