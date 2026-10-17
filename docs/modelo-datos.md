# Modelo de datos y reglas del servidor

## Diagrama

```
communities 1─┬─< community_admins >── auth.users            (administradores por comunidad)
              ├─< community_members  (una fila = una vivienda = un voto)
              │      ├─1─1 member_private      (DNI; solo lo lee la administración)
              │      ├─1─1 member_credentials  (hash bcrypt del PIN, intentos, bloqueo; sin acceso desde el cliente)
              │      └─1─< member_sessions >── auth.users (sesiones anónimas vinculadas a la vivienda)
              └─< meetings 1─< questions 1─< answer_options
                                   ├─< votes  UNIQUE(question_id, member_id)
                                   │          FK (question_id, option_id) → answer_options(question_id, id)
                                   └─< question_status_log
profiles 1─1 auth.users (nombre visible de la administración)
```

## Decisiones aprobadas y cómo se aplican

| Decisión                                                               | Aplicación                                                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Varias comunidades en el esquema; la interfaz trabaja con una activa   | Todas las tablas cuelgan de `communities`; RLS por comunidad; selector si un administrador tiene varias        |
| Un voto por vivienda, sin coeficientes                                 | `UNIQUE (question_id, member_id)` en `votes`                                                                   |
| Acceso: nombre + DNI + vivienda + PIN                                  | Sesión anónima de Supabase Auth + RPC `member_sign_in`, que la vincula a la vivienda (`member_sessions`)       |
| El DNI solo lo ve la administración                                    | Tabla aparte `member_private` con RLS solo para administración; en la interfaz aparece enmascarado por defecto |
| Voto nominal visible para la administración                            | `votes.member_id`; detalle nominal mediante `admin_meeting_votes` (solo administración)                        |
| El voto se puede modificar mientras la pregunta está abierta           | `cast_vote` hace un _upsert_; la pregunta cerrada lo rechaza                                                   |
| Reapertura conservando votos                                           | `reopen_question`: closed → open; nadie pierde su voto y todos pueden votar o cambiarlo                        |
| Solo selección única                                                   | Enum `response_type = 'single_choice'`                                                                         |
| Acta en texto + PDF                                                    | `meetings.minutes_content` + bucket privado `minutes` (`{meeting_id}/…pdf`, máx. 10 MB, solo PDF)              |
| Resultados: administración en vivo, propietarios tras el cierre        | `get_meeting_results` filtra por rol                                                                           |
| Pregunta editable solo en borrador; reunión finalizada en solo lectura | Triggers `guard_*` (se aplican a cualquier escritura, venga de donde venga)                                    |

## Estados

```
Reunión:   draft (en preparación) ──start_meeting──▶ in_progress (en curso) ──finish_meeting──▶ finished
Pregunta:  draft ──open_question / open_eligible_questions──▶ open ──close_question / close_open_questions──▶ closed
                                                              ▲                                            │
                                                              └──────────────── reopen_question ───────────┘
```

- Iniciar una reunión **no** abre ninguna pregunta.
- Las preguntas solo se abren con la reunión en curso. Para abrir una hacen falta al menos 2 opciones.
- «Abrir elegibles» solo abre preguntas en borrador; nunca reabre las cerradas.
- Finalizar la reunión cierra las preguntas abiertas en la misma transacción.
- La reapertura solo es posible con la reunión en curso.

## Autorización

El cliente usa siempre la clave pública. El rol `anon` (sin sesión) no tiene ningún permiso. Los permisos de `authenticated` (administradores y propietarios) son estos:

| Tabla                      | Propietario                                | Administración de la comunidad                                             |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| communities                | leer la suya                               | leer y editar nombre/dirección                                             |
| community_members          | solo su vivienda                           | leer el censo (escrituras por RPC)                                         |
| member_private             | —                                          | leer DNI                                                                   |
| member_credentials         | —                                          | —                                                                          |
| meetings                   | leer las que no están en preparación       | crear, editar y borrar (solo en preparación); `status` solo cambia por RPC |
| questions / answer_options | leer las no borrador de reuniones visibles | leer todas (escrituras por RPC)                                            |
| votes                      | leer los suyos                             | leer todos los de su comunidad                                             |
| question_status_log        | —                                          | leer                                                                       |

