-- Acceso de propietarios, votación, apertura/cierre/reapertura y resultados.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(40);

insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000011', 'authenticated', 'authenticated', true, now(), now()),
       ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000012', 'authenticated', 'authenticated', true, now(), now()),
       ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000013', 'authenticated', 'authenticated', true, now(), now());

-- ================================================================ acceso
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;

-- Acceso «solo votación»: solo se valida el PIN; el resto solo tiene que estar relleno.
select is(
  public.member_sign_in('Gloria Romero Díaz', '10000007K', '4º A', '000000') ->> 'error',
  'invalid_pin', 'PIN incorrecto: acceso denegado'
);
select is(
  public.member_sign_in('', '10000007K', '4º A', '777777') ->> 'error',
  'missing_fields', 'los campos vacíos se rechazan aunque el PIN sea correcto'
);
select is(
  (public.member_sign_in('Cualquier nombre', 'X', 'Y', '777777') ->> 'ok')::boolean,
  true, 'con el PIN correcto entra aunque nombre, DNI y vivienda no coincidan (decisión aprobada)'
);
select is(
  public.get_my_membership() ->> 'dwelling_label', '4º A', 'el PIN identifica la vivienda 4º A'
);
select is(
  public.get_my_membership() ->> 'access_scope', 'vote', 'la sesión es de solo votación'
);
reset role;

select is(
  (select count(*) from login_attempts where user_id = '99999999-0000-4000-8000-000000000011')::int,
  0, 'el acceso correcto borra los intentos fallidos de la sesión'
);

-- Bloqueo de la sesión tras 5 intentos fallidos
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000013","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select lives_ok(
  $$ select public.member_sign_in('a', 'b', 'c', '000000') from generate_series(1, 5) $$,
  'cinco intentos fallidos'
);
select is(
  public.member_sign_in('Héctor Molina Ramos', '10000008E', '4º B', '888888') ->> 'error',
  'locked', 'tras 5 intentos fallidos la sesión queda bloqueada aunque el PIN sea correcto'
);
reset role;

-- Una sesión de administrador (no anónima) no puede vincularse a una vivienda
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok(
  $$ select public.member_sign_in('Ana García López', '10000001S', '1º A', '111111') $$,
  'P0001', 'anonymous_session_required', 'el acceso de propietario exige sesión anónima'
);
reset role;

-- ================================================================ voto (4º A)
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;

select is(
  (public.cast_vote('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000009') ->> 'changed')::boolean,
  false, 'primer voto registrado en pregunta abierta'
);
select is(
  (public.cast_vote('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000010') ->> 'changed')::boolean,
  true, 'votar de nuevo modifica el voto mientras la pregunta está abierta'
);
select is(
  (select count(*) from votes where question_id = 'f0000000-0000-4000-8000-000000000004'
     and member_id = 'd0000000-0000-4000-8000-000000000007')::int,
  1, 'sigue habiendo un único voto de la vivienda'
);
select throws_ok(
  $$ select public.cast_vote('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000012') $$,
  'P0001', 'invalid_option', 'no se acepta una opción de otra pregunta'
);
select throws_ok(
  $$ select public.cast_vote('f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000012') $$,
  'P0001', 'question_not_open', 'no se vota una pregunta cerrada'
);
select throws_ok(
  $$ select public.cast_vote('f0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000017') $$,
  'P0001', 'question_not_open', 'no se vota una pregunta en borrador'
);
select throws_ok(
  $$ select public.cast_vote('f0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000023') $$,
  '42501', 'not_a_member', 'no se vota en otra comunidad'
);
select throws_ok(
  $$ insert into votes (question_id, member_id, option_id) values ('f0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000015') $$,
  '42501', null, 'no se puede insertar un voto saltándose la RPC'
);

-- Resultados para la propietaria: solo preguntas cerradas
select is(
  (select count(distinct question_id) from public.get_meeting_results('e0000000-0000-4000-8000-000000000002'))::int,
  1, 'la propietaria solo ve resultados de preguntas cerradas'
);
reset role;

-- ================================================================ administración
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;

