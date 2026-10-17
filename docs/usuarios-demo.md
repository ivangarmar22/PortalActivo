# Usuarios de demostración

Todos los datos son **ficticios**: los DNI tienen la letra de control válida, pero son inventados. Se cargan con `npm run db:reset`, que también genera los PDF de ejemplo.

## Administración (`/admin/login`)

| Nombre      | Email                           | Contraseña        | Comunidad                   |
| ----------- | ------------------------------- | ----------------- | --------------------------- |
| Raúl        | admin@portalactivo.test         | PortalActivo2026! | Terrazas del Cañaveral      |
| Jorge Salas | admin.mirador@portalactivo.test | PortalActivo2026! | Edificio Mirador del Parque |

## Vecinos (`/acceso`)

Hay dos formas de entrar:

| Pestaña                                           | Datos                                                                                         | Qué ve                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Vecinos**                                       | DNI + contraseña                                                                              | Todo el portal: inicio, votaciones, incidencias, reservas, avisos y tablón, recibos y documentos, cuenta |
| **Vecinos → Crear mi contraseña** (primer acceso) | DNI + PIN + contraseña nueva                                                                  | Después, lo mismo que el acceso completo                                                                 |
| **Solo votar**                                    | Nombre, DNI, vivienda y PIN. **Solo se valida el PIN**; el resto solo tiene que estar relleno | Solo las votaciones                                                                                      |

Contraseña de las cuentas ya activadas: **Vecinos2026**. El resto de viviendas debe crearla con su PIN («Crear mi contraseña»).

### Terrazas del Cañaveral

| Vivienda | Nombre               | DNI / NIE | PIN    | Contraseña           |
| -------- | -------------------- | --------- | ------ | -------------------- |
| 1º A     | Ana García López     | 10000001S | 111111 | Vecinos2026          |
| 1º B     | Bruno Martín Sanz    | 10000002Q | 222222 | (la crea con el PIN) |
| 2º A     | Carmen Ruiz Ortega   | 10000003V | 333333 | (la crea con el PIN) |
| 2º B     | David Navarro Gil    | 10000004H | 444444 | (la crea con el PIN) |
| 3º A     | Elena Torres Vidal   | 10000005L | 555555 | (la crea con el PIN) |
| 3º B     | Fernando Castro Peña | 10000006C | 666666 | (la crea con el PIN) |
| 4º A     | Gloria Romero Díaz   | 10000007K | 777777 | Vecinos2026          |
| 4º B     | Héctor Molina Ramos  | 10000008E | 888888 | (la crea con el PIN) |
| Ático    | Irene Delgado Cano   | 10000009T | 999999 | (la crea con el PIN) |
| Local 1  | Julian Petrov        | X1000001F | 101010 | (la crea con el PIN) |

### Edificio Mirador del Parque (comunidad de control)

| Vivienda | Nombre               | DNI       | PIN    |
| -------- | -------------------- | --------- | ------ |
| 1º       | Lucía Herrera Mora   | 20000001Y | 121212 |
| 2º       | Manuel Iglesias Rey  | 20000002F | 131313 |
| 3º       | Nuria Campos Prieto  | 20000003P | 141414 |
| 4º       | Óscar Lozano Fuentes | 20000004D | 151515 |

**Bloqueos:**

- Tras 5 intentos fallidos, la sesión del navegador queda bloqueada 15 minutos (acceso con PIN o con contraseña).
- Tras 5 contraseñas erróneas, la vivienda también se bloquea.
- La administración desbloquea una vivienda generando un PIN nuevo en «Censo y accesos». Ese PIN nuevo también borra la contraseña, así que el vecino tendrá que crearla otra vez.

## Escenarios precargados (Terrazas del Cañaveral)

| Módulo      | Qué hay                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Juntas      | Junta ordinaria 2026 (finalizada, con resultados); junta extraordinaria de la fachada (en curso, con preguntas abiertas, cerrada y en borrador); junta 2027 (en preparación, invisible para los vecinos)                            |
| Incidencias | 6: filtración en el garaje (en proceso, con la promotora), ascensor parado (en proceso, con una empresa), farola (resuelta), puerta del garaje (recibida hace 3 horas), grietas (en revisión, con el seguro), aspersor (descartada) |
| Reservas    | Barbacoa (comida y cena), pista de pádel (turnos de 90 minutos) y salón social, con reservas de varias viviendas en los próximos días                                                                                               |
| Avisos      | Corte de agua (urgente y fijado), obras de fachada (con PDF adjunto), convocatoria, limpieza; uno programado y otro caducado que solo ve la administración                                                                          |
| Tablón      | 3 publicaciones aprobadas, 2 pendientes de revisión y 1 rechazada                                                                                                                                                                   |
| Recibos     | Cuotas de los tres últimos meses, la derrama de la fachada (con PDF para 4º A), algunos recibos pendientes, vencidos y devueltos                                                                                                    |
| Documentos  | Facturas de ascensores y limpieza, presupuesto de la fachada, cuentas 2025 y póliza del seguro, todos con PDF                                                                                                                       |

## Para probar

- **Votar desde el móvil:** pestaña «Solo votar» con el PIN 777777 (4º A).
- **Incidencias en tiempo real:** entra como 4º A (10000007K / Vecinos2026) y comunica una incidencia. En otra ventana, como Raúl, asígnale una empresa y cambia su estado; la pantalla del vecino se actualiza sola.
- **Primer acceso:** «Crear mi contraseña» con 10000003V y el PIN 333333 (2º A).