Los permisos por columna impiden, por ejemplo, que un `UPDATE meetings SET status = …` llegue siquiera a evaluarse.

## Funciones RPC

Son `SECURITY DEFINER`, con `search_path` vacío, ejecutables solo por `authenticated`. Cada una comprueba la autorización al principio y se ejecuta en una sola transacción.

| Función                                                                   | Quién          | Notas                                                      |
| ------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `member_sign_in`, `member_sign_out`, `get_my_membership`                  | sesión anónima | bloqueo de 15 min tras 5 intentos fallidos                 |
| `cast_vote`                                                               | propietario    | `FOR SHARE` sobre la pregunta + `UNIQUE` + FK compuesta    |
| `start_meeting`, `finish_meeting`                                         | administración |                                                            |
| `open_question`, `close_question`, `reopen_question`                      | administración | bloqueo reunión → pregunta (orden fijo, sin interbloqueos) |
| `open_eligible_questions`, `close_open_questions`                         | administración | devuelven cuántas preguntas cambiaron                      |
| `admin_save_question`, `admin_delete_question`, `admin_reorder_questions` | administración | pregunta + opciones de forma atómica                       |
| `admin_create_member`, `admin_update_member`, `admin_reset_member_pin`    | administración | el PIN en claro solo se devuelve al crearlo o regenerarlo  |
| `get_meeting_results`, `admin_meeting_votes`, `admin_dashboard`           | según rol      |                                                            |

### Por qué el voto es seguro ante la concurrencia

1. `cast_vote` bloquea la fila de la pregunta con `FOR SHARE` y comprueba `status = 'open'`.
2. El cierre es un `UPDATE` sobre esa fila, así que espera a los votos en curso. Un voto que llega después ve la pregunta ya cerrada y se rechaza con `question_not_open`.
3. `UNIQUE (question_id, member_id)` + `ON CONFLICT DO UPDATE` garantiza una sola fila por vivienda aunque lleguen 20 peticiones a la vez.
4. La FK compuesta `(question_id, option_id)` impide votar una opción de otra pregunta.

Las pruebas `src/tests/integration/concurrency.test.ts` lo comprueban con peticiones HTTP simultáneas reales.

## Resultados: definiciones

- **% por opción** = votos de la opción / votos emitidos en la pregunta. Sin votos, se muestra «—» y no «0 %».
- **Participación** = votos emitidos / viviendas **activas** del censo en el momento de la consulta.
- **Participación por reunión (panel)** = viviendas que han votado al menos una pregunta / viviendas activas.
- Los porcentajes se redondean a 1 decimal, así que la suma puede ser 99,9 % o 100,1 %.

## Migraciones

| Archivo                              | Contenido                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `20261016100000_core_schema.sql`     | Tablas, restricciones, índices, triggers de reglas                          |
| `20261016100100_authorization.sql`   | Funciones auxiliares, permisos, RLS, publicación Realtime                   |
| `20261016100200_rpc.sql`             | Operaciones críticas                                                        |
| `20261016100300_minutes_storage.sql` | Bucket privado de actas y sus políticas                                     |
| `20261016120000_community_files.sql` | Logo de la comunidad, tipo de acceso de la sesión, bucket `community-files` |
| `20261016120100_incidents.sql`       | Incidencias e historial                                                     |
| `20261016120200_reservations.sql`    | Espacios, franjas y reservas (restricción EXCLUDE)                          |
| `20261016120300_notices_board.sql`   | Avisos, lecturas y tablón vecinal con moderación                            |
| `20261016120400_finance.sql`         | Recibos por vivienda y documentos de la comunidad                           |
| `20261016120500_member_access.sql`   | Acceso completo (DNI + contraseña), primer acceso y solo votación (PIN)     |

## Acceso de los vecinos

Cada sesión anónima de Supabase Auth se vincula a una vivienda en `member_sessions` con un **tipo de acceso**:

