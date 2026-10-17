-- PortalActivo · Datos de demostración de los módulos de comunidad (ficticios)
-- Fechas relativas a hoy para que la demo siga vigente. Se carga después de seed.sql.
-- Los PDF referenciados se generan con `node scripts/seed-files.mjs` (lo hace `npm run db:reset`).

-- ---------------------------------------------------------------------------
-- Incidencias
-- ---------------------------------------------------------------------------
insert into public.incidents (
  id, community_id, reported_by_member, reported_dwelling, title, description, location, category,
  status, responsible_type, responsible_name, estimated_resolution, resolved_at, created_by, created_at
) values
  ('1a000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', '2º B',
   'Filtración de agua en el garaje', 'Cae agua del techo junto a la plaza 34 cuando llueve. Hay un charco permanente y el suelo resbala.',
   'Garaje, planta -1, plaza 34', 'plumbing', 'in_progress', 'developer', 'Promotora (garantía de la obra)',
   current_date + 7, null, null, now() - interval '9 days'),
  ('1a000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000009', 'Ático',
   'Ascensor del portal 2 parado', 'El ascensor se queda parado entre la 2ª y la 3ª planta y no responde al botón de llamada.',
   'Portal 2', 'elevator', 'in_progress', 'company', 'Ascensores Norte, S.L. (ficticia)',
   current_date + 1, null, null, now() - interval '2 days'),
  ('1a000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '1º A',
   'Farola fundida junto a la piscina', 'La farola del camino de la piscina no se enciende por la noche.',
   'Zona de piscina', 'electricity', 'resolved', 'company', 'Mantenimientos Integrales (ficticia)',
   null, now() - interval '3 days', null, now() - interval '12 days'),
  ('1a000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', '4º A',
   'La puerta del garaje no termina de cerrar', 'Se queda abierta unos 30 cm después de pasar el coche.',
   'Acceso al garaje', 'security', 'reported', null, null, null, null, null, now() - interval '3 hours'),
  ('1a000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', null, null,
   'Grietas en el muro del jardín', 'Se han detectado grietas horizontales en el muro de contención del jardín norte.',
   'Jardín norte', 'structure', 'in_review', 'insurance', 'Seguro de la comunidad',
   null, null, 'a0000000-0000-4000-8000-000000000001', now() - interval '5 days'),
  ('1a000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', '3º B',
   'Aspersor roto en la zona verde', 'Un aspersor pierde agua de forma continua.',
   'Zona verde central', 'gardening', 'dismissed', null, null, null, null, null, now() - interval '20 days'),
  ('1a000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000011', '1º',
   'Luz del rellano parpadea', 'La luz del rellano del primero parpadea.', 'Rellano 1º', 'electricity',
   'reported', null, null, null, null, null, now() - interval '1 day');

