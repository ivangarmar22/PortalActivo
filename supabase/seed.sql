-- PortalActivo · Datos de demostración (ficticios)
-- Se cargan con `npx supabase db reset`. Los DNI son inventados con letra de control válida.
-- Usuarios y PIN de prueba: ver docs/usuarios-demo.md.
--
-- Orden obligado por los triggers de integridad:
--   reuniones → preguntas (en borrador) → opciones → cambio de estado → votos → finalizar reunión.

-- ---------------------------------------------------------------------------
-- Administradores (Supabase Auth, email + contraseña)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'admin@portalactivo.test', extensions.crypt('PortalActivo2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'admin.mirador@portalactivo.test', extensions.crypt('PortalActivo2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

insert into public.profiles (id, display_name) values
  ('a0000000-0000-4000-8000-000000000001', 'Raúl'),
  ('a0000000-0000-4000-8000-000000000002', 'Jorge Salas');

-- ---------------------------------------------------------------------------
-- Comunidades
-- ---------------------------------------------------------------------------
insert into public.communities (id, name, address, logo_url) values
  ('c0000000-0000-4000-8000-000000000001', 'Terrazas del Cañaveral', 'Madrid', '/brand/terrazas-del-canaveral.png'),
  ('c0000000-0000-4000-8000-000000000002', 'Edificio Mirador del Parque', 'Avenida del Parque 7, Valencia (ficticia)', null);

insert into public.community_admins (community_id, user_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Censo (una fila por vivienda) + DNI + PIN
-- ---------------------------------------------------------------------------
with seed (id, community_id, dwelling, full_name, dni, pin) as (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid, '1º A', 'Ana García López',        '10000001S', '111111'),
    ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', '1º B', 'Bruno Martín Sanz',        '10000002Q', '222222'),
    ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', '2º A', 'Carmen Ruiz Ortega',       '10000003V', '333333'),
    ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', '2º B', 'David Navarro Gil',        '10000004H', '444444'),
    ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', '3º A', 'Elena Torres Vidal',       '10000005L', '555555'),
    ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', '3º B', 'Fernando Castro Peña',     '10000006C', '666666'),
    ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', '4º A', 'Gloria Romero Díaz',       '10000007K', '777777'),
    ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000001', '4º B', 'Héctor Molina Ramos',      '10000008E', '888888'),
    ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'Ático', 'Irene Delgado Cano',      '10000009T', '999999'),
    ('d0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000001', 'Local 1', 'Julian Petrov',         'X1000001F', '101010'),
    ('d0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000002', '1º', 'Lucía Herrera Mora',         '20000001Y', '121212'),
    ('d0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000002', '2º', 'Manuel Iglesias Rey',        '20000002F', '131313'),
    ('d0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000002', '3º', 'Nuria Campos Prieto',        '20000003P', '141414'),
    ('d0000000-0000-4000-8000-000000000014', 'c0000000-0000-4000-8000-000000000002', '4º', 'Óscar Lozano Fuentes',       '20000004D', '151515')
),
members as (
  insert into public.community_members (id, community_id, dwelling_label, full_name)
  select id, community_id, dwelling, full_name from seed
  returning id
),
private_data as (
  insert into public.member_private (member_id, dni)
  select id, dni from seed
  returning member_id
)
insert into public.member_credentials (member_id, pin_hash, pin_lookup, password_hash, password_set_at)
select id, extensions.crypt(pin, extensions.gen_salt('bf', 8)), private.pin_lookup(pin),
       -- Cuentas ya activadas (acceso completo con DNI + contraseña): 1º A y 4º A.
       case when dwelling in ('1º A', '4º A') then extensions.crypt('Vecinos2026', extensions.gen_salt('bf', 8)) end,
       case when dwelling in ('1º A', '4º A') then now() - interval '30 days' end
from seed;

-- ---------------------------------------------------------------------------
-- Reuniones
-- ---------------------------------------------------------------------------
insert into public.meetings (id, community_id, title, description, meeting_date, minutes_content, status, started_at, created_by) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Junta ordinaria 2026',
   'Aprobación de cuentas del ejercicio 2025, presupuesto 2026 y renovación de cargos.',
   '2026-03-12 18:00:00+01',
   E'ACTA DE LA JUNTA ORDINARIA (documento de demostración)\n\nAsistentes: 9 de 10 viviendas.\n\n1. Se aprueban las cuentas del ejercicio 2025.\n2. Se aprueba el presupuesto 2026.\n3. Se renueva a la presidenta por un año.\n\nSin más asuntos, se levanta la sesión a las 19:40.',
   'in_progress', '2026-03-12 18:05:00+01', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'Junta extraordinaria: rehabilitación de fachada',
   'Elección de presupuesto para la rehabilitación de la fachada y forma de pago.',
   '2026-10-16 18:30:00+02', null,
   'in_progress', '2026-10-16 18:35:00+02', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
   'Junta ordinaria 2027',
   'Borrador de la próxima junta ordinaria.',
   '2027-03-11 18:00:00+01', null,
   'draft', null, 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
   'Junta extraordinaria: ascensor',
   'Sustitución del ascensor.',
   '2026-10-20 19:00:00+02', null,
   'in_progress', '2026-10-16 10:00:00+02', 'a0000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Preguntas (todas nacen en borrador) y opciones