| Tipo   | Cómo se obtiene                                                                                                                     | Qué permite              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `full` | `member_password_sign_in(dni, contraseña)` o, la primera vez, `member_activate(dni, pin, contraseña)`                               | Todo el portal           |
| `vote` | `member_sign_in(nombre, dni, vivienda, pin)`: **solo se valida el PIN** y el resto solo tiene que estar relleno (decisión aprobada) | Solo juntas y votaciones |

- **El PIN.** Es único en todo el sistema (índice único sobre su huella SHA-256) y se guarda también con bcrypt.
- **La contraseña.** Solo existe su hash bcrypt; la administración nunca la conoce. Generar un PIN nuevo la borra.
- **Los intentos fallidos.** Se cuentan por sesión (`login_attempts`, 5 intentos y 15 minutos de bloqueo) y, con contraseña, también por vivienda.
- **Las políticas de los módulos.** Usan `private.is_full_member()` y `private.full_member_id()`, así que una sesión de solo votación no ve nada fuera de las votaciones, tampoco por la API.

## Módulos de comunidad

```
communities 1─< incidents 1─< incident_updates        (historial visible para la comunidad)
            1─< common_spaces 1─< space_slots
                              1─< reservations >─ community_members   EXCLUDE (espacio, rango horario)
            1─< notices 1─< notice_reads >─ community_members
            1─< board_posts >─ community_members        (pending → approved/rejected → withdrawn)
            1─< receipts >─ community_members            (privados por vivienda)
            1─< community_documents                      (visibles para toda la comunidad)
```

| Módulo      | Lectura                                                                                                                                                                                       | Escritura                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incidencias | Toda la comunidad (acceso completo), **incluida la vivienda que la abrió** (decisión aprobada)                                                                                                | Vecinos: `member_report_incident`. Administración: `admin_create_incident`, `admin_update_incident`; cada cambio genera una entrada en el historial en la misma transacción |
| Reservas    | Cada vivienda ve **solo sus reservas**; la ocupación ajena se consulta con `get_space_availability` (libre, ocupado, mía), que nunca revela quién reservó                                     | `member_book_slot`, `member_cancel_reservation`, `admin_cancel_reservation`, `admin_save_space`                                                                             |
| Avisos      | Vecinos: publicados y no caducados. Administración: todos, con lecturas                                                                                                                       | Administración (tabla con RLS); los vecinos marcan como leído con `mark_notice_read`                                                                                        |
| Tablón      | Vecinos: aprobadas + las suyas. Administración: todas                                                                                                                                         | `member_create_board_post` (máximo 3 pendientes), `member_withdraw_board_post`, `admin_moderate_board_post`                                                                 |
| Recibos     | Cada vivienda, solo los suyos. Administración: todos                                                                                                                                          | Administración (tabla con RLS) y `admin_issue_receipts` (uno por vivienda activa, sin duplicar)                                                                             |
| Documentos  | Toda la comunidad                                                                                                                                                                             | Administración                                                                                                                                                              |
| Archivos    | Bucket privado `community-files`, con rutas `{comunidad}/{área}/…`. Recibos en `{comunidad}/receipts/{vivienda}/…`, solo para su vivienda. Los vecinos solo pueden subir fotos de incidencias | Ver `private.can_*_community_file`                                                                                                                                          |

### Reservas sin dobles reservas

1. La restricción `EXCLUDE USING gist (space_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE status = 'confirmed'` hace imposible solapar dos reservas confirmadas del mismo espacio.
2. `member_book_slot` bloquea antes la fila del espacio y después la de la vivienda (siempre en ese orden). Sin ese bloqueo, las pruebas de integración con 8 reservas simultáneas de la misma franja demostraron que PostgreSQL resolvía la competencia con _deadlocks_ en lugar de devolver «franja ocupada». Ahora gana una sola reserva y las demás reciben `slot_taken`.
3. El límite de reservas futuras se cuenta por **vivienda y espacio**: 2 en barbacoa y pádel, 1 en el salón (configurable).

Las franjas se convierten a fecha y hora reales en hora de Madrid. Si el fin es anterior al inicio (por ejemplo 20:00–00:00), la franja termina al día siguiente.
