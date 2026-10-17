# Seguridad, privacidad y limitaciones

## Qué protege el MVP

- **Autorización en el servidor.** RLS, permisos por columna, triggers y funciones RPC. Ocultar botones en React es solo una mejora de usabilidad.
- **Sin claves privilegiadas en el navegador.** Solo se usa la clave pública. Una prueba de integración comprueba que la clave `service_role` no aparece en el bundle (`npm run build` antes de `npm run test:integration`).
- **Sin elevación de privilegios.** `community_admins` no admite escrituras desde el cliente. Los administradores se crean con `scripts/create-admin.mjs`.
- **Registro público bloqueado en la práctica.** Una cuenta creada desde fuera no puede iniciar sesión sin confirmar el email (`enable_confirmations = true`), y aunque lo hiciera no pertenecería a ninguna comunidad. No se desactiva el registro globalmente porque eso bloquearía también las sesiones anónimas de los propietarios (comprobado).
- **PIN.** Solo se guarda su hash bcrypt. Tras 5 intentos fallidos la vivienda se bloquea 15 minutos. Al regenerar el PIN se cierran las sesiones abiertas de esa vivienda.
- **Votos.** Atómicos, uno por vivienda y rechazados si la pregunta no está abierta (ver [modelo-datos.md](modelo-datos.md)).
- **Actas en PDF.** Bucket privado, solo `application/pdf`, máximo 10 MB y enlaces firmados de 5 minutos.

## Acceso de solo votación con PIN: riesgo aceptado

Por decisión aprobada, el acceso «Solo votar» **solo valida el PIN**: nombre, DNI y vivienda solo tienen que estar rellenos. En la práctica, quien obtenga el PIN de una vivienda puede votar por ella, y los datos que escriba no se comprueban ni se guardan. Para limitar el riesgo:

- **PIN único.** Ningún PIN se repite en todo el sistema y se generan con un generador criptográfico.
- **Límite de intentos.** 5 intentos fallidos por sesión y 15 minutos de bloqueo, además del límite de sesiones anónimas por IP de Supabase Auth.
- **Alcance mínimo.** La sesión solo ve votaciones: RLS le niega incidencias, reservas, avisos, recibos y archivos.

Para una votación con más garantías, conviene volver a exigir DNI + PIN, o DNI + contraseña, y valorar un PIN de 8 dígitos.

## Módulos y privacidad

| Dato                                  | Quién lo ve                                                               | Motivo                                                        |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Vivienda que abre una incidencia      | Toda la comunidad                                                         | Decisión aprobada (transparencia)                             |
| Fotos de incidencias                  | Toda la comunidad (bucket privado, enlaces firmados de 5 minutos)         | Se avisa al vecino de que no aparezcan personas               |
| Quién ha reservado un espacio         | Solo la administración; los vecinos ven «Ocupado»                         | Decisión aprobada                                             |
| Recibos y deudas                      | Solo la vivienda titular y la administración                              | La AEPD desaconseja exponer deudas de propietarios a terceros |
| Facturas y documentos de la comunidad | Toda la comunidad                                                         | Transparencia de las cuentas comunes                          |
| Publicaciones del tablón              | Toda la comunidad, firmadas con la vivienda y **solo tras su aprobación** | Moderación previa (decisión aprobada)                         |
| Contraseña del vecino                 | Nadie: solo se guarda su hash bcrypt                                      | La administración no puede conocerla                          |

## Datos personales (RGPD / LOPDGDD)

| Dato               | Para qué                                                   | Quién lo ve                                              |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| Nombre y apellidos | Reconocer al propietario y mostrarlo en el detalle nominal | Administración (y el propio propietario)                 |
| Vivienda           | Un voto por vivienda                                       | Administración (y el propio propietario)                 |
| DNI / NIE          | Reconocer al propietario al acceder (decisión aprobada)    | Solo administración; enmascarado por defecto en pantalla |
| Voto nominal       | Decisión aprobada: voto identificado                       | Administración; nunca otros propietarios                 |

- La **comunidad** es la responsable del tratamiento. Un proveedor que ofrezca PortalActivo sería **encargado** y necesitaría un contrato según el art. 28 del RGPD. Referencia: [guía de la AEPD para administradores de fincas](https://www.aepd.es/guias/guia-administradores-fincas.pdf).
- El DNI no es una contraseña: el factor de autenticación es el PIN. El DNI tiene poca entropía, así que aplicarle un hash no lo protegería; se guarda en una tabla separada con acceso restringido.
- Las estadísticas y los resultados que ven los propietarios no incluyen identificadores personales.
- La aplicación no registra datos personales en la consola ni en logs propios.

### Conservación (propuesta, no automatizada en el MVP)

| Dato                         | Propuesta                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sesiones anónimas vinculadas | Eliminar las que tengan más de 30 días (`auth.users` con `is_anonymous`)                                      |
| Votos nominales              | Conservar mientras la comunidad necesite justificar el resultado; después, anonimizar o eliminar              |
| DNI y censo                  | Eliminar cuando la vivienda deja de pertenecer a la comunidad (hoy se puede desactivar; el borrado es manual) |

## Limitaciones conocidas

- **No tiene validez legal.** Es una consulta informativa (el aviso que lo indicaba en pantalla y en el PDF se retiró a petición del cliente): no aplica coeficientes, mayorías de la LPH, quórum, convocatorias ni delegaciones. La reforma de la LPH para juntas telemáticas sigue en tramitación (consultado en octubre de 2026).
- **Identificación limitada.** Nombre + DNI + vivienda + PIN no acreditan la identidad legal. Quien obtenga el PIN y los datos de un vecino puede votar por él.
- **Voto nominal.** Por decisión aprobada, no hay anonimato: la administración ve quién vota qué.
- **Sin auditoría completa.** El historial guarda los cambios de estado de las preguntas y cuándo se modificó cada voto por última vez, pero no la secuencia de votos anteriores.
- **Participación con el censo actual.** Si se desactiva una vivienda, cambia la base de la participación de reuniones pasadas.
- **El acta es de solo lectura al finalizar la reunión.** Si el acta se redacta después de la junta, hay que guardarla antes de finalizar. Está pendiente decidir si debe poder editarse después.
- **Una sesión de administración y una de propietario no pueden convivir** en el mismo navegador; hay que usar otro perfil o dispositivo.
- **Tiempo real.** Usa Supabase Realtime y, como respaldo, consulta el servidor cada 15 s. Con muchos usuarios simultáneos habría que medir la carga.
- **Copias de seguridad.** En local no hay copias automáticas; usa `npx supabase db dump`. En la nube dependen del plan contratado.
- **Solo español y solo tema claro.**

## Antes de un uso real

1. Revisión legal (LPH y RGPD), información a los propietarios y contrato de encargado.
2. Proyecto Supabase en una región de la UE, con copias de seguridad.
3. CAPTCHA en los accesos y límites de frecuencia revisados.
4. Proceso de entrega segura de los PIN.
5. Tareas programadas para aplicar la política de conservación.