insert into public.incident_updates (incident_id, message, status, responsible_type, responsible_name, author_label, created_at) values
  ('1a000000-0000-4000-8000-000000000001', 'Incidencia registrada.', 'reported', null, null, 'Vivienda 2º B', now() - interval '9 days'),
  ('1a000000-0000-4000-8000-000000000001', 'Revisada en visita: la filtración viene de la junta de dilatación de la rampa.', 'in_review', null, null, 'Administración', now() - interval '8 days'),
  ('1a000000-0000-4000-8000-000000000001', 'Comunicada a la promotora como defecto cubierto por la garantía.', null, 'developer', 'Promotora (garantía de la obra)', 'Administración', now() - interval '6 days'),
  ('1a000000-0000-4000-8000-000000000001', 'La promotora confirma la reparación para la próxima semana.', 'in_progress', null, null, 'Administración', now() - interval '2 days'),
  ('1a000000-0000-4000-8000-000000000002', 'Incidencia registrada.', 'reported', null, null, 'Vivienda Ático', now() - interval '2 days'),
  ('1a000000-0000-4000-8000-000000000002', 'Aviso urgente a la empresa de mantenimiento. Técnico en camino.', 'in_progress', 'company', 'Ascensores Norte, S.L. (ficticia)', 'Administración', now() - interval '2 days' + interval '40 minutes'),
  ('1a000000-0000-4000-8000-000000000002', 'Falta una pieza del cuadro de maniobra; llega mañana.', null, null, null, 'Administración', now() - interval '1 day'),
  ('1a000000-0000-4000-8000-000000000003', 'Incidencia registrada.', 'reported', null, null, 'Vivienda 1º A', now() - interval '12 days'),
  ('1a000000-0000-4000-8000-000000000003', 'Encargada a mantenimiento.', 'in_progress', 'company', 'Mantenimientos Integrales (ficticia)', 'Administración', now() - interval '10 days'),
  ('1a000000-0000-4000-8000-000000000003', 'Lámpara sustituida. Comprobado su funcionamiento.', 'resolved', null, null, 'Administración', now() - interval '3 days'),
  ('1a000000-0000-4000-8000-000000000004', 'Incidencia registrada.', 'reported', null, null, 'Vivienda 4º A', now() - interval '3 hours'),
  ('1a000000-0000-4000-8000-000000000005', 'Incidencia registrada por la administración.', 'reported', null, null, 'Administración', now() - interval '5 days'),
  ('1a000000-0000-4000-8000-000000000005', 'Parte abierto con el seguro. Pendiente de la visita del perito.', 'in_review', 'insurance', 'Seguro de la comunidad', 'Administración', now() - interval '4 days'),
  ('1a000000-0000-4000-8000-000000000006', 'Incidencia registrada.', 'reported', null, null, 'Vivienda 3º B', now() - interval '20 days'),
  ('1a000000-0000-4000-8000-000000000006', 'Duplicada: ya se reparó en la revisión del riego del día anterior.', 'dismissed', null, null, 'Administración', now() - interval '19 days'),
  ('1a000000-0000-4000-8000-000000000007', 'Incidencia registrada.', 'reported', null, null, 'Vivienda 1º', now() - interval '1 day');

-- ---------------------------------------------------------------------------
-- Zonas comunes y reservas
-- ---------------------------------------------------------------------------
insert into public.common_spaces (id, community_id, name, description, rules, max_future_per_member, cancel_notice_hours, booking_window_days) values
  ('2b000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Barbacoa',
   'Zona de barbacoa junto a la piscina, con dos mesas para 12 personas y fregadero.',
   E'Máximo 12 personas.\nDeja la parrilla y las mesas limpias al terminar.\nNo se puede usar en días de alerta por riesgo de incendio.',
   2, 24, 30),
  ('2b000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Pista de pádel',
   'Pista exterior con iluminación. Las palas no están incluidas.',
   E'Turnos de 90 minutos.\nCalzado deportivo obligatorio.',
   2, 12, 7),
  ('2b000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Salón social',
   'Sala cerrada de 40 m² con mesas, sillas y cocina office. Ideal para cumpleaños y reuniones.',
   E'Prohibido el ruido a partir de las 22:00.\nLa fianza se gestiona con la administración.',
   1, 48, 60),
  ('2b000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Terraza comunitaria',
   'Terraza en la cubierta.', null, 2, 24, 30);