select is(
  (select count(distinct question_id) from public.get_meeting_results('e0000000-0000-4000-8000-000000000002'))::int,
  3, 'la administradora ve resultados en vivo de preguntas abiertas y cerradas'
);
select results_eq(
  $$ select option_label, vote_count, total_votes, percentage
     from public.get_meeting_results('e0000000-0000-4000-8000-000000000001')
     where question_position = 1 order by option_position $$,
  $$ values ('A favor'::text, 7, 9, 77.8::numeric), ('En contra', 1, 9, 11.1), ('Abstención', 1, 9, 11.1) $$,
  'recuentos y porcentajes calculados sobre los votos emitidos'
);
select results_eq(
  $$ select vote_count, total_votes, percentage
     from public.get_meeting_results('e0000000-0000-4000-8000-000000000002')
     where question_position = 3 order by option_position $$,
  $$ values (0, 0, null::numeric), (0, 0, null::numeric) $$,
  'una pregunta sin votos devuelve 0 votos y porcentaje nulo'
);
select is(
  (select distinct eligible_members from public.get_meeting_results('e0000000-0000-4000-8000-000000000001')),
  10, 'la participación se mide sobre las viviendas activas del censo'
);
select is(
  (select count(*) from public.admin_meeting_votes('e0000000-0000-4000-8000-000000000001'))::int,
  26, 'el detalle nominal incluye todos los votos de la reunión'
);

-- Cierre individual
select lives_ok($$ select public.close_question('f0000000-0000-4000-8000-000000000004') $$, 'cerrar una pregunta abierta');
select throws_ok(
  $$ select public.close_question('f0000000-0000-4000-8000-000000000004') $$,
  'P0001', 'question_not_open', 'no se cierra dos veces'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select throws_ok(
  $$ select public.cast_vote('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000009') $$,
  'P0001', 'question_not_open', 'tras el cierre no se puede modificar el voto'
);
reset role;

-- Reapertura: se conservan los votos y se puede votar o modificar
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select lives_ok($$ select public.reopen_question('f0000000-0000-4000-8000-000000000004') $$, 'reabrir una pregunta cerrada');
select is(
  (select count(*) from votes where question_id = 'f0000000-0000-4000-8000-000000000004')::int,
  4, 'la reapertura conserva los votos anteriores'
);
select is(
  (select reopen_count from questions where id = 'f0000000-0000-4000-8000-000000000004'), 1,
  'se cuenta la reapertura'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is(
  (public.cast_vote('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000011') ->> 'changed')::boolean,
  true, 'tras reabrir se puede modificar el voto'
);
reset role;

-- Operaciones globales
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok(
  $$ select public.open_question('f0000000-0000-4000-8000-000000000005') $$,
  'P0001', 'question_not_draft', 'abrir no sirve para reabrir una pregunta cerrada'
);
select is(public.open_eligible_questions('e0000000-0000-4000-8000-000000000002'), 1, 'abrir elegibles abre solo las preguntas en borrador');
select is(
  (select status from questions where id = 'f0000000-0000-4000-8000-000000000005'), 'closed'::question_status,
  'abrir elegibles no reabre preguntas cerradas'
);
select is(public.close_open_questions('e0000000-0000-4000-8000-000000000002'), 3, 'cerrar todas cierra las 3 preguntas abiertas');
select is(public.close_open_questions('e0000000-0000-4000-8000-000000000002'), 0, 'repetir el cierre global no afecta a nada');

-- Iniciar una reunión no abre preguntas; finalizarla cierra las abiertas y la bloquea
select lives_ok($$ select public.start_meeting('e0000000-0000-4000-8000-000000000003') $$, 'iniciar la junta 2027');
select is(
  (select status from questions where id = 'f0000000-0000-4000-8000-000000000008'), 'draft'::question_status,
  'iniciar la reunión no abre sus preguntas'
);
select lives_ok($$ select public.open_question('f0000000-0000-4000-8000-000000000008') $$, 'abrir la pregunta de la junta 2027');
select is(public.finish_meeting('e0000000-0000-4000-8000-000000000003'), 1, 'finalizar la reunión cierra su pregunta abierta');
select throws_ok(
  $$ update meetings set title = 'Cambio' where id = 'e0000000-0000-4000-8000-000000000003' $$,
  'P0001', 'meeting_finished', 'la reunión finalizada queda en solo lectura'
);
reset role;

select * from finish();
rollback;
