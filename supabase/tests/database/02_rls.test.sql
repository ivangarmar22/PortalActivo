-- Autorización: RLS, permisos por columna y aislamiento entre comunidades.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

-- Usuario anónimo de prueba vinculado a la vivienda 1º A (Los Almendros)
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000001', 'authenticated', 'authenticated', true, now(), now()),
       ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000002', 'authenticated', 'authenticated', true, now(), now());
insert into member_sessions (user_id, member_id)
values ('99999999-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------- sin sesión (anon)
set local role anon;
select throws_ok($$ select * from communities $$, '42501', null, 'anon no puede leer comunidades');
select throws_ok($$ select public.get_my_membership() $$, '42501', null, 'anon no puede llamar a RPC');
reset role;

-- ---------------------------------------------------------------- administradora de Los Almendros
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;

select is((select count(*) from communities)::int, 1, 'la administradora solo ve su comunidad');
select is((select count(*) from meetings)::int, 3, 've las 3 reuniones de su comunidad (incluido el borrador)');
select is((select count(*) from community_members)::int, 10, 've el censo de su comunidad');
select is((select count(*) from member_private)::int, 10, 've los DNI de su comunidad y no los de otra');
select is((select count(*) from meetings where community_id = 'c0000000-0000-4000-8000-000000000002')::int, 0, 'no ve reuniones de otra comunidad');
select throws_ok($$ select * from member_credentials $$, '42501', null, 'nadie lee los hashes de PIN');
select throws_ok(
  $$ update meetings set status = 'finished' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'el estado de una reunión no se cambia con UPDATE directo'
);
select throws_ok(
  $$ insert into community_admins (community_id, user_id) values ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'un administrador no puede asignarse otra comunidad'
);
select throws_ok(
  $$ insert into meetings (community_id, title, meeting_date) values ('c0000000-0000-4000-8000-000000000002', 'Intrusa', now()) $$,
  '42501', null, 'no puede crear reuniones en otra comunidad'
);
select lives_ok(
  $$ insert into meetings (community_id, title, meeting_date) values ('c0000000-0000-4000-8000-000000000001', 'Nueva junta', now()) returning id $$,
  'puede crear reuniones en su comunidad (con RETURNING, como hace la API)'
);
select throws_ok(
  $$ select public.open_question('f0000000-0000-4000-8000-000000000009') $$,
  '42501', 'forbidden', 'no puede abrir preguntas de otra comunidad'
);
reset role;

-- ---------------------------------------------------------------- propietaria 1º A (sesión anónima vinculada)
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;

select is((select count(*) from communities)::int, 1, 'la propietaria ve su comunidad');
select is((select count(*) from meetings)::int, 2, 've las reuniones que no están en preparación');
select is((select count(*) from community_members)::int, 1, 'solo ve su propia vivienda en el censo');
select is((select count(*) from member_private)::int, 0, 'no ve ningún DNI');
select is(
  (select count(*) from questions where meeting_id = 'e0000000-0000-4000-8000-000000000002')::int, 3,
  'no ve las preguntas en borrador'
);
select is((select count(distinct member_id) from votes)::int, 1, 'solo ve sus propios votos');
select is((select count(*) from question_status_log)::int, 0, 'no ve el historial de estados');
select throws_ok(
  $$ insert into meetings (community_id, title, meeting_date) values ('c0000000-0000-4000-8000-000000000001', 'Junta pirata', now()) $$,
  '42501', null, 'una propietaria no puede crear reuniones'
);
select throws_ok(
  $$ select public.close_question('f0000000-0000-4000-8000-000000000004') $$,
  '42501', 'forbidden', 'una propietaria no puede cerrar preguntas'
);
reset role;

-- ---------------------------------------------------------------- sesión anónima sin vincular
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is((select count(*) from meetings)::int, 0, 'una sesión anónima sin vincular no ve reuniones');
select ok(public.get_my_membership() is null, 'una sesión sin vincular no tiene vivienda');
reset role;

select * from finish();
rollback;