insert into public.space_slots (id, space_id, label, start_time, end_time, weekdays, position) values
  ('3c000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', 'Comida', '13:00', '17:00', '{1,2,3,4,5,6,7}', 1),
  ('3c000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000001', 'Cena', '20:00', '00:00', '{1,2,3,4,5,6,7}', 2),
  ('3c000000-0000-4000-8000-000000000003', '2b000000-0000-4000-8000-000000000002', '09:00', '09:00', '10:30', '{1,2,3,4,5,6,7}', 1),
  ('3c000000-0000-4000-8000-000000000004', '2b000000-0000-4000-8000-000000000002', '10:30', '10:30', '12:00', '{1,2,3,4,5,6,7}', 2),
  ('3c000000-0000-4000-8000-000000000005', '2b000000-0000-4000-8000-000000000002', '17:00', '17:00', '18:30', '{1,2,3,4,5,6,7}', 3),
  ('3c000000-0000-4000-8000-000000000006', '2b000000-0000-4000-8000-000000000002', '18:30', '18:30', '20:00', '{1,2,3,4,5,6,7}', 4),
  ('3c000000-0000-4000-8000-000000000007', '2b000000-0000-4000-8000-000000000002', '20:00', '20:00', '21:30', '{1,2,3,4,5,6,7}', 5),
  ('3c000000-0000-4000-8000-000000000008', '2b000000-0000-4000-8000-000000000003', 'Mañana', '10:00', '14:00', '{1,2,3,4,5,6,7}', 1),
  ('3c000000-0000-4000-8000-000000000009', '2b000000-0000-4000-8000-000000000003', 'Tarde', '16:00', '21:00', '{1,2,3,4,5,6,7}', 2),
  ('3c000000-0000-4000-8000-000000000010', '2b000000-0000-4000-8000-000000000004', 'Día completo', '10:00', '22:00', '{6,7}', 1);

-- Reservas (calculadas en hora de Madrid) y una cancelada para el historial.
insert into public.reservations (community_id, space_id, slot_id, slot_label, member_id, starts_at, ends_at, status, cancelled_at, cancelled_by, created_at)
select s.community_id, s.id, sl.id, sl.label, m.member_id, r.o_starts, r.o_ends, m.status,
       case when m.status = 'cancelled' then now() - interval '1 day' end,
       case when m.status = 'cancelled' then 'member' end,
       now() - interval '2 days'
from (values
  ('3c000000-0000-4000-8000-000000000002'::uuid, 1, 'd0000000-0000-4000-8000-000000000002'::uuid, 'confirmed'), -- barbacoa, cena de mañana (1º B)
  ('3c000000-0000-4000-8000-000000000001', 3, 'd0000000-0000-4000-8000-000000000003', 'confirmed'),              -- barbacoa +3, comida (2º A)
  ('3c000000-0000-4000-8000-000000000006', 1, 'd0000000-0000-4000-8000-000000000007', 'confirmed'),              -- pádel mañana 18:30 (4º A)
  ('3c000000-0000-4000-8000-000000000007', 2, 'd0000000-0000-4000-8000-000000000005', 'confirmed'),              -- pádel +2 20:00 (3º A)
  ('3c000000-0000-4000-8000-000000000009', 9, 'd0000000-0000-4000-8000-000000000001', 'confirmed'),              -- salón +9 tarde (1º A)
  ('3c000000-0000-4000-8000-000000000001', 5, 'd0000000-0000-4000-8000-000000000008', 'cancelled')               -- cancelada (4º B)
) as m(slot_id, days_ahead, member_id, status)
join public.space_slots sl on sl.id = m.slot_id
join public.common_spaces s on s.id = sl.space_id
cross join lateral private.slot_range(current_date + m.days_ahead, sl.start_time, sl.end_time) r;

