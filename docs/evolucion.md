# Plan de evolución

El MVP está pensado para crecer sin rehacerlo: el esquema ya admite varias comunidades, los componentes no acceden directamente a Supabase y las reglas críticas viven en PostgreSQL.

## Siguientes pasos razonables

| Prioridad | Función                                             | Encaje en el diseño actual                                                                                       |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Alta      | Despliegue (Supabase en la UE + Vercel/Netlify)     | Solo configuración: variables de entorno y `supabase db push`                                                    |
| Alta      | Importación del censo desde CSV                     | Nueva RPC por lotes que reutilice la validación de `admin_create_member`                                         |
| Alta      | Hoja imprimible de PIN para entregar en mano        | Generación PDF en cliente (ya se usa jsPDF)                                                                      |
| Media     | Coeficientes y doble mayoría (LPH)                  | Columna `share_coefficient` en `community_members`; ampliar `get_meeting_results`                                |
| Media     | Delegación de voto                                  | Tabla `proxies (member_id, delegate_member_id, meeting_id)`; `cast_vote` acepta votar en nombre de otra vivienda |
| Media     | Auditoría completa                                  | Tabla `vote_events` (insert-only) escrita desde `cast_vote`                                                      |
| Media     | Invitaciones por email o enlace mágico              | Supabase Auth OTP; vincular `auth.users` permanentes a `community_members`                                       |
| Media     | Multiadministrador con permisos                     | Añadir `role` a `community_admins` (p. ej. presidente / administrador)                                           |
| Baja      | Notificaciones (email/WhatsApp)                     | Edge Function + proveedor externo, disparada al abrir una pregunta                                               |
| Baja      | Selección múltiple                                  | Nuevo valor del enum `response_type`; `votes` pasaría a una fila por opción                                      |
| Baja      | Voto secreto reforzado                              | Requiere otro diseño (separar elegibilidad y papeleta, sin marcas temporales); no basta con separar tablas       |
| Baja      | Firma electrónica del acta, facturación, app nativa | Fuera del alcance técnico actual                                                                                 |

## Deuda técnica conocida

- Las pruebas de integración y E2E dejan datos de prueba (`npm run db:reset` los limpia).
- Los tipos que generan las funciones RPC no reflejan la nulabilidad; se corrigen a mano en `src/types/domain.ts`.
- La política de conservación de datos está documentada, pero no automatizada.