-- ---------------------------------------------------------------------------
insert into public.questions (id, meeting_id, title, description, position) values
  -- Junta ordinaria 2026 (finalizada)
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Aprobación de las cuentas del ejercicio 2025', null, 1),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Aprobación del presupuesto 2026', 'Presupuesto total: 18.400 €.', 2),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'Renovación de la presidencia por un año', null, 3),
  -- Junta extraordinaria (en curso)
  ('f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'Elección del presupuesto de rehabilitación', 'Presupuesto A: 84.500 €. Presupuesto B: 91.200 € (incluye aislamiento).', 1),
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002', 'Pago mediante derrama en 12 meses', null, 2),
  ('f0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002', 'Horario de los trabajos', null, 3),
  ('f0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000002', 'Instalación de puntos de recarga en el garaje', 'Punto pendiente de presentar a la junta.', 4),
  -- Junta ordinaria 2027 (borrador)
  ('f0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000003', 'Aprobación de las cuentas del ejercicio 2026', null, 1),
  -- Mirador del Parque (en curso)
  ('f0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000004', 'Sustitución del ascensor', null, 1);

insert into public.answer_options (id, question_id, label, position)
select ('b0000000-0000-4000-8000-' || lpad(row_number() over (order by q, pos)::text, 12, '0'))::uuid, q, label, pos
from (values
  ('f0000000-0000-4000-8000-000000000001'::uuid, 'A favor', 1), ('f0000000-0000-4000-8000-000000000001', 'En contra', 2), ('f0000000-0000-4000-8000-000000000001', 'Abstención', 3),
  ('f0000000-0000-4000-8000-000000000002', 'A favor', 1), ('f0000000-0000-4000-8000-000000000002', 'En contra', 2), ('f0000000-0000-4000-8000-000000000002', 'Abstención', 3),
  ('f0000000-0000-4000-8000-000000000003', 'Sí', 1), ('f0000000-0000-4000-8000-000000000003', 'No', 2),
  ('f0000000-0000-4000-8000-000000000004', 'Presupuesto A', 1), ('f0000000-0000-4000-8000-000000000004', 'Presupuesto B', 2), ('f0000000-0000-4000-8000-000000000004', 'Ninguno', 3),
  ('f0000000-0000-4000-8000-000000000005', 'A favor', 1), ('f0000000-0000-4000-8000-000000000005', 'En contra', 2), ('f0000000-0000-4000-8000-000000000005', 'Abstención', 3),
  ('f0000000-0000-4000-8000-000000000006', 'Mañanas (8:00–14:00)', 1), ('f0000000-0000-4000-8000-000000000006', 'Tardes (15:00–20:00)', 2),
  ('f0000000-0000-4000-8000-000000000007', 'A favor', 1), ('f0000000-0000-4000-8000-000000000007', 'En contra', 2), ('f0000000-0000-4000-8000-000000000007', 'Abstención', 3),
  ('f0000000-0000-4000-8000-000000000008', 'A favor', 1), ('f0000000-0000-4000-8000-000000000008', 'En contra', 2), ('f0000000-0000-4000-8000-000000000008', 'Abstención', 3),
  ('f0000000-0000-4000-8000-000000000009', 'A favor', 1), ('f0000000-0000-4000-8000-000000000009', 'En contra', 2), ('f0000000-0000-4000-8000-000000000009', 'Abstención', 3)
) as t(q, label, pos);

-- ---------------------------------------------------------------------------
-- Estados de las preguntas
-- ---------------------------------------------------------------------------
update public.questions set status = 'open', opened_at = '2026-03-12 18:10:00+01'
where meeting_id = 'e0000000-0000-4000-8000-000000000001';

update public.questions set status = 'open', opened_at = '2026-10-16 18:40:00+02'
where id in ('f0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000006');

update public.questions set status = 'open', opened_at = '2026-10-16 10:05:00+02'
where id = 'f0000000-0000-4000-8000-000000000009';

-- ---------------------------------------------------------------------------
-- Votos
-- ---------------------------------------------------------------------------
create temporary table seed_votes (question_id uuid, dwelling text, option_label text);
insert into seed_votes values
  -- Cuentas 2025: 7 a favor, 1 en contra, 1 abstención (9 de 10 viviendas)
  ('f0000000-0000-4000-8000-000000000001', '1º A', 'A favor'), ('f0000000-0000-4000-8000-000000000001', '1º B', 'A favor'),
  ('f0000000-0000-4000-8000-000000000001', '2º A', 'A favor'), ('f0000000-0000-4000-8000-000000000001', '2º B', 'A favor'),
  ('f0000000-0000-4000-8000-000000000001', '3º A', 'A favor'), ('f0000000-0000-4000-8000-000000000001', '3º B', 'A favor'),
  ('f0000000-0000-4000-8000-000000000001', '4º A', 'A favor'), ('f0000000-0000-4000-8000-000000000001', '4º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000001', 'Ático', 'Abstención'),
  -- Presupuesto 2026: 5 a favor, 4 en contra
  ('f0000000-0000-4000-8000-000000000002', '1º A', 'A favor'), ('f0000000-0000-4000-8000-000000000002', '1º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000002', '2º A', 'A favor'), ('f0000000-0000-4000-8000-000000000002', '2º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000002', '3º A', 'A favor'), ('f0000000-0000-4000-8000-000000000002', '3º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000002', '4º A', 'A favor'), ('f0000000-0000-4000-8000-000000000002', '4º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000002', 'Ático', 'A favor'),
  -- Presidencia: 6 sí, 2 no
  ('f0000000-0000-4000-8000-000000000003', '1º A', 'Sí'), ('f0000000-0000-4000-8000-000000000003', '1º B', 'Sí'),
  ('f0000000-0000-4000-8000-000000000003', '2º A', 'Sí'), ('f0000000-0000-4000-8000-000000000003', '2º B', 'No'),
  ('f0000000-0000-4000-8000-000000000003', '3º A', 'Sí'), ('f0000000-0000-4000-8000-000000000003', '3º B', 'Sí'),
  ('f0000000-0000-4000-8000-000000000003', '4º B', 'No'), ('f0000000-0000-4000-8000-000000000003', 'Ático', 'Sí'),
  -- Rehabilitación (abierta): 3 votos hasta ahora
  ('f0000000-0000-4000-8000-000000000004', '1º A', 'Presupuesto A'), ('f0000000-0000-4000-8000-000000000004', '1º B', 'Presupuesto B'),
  ('f0000000-0000-4000-8000-000000000004', '2º A', 'Presupuesto A'),
  -- Derrama (se cerrará): 4 a favor, 3 en contra, 1 abstención
  ('f0000000-0000-4000-8000-000000000005', '1º A', 'A favor'), ('f0000000-0000-4000-8000-000000000005', '1º B', 'En contra'),
  ('f0000000-0000-4000-8000-000000000005', '2º A', 'A favor'), ('f0000000-0000-4000-8000-000000000005', '2º B', 'A favor'),
  ('f0000000-0000-4000-8000-000000000005', '3º A', 'En contra'), ('f0000000-0000-4000-8000-000000000005', '3º B', 'A favor'),
  ('f0000000-0000-4000-8000-000000000005', '4º B', 'En contra'), ('f0000000-0000-4000-8000-000000000005', 'Ático', 'Abstención'),
  -- Ascensor (Mirador, abierta): 2 votos
  ('f0000000-0000-4000-8000-000000000009', '1º', 'A favor'), ('f0000000-0000-4000-8000-000000000009', '2º', 'En contra');

insert into public.votes (question_id, member_id, option_id, created_at, updated_at)
select sv.question_id, cm.id, o.id, q.opened_at + interval '5 minutes', q.opened_at + interval '5 minutes'
from seed_votes sv
join public.questions q on q.id = sv.question_id
join public.meetings m on m.id = q.meeting_id
join public.community_members cm on cm.community_id = m.community_id and cm.dwelling_label = sv.dwelling
join public.answer_options o on o.question_id = sv.question_id and o.label = sv.option_label;

drop table seed_votes;

-- Cierres
update public.questions set status = 'closed', closed_at = '2026-03-12 19:30:00+01'
where meeting_id = 'e0000000-0000-4000-8000-000000000001';

update public.questions set status = 'closed', closed_at = '2026-10-16 19:00:00+02'
where id = 'f0000000-0000-4000-8000-000000000005';

insert into public.question_status_log (question_id, from_status, to_status, changed_by, changed_at)
select q.id, 'draft'::public.question_status, 'open'::public.question_status, 'a0000000-0000-4000-8000-000000000001'::uuid, q.opened_at
from public.questions q where q.status <> 'draft' and q.meeting_id <> 'e0000000-0000-4000-8000-000000000004'
union all
select q.id, 'open', 'closed', 'a0000000-0000-4000-8000-000000000001', q.closed_at
from public.questions q where q.status = 'closed'
union all
select q.id, 'draft', 'open', 'a0000000-0000-4000-8000-000000000002', q.opened_at
from public.questions q where q.meeting_id = 'e0000000-0000-4000-8000-000000000004';

-- Finalizar la junta ordinaria 2026 (a partir de aquí es de solo lectura)
update public.meetings set status = 'finished', finished_at = '2026-03-12 19:40:00+01'
where id = 'e0000000-0000-4000-8000-000000000001';