-- ---------------------------------------------------------------------------
-- Avisos y tablón
-- ---------------------------------------------------------------------------
insert into public.notices (id, community_id, title, body, category, is_urgent, is_pinned, attachment_path, attachment_name, published_at, expires_at, created_by) values
  ('4d000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Corte de agua el jueves de 9:00 a 13:00',
   E'La compañía de aguas realizará trabajos en la acometida general.\n\nDurante el corte no funcionarán los grifos ni las cisternas. Os recomendamos llenar alguna garrafa la noche anterior.',
   'maintenance', true, true, null, null, now() - interval '1 day', now() + interval '5 days', 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'Comienzan las obras de la fachada',
   E'El lunes empieza el montaje del andamio en la fachada sur. Durante las obras se cerrará la acera de ese lado del edificio.\n\nAdjuntamos el calendario previsto de trabajos.',
   'works', false, true, 'c0000000-0000-4000-8000-000000000001/notices/calendario-obras-fachada.pdf', 'Calendario de obras.pdf',
   now() - interval '3 days', null, 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
   'Convocatoria: junta extraordinaria',
   E'Se convoca junta extraordinaria para elegir el presupuesto de rehabilitación de la fachada.\n\nPodréis votar cada punto desde la sección Votaciones mientras esté abierta.',
   'meeting', false, false, null, null, now() - interval '5 days', null, 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001',
   'Nuevo horario de limpieza de portales',
   'A partir de este mes la limpieza de portales y escaleras se hará los martes y viernes por la mañana.',
   'cleaning', false, false, null, null, now() - interval '10 days', null, 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001',
   'Revisión anual de extintores',
   'La empresa de protección contra incendios revisará los extintores de los portales y del garaje.',
   'security', false, false, null, null, now() + interval '2 days', null, 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001',
   'Piscina: fin de temporada',
   'La piscina cerró el 15 de septiembre. ¡Gracias por cuidar las instalaciones!',
   'general', false, false, null, null, now() - interval '40 days', now() - interval '30 days', 'a0000000-0000-4000-8000-000000000001'),
  ('4d000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002',
   'Limpieza de la terraza', 'El sábado se limpiará la terraza comunitaria.', 'cleaning', false, false, null, null,
   now() - interval '1 day', null, 'a0000000-0000-4000-8000-000000000002');

insert into public.notice_reads (notice_id, member_id, read_at)
select '4d000000-0000-4000-8000-000000000001', id, now() - interval '20 hours'
from public.community_members
where id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003',
             'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000009');

insert into public.board_posts (id, community_id, member_id, author_dwelling, title, body, category, status, moderation_note, moderated_by, moderated_at, created_at) values
  ('5e000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', '1º B',
   'Encontradas unas llaves en el portal 2', 'Llavero azul con tres llaves. Las he dejado en el buzón de la administración.',
   'lost_found', 'approved', null, 'a0000000-0000-4000-8000-000000000001', now() - interval '1 day', now() - interval '26 hours'),
  ('5e000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', '3º A',
   'Vendo bicicleta infantil', 'Bicicleta de 16 pulgadas, poco uso, con ruedines. 40 €. Preguntad en el 3º A.',
   'buy_sell', 'approved', null, 'a0000000-0000-4000-8000-000000000001', now() - interval '4 days', now() - interval '4 days 5 hours'),
  ('5e000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', '2º A',
   'Recomendación de fontanero', 'Muy contentos con el fontanero que nos arregló el calentador: rápido y buen precio. Os paso el contacto si lo necesitáis.',
   'recommendation', 'approved', null, 'a0000000-0000-4000-8000-000000000001', now() - interval '8 days', now() - interval '8 days 1 hour'),
  ('5e000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', '4º A',
   'Clases de inglés para niños', 'Soy profesora titulada y ofrezco clases de inglés para niños de la comunidad los sábados por la mañana.',
   'announcement', 'pending', null, null, null, now() - interval '5 hours'),
  ('5e000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000009', 'Ático',
   'Busco plaza de garaje en alquiler', 'Busco plaza de garaje en alquiler a partir del mes que viene.',
   'other', 'pending', null, null, null, now() - interval '30 minutes'),
  ('5e000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', '4º B',
   'Queja sobre un vecino', 'Publicación con el nombre y el teléfono de otro vecino.',
   'other', 'rejected', 'Contiene datos personales de otra persona. Usa la sección de incidencias o escribe a la administración.',
   'a0000000-0000-4000-8000-000000000001', now() - interval '6 days', now() - interval '6 days 3 hours');

