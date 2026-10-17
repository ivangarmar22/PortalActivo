-- Integridad del modelo: restricciones y reglas de edición (independientes del usuario).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

-- Validación de DNI/NIE
select ok(private.is_valid_dni('10000001S'), 'DNI con letra correcta es válido');
select ok(not private.is_valid_dni('10000001A'), 'DNI con letra incorrecta no es válido');
select ok(private.is_valid_dni('x1000001-f'), 'NIE con formato libre se normaliza y es válido');
select ok(not private.is_valid_dni('1234'), 'formato incorrecto no es válido');

-- Normalización de vivienda
select is(private.normalize_dwelling('3º B'), '3b', '"3º B" se normaliza a "3b"');
select is(private.normalize_dwelling('3-b'), '3b', '"3-b" se normaliza a "3b"');
select is(private.normalize_dwelling('Ático'), private.normalize_dwelling('atico'), 'las tildes no importan en la vivienda');

-- Un voto no puede apuntar a una opción de otra pregunta (FK compuesta)
select throws_ok(
  $$ insert into votes (question_id, member_id, option_id)
     values ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005',
             (select id from answer_options where question_id = 'f0000000-0000-4000-8000-000000000005' limit 1)) $$,
  '23503', null, 'FK compuesta impide votar una opción de otra pregunta'
);

-- Un voto por vivienda y pregunta
select throws_ok(
  $$ insert into votes (question_id, member_id, option_id)
     values ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001',
             (select id from answer_options where question_id = 'f0000000-0000-4000-8000-000000000004' and position = 3)) $$,
  '23505', null, 'UNIQUE impide un segundo voto de la misma vivienda'
);

-- Preguntas: nacen en borrador y solo se editan en borrador
select throws_ok(
  $$ insert into questions (meeting_id, title, position, status)
     values ('e0000000-0000-4000-8000-000000000002', 'Pregunta abierta directa', 99, 'open') $$,
  'P0001', 'question_must_start_as_draft', 'una pregunta no puede crearse abierta'
);
select throws_ok(
  $$ update questions set title = 'Otro título' where id = 'f0000000-0000-4000-8000-000000000004' $$,
  'P0001', 'question_locked', 'no se edita el título de una pregunta abierta'
);
select throws_ok(
  $$ insert into answer_options (question_id, label, position) values ('f0000000-0000-4000-8000-000000000004', 'Nueva', 9) $$,
  'P0001', 'question_locked', 'no se añaden opciones a una pregunta abierta'
);
select lives_ok(
  $$ update questions set title = 'Puntos de recarga (revisado)' where id = 'f0000000-0000-4000-8000-000000000007' $$,
  'una pregunta en borrador sí se puede editar'
);

-- Reunión finalizada = solo lectura
select throws_ok(
  $$ update meetings set title = 'Cambio' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'meeting_finished', 'una reunión finalizada no se puede editar'
);
select throws_ok(
  $$ delete from meetings where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'P0001', 'meeting_not_draft', 'solo se borran reuniones en preparación'
);

-- Opciones duplicadas (ignorando mayúsculas) en la misma pregunta
select throws_ok(
  $$ insert into answer_options (question_id, label, position) values ('f0000000-0000-4000-8000-000000000007', 'a favor', 9) $$,
  '23505', null, 'no se repite una etiqueta de opción en la misma pregunta'
);

-- DNI no válido rechazado por la tabla
select throws_ok(
  $$ update member_private set dni = '10000001A' where member_id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'la tabla rechaza un DNI con letra incorrecta'
);

select * from finish();
rollback;
