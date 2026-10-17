# PortalActivo

[![CI](https://github.com/ivangarmar22/PortalActivo/actions/workflows/ci.yml/badge.svg)](https://github.com/ivangarmar22/PortalActivo/actions/workflows/ci.yml)

Portal web para comunidades de propietarios. Esta instalación de demostración es la de **Terrazas del Cañaveral**, administrada por Raúl.

**Demo en línea:** https://portalactivo.portalactivo.workers.dev

| Módulo                   | Vecinos                                                                                    | Administración                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Juntas y votaciones**  | Votar y cambiar el voto mientras la pregunta está abierta; resultados tras el cierre; acta | Juntas, preguntas, apertura y cierre (individual y global), resultados en vivo, CSV y PDF |
| **Incidencias**          | Comunicar con foto; ver en tiempo real estado, responsable e historial de todas            | Asignar a administración, promotora, empresa o seguro; previsión; mensajes                |
| **Reservas**             | Barbacoa, pádel, salón… por franjas con confirmación inmediata                             | Espacios, franjas, límites y reservas de todas las viviendas                              |
| **Avisos y tablón**      | Avisos oficiales (con lectura) y tablón vecinal                                            | Publicar avisos y moderar el tablón                                                       |
| **Recibos y documentos** | Sus recibos y los documentos de la comunidad                                               | Emitir recibos, registrar cobros, publicar facturas                                       |

**Acceso de vecinos:**

- **Completo:** DNI + contraseña. La primera vez, el vecino la crea con el PIN que le da la administración.
- **Solo votar:** formulario con PIN.

Decisiones de diseño: [docs/auditoria-ui-ux.md](docs/auditoria-ui-ux.md). Investigación de mercado: [docs/investigacion-funcionalidades.md](docs/investigacion-funcionalidades.md).

> **Sin validez legal.** Las votaciones son consultivas: no sustituyen a la junta ni a las mayorías que exige la Ley de Propiedad Horizontal. Las limitaciones están en [docs/seguridad-y-privacidad.md](docs/seguridad-y-privacidad.md).

## Stack

React 19 · TypeScript 6 (estricto) · Vite 8 · React Router 8 · Tailwind CSS 4 · shadcn/ui (Radix) · TanStack Query 5 · React Hook Form + Zod 4 · Recharts 3 · jsPDF · Supabase (PostgreSQL 17, Auth, Storage, Realtime) · Vitest 5 · Testing Library · Playwright · pgTAP.

TypeScript está fijado en 6.0 porque typescript-eslint 8 todavía no admite TypeScript 7.

## Requisitos

- Node.js 22.22, 24.15 o superior (`.nvmrc` fija la 24).
- Docker Desktop en marcha (Supabase local).

## Puesta en marcha (entorno local)

```bash
npm install
npx supabase start          # primera vez: descarga las imágenes de Docker
```

Crea `.env.local` a partir de `.env.example` con los valores que muestra `npx supabase status`:

| Variable                    | Valor en `supabase status` | Dónde se usa                                                         |
| --------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | `API_URL`                  | Navegador                                                            |
| `VITE_SUPABASE_ANON_KEY`    | `ANON_KEY`                 | Navegador (clave pública; la seguridad depende de RLS)               |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY`         | **Solo** scripts y pruebas de integración. Nunca con prefijo `VITE_` |

```bash
npm run db:reset            # migraciones + datos de demostración + PDF de ejemplo
npm run dev                 # http://127.0.0.1:5173
```

Usuarios y PIN de prueba: [docs/usuarios-demo.md](docs/usuarios-demo.md).

### Restablecer el entorno

```bash
npm run db:reset            # borra todo y vuelve a cargar migraciones + seed.sql
```

Las pruebas de integración y E2E crean reuniones `[TEST]` y `Junta E2E`. Después, ejecuta `npm run db:reset` para recuperar los datos de demostración limpios (las pruebas E2E ya lo hacen al empezar).

### Crear un administrador

El alta es un procedimiento controlado fuera del navegador: el frontend no puede asignar roles.

```bash
npm run admin:create -- --email ana@ejemplo.com --name "Ana Pérez" --community <uuid-comunidad>
```

El script usa `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`, crea el usuario ya confirmado y lo asigna a la comunidad. Si no pasas `--password`, genera una contraseña aleatoria.

## Despliegue

La demo está en Cloudflare Workers (frontend estático) y Supabase Cloud (base de datos, Auth, Storage y Realtime). Con el proyecto ya enlazado (`npx supabase link`) y `.env.production.local` creado:

```bash
npm run db:push             # migraciones nuevas a Supabase
npm run db:config -- --project-ref <ref>   # ajustes de Auth de deploy/supabase/config.toml
npm run deploy              # compila con las variables de producción y publica en Cloudflare
```

Paso a paso, opciones de alojamiento, costes y auditoría: [docs/despliegue.md](docs/despliegue.md).

## Scripts

| Comando                                                       | Qué hace                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                                                 | Servidor de desarrollo                                                      |
| `npm run build`                                               | Comprobación de tipos + build de producción                                 |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Tipos, ESLint (con reglas que usan los tipos) y Prettier                    |
| `npm run knip`                                                | Detecta archivos, exportaciones y dependencias sin uso                      |
| `npm test`                                                    | Pruebas unitarias y de componentes (Vitest + jsdom)                         |
| `npm run test:db`                                             | Pruebas pgTAP de base de datos: restricciones, RLS, votación, módulos       |
| `npm run test:integration`                                    | Pruebas contra Supabase local: concurrencia real, permisos vía API, Storage |
| `npm run test:e2e`                                            | Playwright en escritorio y móvil (restablece la BD antes de empezar)        |
| `npm run check`                                               | Todo lo anterior salvo E2E; deja la BD con los datos de demostración        |
| `npm run db:start` / `db:stop` / `db:reset`                   | Supabase local                                                              |
| `npm run db:types`                                            | Regenera `src/types/database.ts` desde el esquema                           |
| `npm run admin:create`                                        | Alta de un administrador (ver arriba; `--mode production` para la nube)     |
| `npm run deploy`                                              | Publica el frontend en Cloudflare                                           |
| `npm run db:push` / `npm run db:config`                       | Migraciones y ajustes de Auth del proyecto en la nube                       |

La primera vez que lances las pruebas E2E, instala el navegador con `npx playwright install chromium`.

La integración continua (`.github/workflows/ci.yml`) se ejecuta en cada push a `main` y en cada pull request. Comprueba tipos, lint, formato y knip, y ejecuta las pruebas unitarias y el build. Después levanta Supabase y ejecuta las pruebas de base de datos, de integración y E2E.

## Estructura

```
src/
  app/            providers y router (páginas cargadas bajo demanda)
  routes/         portada, 404 y página de error
  layouts/        AdminLayout (barra lateral / menú móvil), MemberLayout (portal), AuthShell (accesos)
  features/       un directorio por área, con sus componentes y su queries.ts (TanStack Query):
                  admin · auth · meetings · questions · results · participant · members · member
                  incidents · reservations · notices · finance
  components/ui   shadcn/ui        components/shared  StatusBadge, ConfirmDialog, FormField…
  hooks/          claves de consulta, tiempo real, mutaciones con aviso
  repositories/   único punto de acceso a Supabase (consultas, RPC, Storage, Realtime)
  services/       lógica sin interfaz: acceso, resultados, exportación, descargas
  schemas/        validación Zod de los formularios
  lib/            cliente Supabase, entorno, errores, formatos
  types/          tipos generados de la BD + tipos de dominio
  tests/          setup e integración
supabase/
  migrations/     esquema, autorización (RLS), RPC, Storage y módulos
  tests/database  pgTAP
  seed.sql        datos ficticios (seed_modules.sql para los módulos)
scripts/          alta de administradores y PDF de demostración (--mode production para la nube)
deploy/           ajustes de Auth del proyecto de Supabase en la nube
worker/           Worker de Cloudflare: redirección a HTTPS delante de los archivos estáticos
e2e/              Playwright
docs/             modelo de datos, seguridad y privacidad, diseño, usuarios demo, evolución
```

Las dependencias van en un solo sentido: componentes → `queries.ts` / `services` → `repositories` → Supabase. Una regla de ESLint impide importar `@supabase/supabase-js` fuera de `repositories` y `lib/supabase.ts`. La autorización real está en la base de datos (RLS y funciones RPC); las guardas de React solo mejoran la navegación.

Más detalle en [docs/modelo-datos.md](docs/modelo-datos.md) y [docs/evolucion.md](docs/evolucion.md).