-- ---------------------------------------------------------------------------
-- Recibos y documentos
-- ---------------------------------------------------------------------------
insert into public.receipts (community_id, member_id, concept, period_start, amount_cents, due_date, status, paid_at)
select cm.community_id, cm.id, 'Cuota ordinaria',
       (date_trunc('month', current_date) - make_interval(months => p.months_ago))::date,
       8500,
       (date_trunc('month', current_date) - make_interval(months => p.months_ago))::date + 9,
       case
         when p.months_ago = 0 and cm.dwelling_label in ('2º B', '4º B', 'Local 1') then 'pending'
         when p.months_ago = 0 and current_date < date_trunc('month', current_date)::date + 5 then 'pending'
         when p.months_ago = 1 and cm.dwelling_label = '4º B' then 'returned'
         when p.months_ago = 2 and cm.dwelling_label = 'Ático' then 'pending'
         else 'paid'
       end::public.receipt_status,
       case
         when p.months_ago = 0 and cm.dwelling_label in ('2º B', '4º B', 'Local 1') then null
         when p.months_ago = 0 and current_date < date_trunc('month', current_date)::date + 5 then null
         when p.months_ago = 1 and cm.dwelling_label = '4º B' then null
         when p.months_ago = 2 and cm.dwelling_label = 'Ático' then null
         else (date_trunc('month', current_date) - make_interval(months => p.months_ago))::date + 5
       end
from public.community_members cm
cross join (values (0), (1), (2)) as p(months_ago)
where cm.community_id = 'c0000000-0000-4000-8000-000000000001';

insert into public.receipts (community_id, member_id, concept, period_start, amount_cents, due_date, status, paid_at, file_path, file_name)
select cm.community_id, cm.id, 'Derrama rehabilitación de fachada (1/12)', date_trunc('month', current_date)::date, 15000,
       date_trunc('month', current_date)::date + 24, 'pending', null,
       case when cm.dwelling_label = '4º A' then cm.community_id || '/receipts/' || cm.id || '/derrama-fachada-1-12.pdf' end,
       case when cm.dwelling_label = '4º A' then 'Recibo derrama fachada 1-12.pdf' end
from public.community_members cm
where cm.community_id = 'c0000000-0000-4000-8000-000000000001';

insert into public.receipts (community_id, member_id, concept, period_start, amount_cents, due_date)
values ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000011', 'Cuota ordinaria',
        date_trunc('month', current_date)::date, 6000, date_trunc('month', current_date)::date + 9);

insert into public.community_documents (community_id, kind, title, supplier, amount_cents, document_date, file_path, file_name, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'invoice', 'Mantenimiento de ascensores', 'Ascensores Norte, S.L. (ficticia)', 32450,
   (date_trunc('month', current_date) - interval '1 month')::date + 27,
   'c0000000-0000-4000-8000-000000000001/documents/factura-ascensores.pdf', 'Factura ascensores.pdf', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', 'invoice', 'Limpieza de zonas comunes', 'Limpiezas del Este (ficticia)', 89000,
   (date_trunc('month', current_date) - interval '1 month')::date + 27,
   'c0000000-0000-4000-8000-000000000001/documents/factura-limpieza.pdf', 'Factura limpieza.pdf', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', 'budget', 'Rehabilitación de fachada: presupuesto A', 'Reformas Atlas (ficticia)', 8450000,
   current_date - 20,
   'c0000000-0000-4000-8000-000000000001/documents/presupuesto-fachada-a.pdf', 'Presupuesto fachada A.pdf', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', 'accounts', 'Cuentas anuales 2025', null, null, '2026-02-28',
   'c0000000-0000-4000-8000-000000000001/documents/cuentas-2025.pdf', 'Cuentas 2025.pdf', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', 'insurance', 'Póliza del seguro de la comunidad 2026', 'Seguros Horizonte (ficticia)', 214000, '2026-01-02',
   'c0000000-0000-4000-8000-000000000001/documents/poliza-seguro-2026.pdf', 'Póliza seguro 2026.pdf', 'a0000000-0000-4000-8000-000000000001');
