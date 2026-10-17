# Despliegue para pruebas con clientes

Cómo publicar PortalActivo en una URL pública para que un cliente lo pruebe. Precios y límites consultados en octubre de 2026; conviene revisarlos antes de contratar.

## Entorno actual

| Pieza    | Valor                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| URL      | **https://portalactivo.portalactivo.workers.dev**                                                                        |
| Frontend | Cloudflare Workers, worker `portalactivo` (plan gratuito)                                                                |
| Backend  | Supabase, proyecto `zreiqepmzjrquntgjskm`, región Londres (`eu-west-2`), plan gratuito                                   |
| Datos    | Demostración de Terrazas del Cañaveral (`seed.sql` + `seed_modules.sql`) y 7 PDF de ejemplo                              |
| Auth     | `deploy/supabase/config.toml`: acceso anónimo, 300 accesos anónimos/hora por IP, contraseña mínima de 8, SSL obligatorio |

Londres no es UE, pero el Reino Unido tiene decisión de adecuación del RGPD; vale para pruebas. Para datos reales dentro de la UE, crear el proyecto en Frankfurt.

## Qué hay que desplegar

PortalActivo no tiene servidor propio. Son dos piezas:

| Pieza                                             | Qué es                                         | Dónde                              |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| **Frontend**                                      | Archivos estáticos (`npm run build` → `dist/`) | Un alojamiento de sitios estáticos |
| **Backend** (PostgreSQL, Auth, Storage, Realtime) | Supabase                                       | Supabase Cloud                     |

Toda la seguridad está en Supabase (RLS y funciones RPC), así que el alojamiento del frontend no necesita nada especial: solo servir `index.html` para las rutas de React Router.

## Opciones

### Backend

| Opción               | Coste           | A favor                                                        | En contra                                                                                     |
| -------------------- | --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Supabase Free**    | 0 $             | 500 MB de base de datos, 1 GB de archivos, 50.000 usuarios/mes | **Se pausa tras 1 semana sin actividad**, sin copias de seguridad, sin soporte                |
| **Supabase Pro**     | 25 $/mes        | No se pausa, copias diarias (7 días), 8 GB de base de datos    | Coste fijo                                                                                    |
| Supabase autoalojado | VPS ~5–10 €/mes | Control total, datos en tu servidor                            | Instalar y mantener Docker, actualizaciones, seguridad y copias. Desproporcionado para un MVP |

Fuente: [precios de Supabase](https://supabase.com/pricing).

### Frontend

| Opción                                      | Coste | Uso comercial                                                                                                                                                                      | Notas                                                                                                                                                                                                                           |
| ------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers** (recursos estáticos) | 0 $   | Sí                                                                                                                                                                                 | [Peticiones a archivos estáticos gratis e ilimitadas](https://developers.cloudflare.com/workers/platform/pricing/); [modo SPA nativo](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) |
| Netlify Free                                | 0 $   | Sí                                                                                                                                                                                 | 300 créditos al mes; al agotarlos [el sitio deja de servirse](https://netli.fyi/blog/netlify-free-plan-limits-2026) hasta el mes siguiente                                                                                      |
| Vercel Hobby                                | 0 $   | **No**: [solo uso personal no comercial](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), y enseñar el producto a un cliente lo es. Hace falta Pro (20 $/mes) |                                                                                                                                                                                                                                 |
| GitHub Pages                                | 0 $   | Sí                                                                                                                                                                                 | Sin redirección SPA ni cabeceras propias: las rutas como `/portal` dan 404 al recargar                                                                                                                                          |

### Recomendación

**Cloudflare Workers + Supabase en una región de la UE.**

- Para una prueba corta y controlada: **Supabase Free**, sabiendo que se pausa tras 7 días sin uso (se reactiva desde el panel).
- Si la prueba dura semanas o hay datos que no se deben perder: **Supabase Pro** durante la prueba (25 $/mes).
- Frontend gratis en ambos casos. Dominio propio opcional (~10 €/año).

El repositorio ya incluye lo que necesita Cloudflare:

- `wrangler.jsonc`: modo SPA (las rutas de React Router sirven `index.html`) y registros activados.
- `worker/index.js`: redirige `http://` a `https://`. En `workers.dev` no existe la opción «Always Use HTTPS» de los dominios propios. Solo pasan por él las páginas; los archivos de `/assets` se sirven directamente.
- `public/_headers`: cabeceras de seguridad y caché de un año para los archivos con hash.

## Paso a paso

Requisitos: cuentas en [Supabase](https://supabase.com) y [Cloudflare](https://dash.cloudflare.com), y el repositorio en GitHub.

### 1. Crear el proyecto de Supabase

1. En el panel de Supabase, **New project**. Región: **Central EU (Frankfurt)** u otra de la UE (los datos de vecinos quedan bajo el RGPD).
2. Guarda la contraseña de la base de datos.
3. Anota el _Project ref_ (aparece en la URL del panel: `supabase.com/dashboard/project/<ref>`).

### 2. Subir el esquema y los datos de demostración

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --include-seed --dry-run   # revisa qué se va a aplicar
npx supabase db push --include-seed
```

Aplica las 10 migraciones (tablas, RLS, funciones, buckets de Storage y Realtime) y carga `seed.sql` y `seed_modules.sql` (la comunidad Terrazas del Cañaveral con datos ficticios).

`supabase link` solo necesita la sesión de `supabase login`; la CLI crea un rol temporal para `db push`, así que no hace falta la contraseña de la base de datos.

### 3. Configurar Auth

Los ajustes están en `deploy/supabase/config.toml`, que solo declara lo que cambia. Revisa el diff y aplícalo:

```bash
npx supabase config diff --workdir deploy --project-ref <ref>
npm run db:config -- --project-ref <ref>
```

> No uses `supabase config push` sin `--workdir deploy`: subiría el `supabase/config.toml` del entorno local (por ejemplo, `site_url = http://127.0.0.1:5173`).

Activar el SSL obligatorio reinicia la base de datos (en torno a un minuto y medio sin servicio). Hazlo antes de dar acceso a nadie.

Equivalente en el panel de Supabase:

| Dónde                                        | Ajuste                                                 | Por qué                                                                                      |
| -------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Authentication → Sign In / Providers         | **Allow anonymous sign-ins: activado**                 | Los vecinos entran sobre una sesión anónima vinculada a su vivienda                          |
| Authentication → Sign In / Providers         | **Allow new users to sign up: activado**               | Si se desactiva, también se bloquean las sesiones anónimas                                   |
| Authentication → Sign In / Providers → Email | **Confirm email: activado**                            | Impide que alguien se registre por su cuenta con email                                       |
| Authentication → Rate Limits                 | **Anonymous sign-ins: 300 por hora** (por defecto, 30) | El límite es por IP: en una junta, todos los vecinos conectados a la misma wifi comparten IP |
| Authentication → URL Configuration           | **Site URL**: la URL del paso 6                        |                                                                                              |

Supabase [recomienda](https://supabase.com/docs/guides/auth/auth-anonymous) añadir un CAPTCHA (Cloudflare Turnstile) a los accesos anónimos. Requiere un pequeño cambio en el código; para una prueba controlada se puede dejar para después.

### 4. Variables de entorno de producción

Las claves están en Project Settings → API Keys, o en `npx supabase projects api-keys --project-ref <ref> --reveal` (sin `--reveal` la clave secreta sale enmascarada y Supabase la rechaza con «Invalid API key»). Usa la _publishable_ como clave pública y la _secret_ como secreta. Crea `.env.production.local` (está en `.gitignore`):

```bash
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave pública>
SUPABASE_SERVICE_ROLE_KEY=<clave secreta>   # solo para los scripts; nunca en Cloudflare
```

### 5. Archivos de demostración y administrador propio

```bash
node scripts/seed-files.mjs --mode production
```

Sube los PDF de ejemplo (facturas, recibos, adjuntos).

**Las credenciales de demostración son públicas** (están en `seed.sql` y en `docs/usuarios-demo.md`), así que en la nube hay que sustituirlas:

1. Obtén el id de la comunidad en el SQL Editor: `select id, name from communities;`
2. Crea tu administrador:
   ```bash
   npm run admin:create -- --mode production --email tu@email.com --name "Tu nombre" --community <id>
   ```
   El script muestra una contraseña aleatoria; guárdala.
3. En Authentication → Users, **elimina `admin@portalactivo.test`**.
4. Entra con tu administrador en la aplicación y, en **Censo y accesos**, **regenera el PIN de cada vivienda**. Así dejan de valer los PIN y contraseñas publicados. Los nuevos PIN son los que entregas al cliente.

### 6. Publicar el frontend en Cloudflare

**Opción A: desde GitHub (recomendada, se actualiza sola con cada push a `main`)**

1. Cloudflare → Workers & Pages → Create → **Import a repository** → elige `PortalActivo`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. En las variables de compilación (_build variables_) añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Solo esas dos: la clave secreta no va nunca al frontend.

**Opción B: desde tu equipo**

```bash
npx wrangler login     # una vez; abre el navegador (con la sesión de Cloudflare ya iniciada)
npm run deploy         # compila con .env.production.local y publica
```

La primera vez que se usa el subdominio `workers.dev`, Cloudflare tarda unos minutos en emitir el certificado HTTPS; hasta entonces el navegador da un error de conexión segura.

La URL queda como `https://portalactivo.<tu-subdominio>.workers.dev`. Ponla como **Site URL** en Supabase (paso 3). Para un dominio propio: Workers → portalactivo → Settings → Domains & Routes.

### 7. Comprobar antes de enviar la URL

Desde un móvil con datos (no la wifi de casa):

- [ ] La portada carga y al recargar `/portal` o `/admin` no da 404.
- [ ] Entras como administrador; el panel muestra la comunidad.
- [ ] Inicias una junta y abres una pregunta; un vecino vota con «Solo votar» desde otro móvil y el resultado aparece sin recargar.
- [ ] Un vecino crea su contraseña con su PIN, comunica una incidencia con foto y hace una reserva.
- [ ] Se descargan un recibo y un documento.

## Antes de dar acceso al cliente

- **Datos.** Para la prueba, usa los datos ficticios. Si el cliente va a meter vecinos reales (con DNI), antes hace falta lo que indica [seguridad-y-privacidad.md](seguridad-y-privacidad.md): región UE, contrato de encargado del tratamiento ([DPA de Supabase](https://supabase.com/legal/dpa)) e informar a los propietarios.
- **Validez legal.** Explica al cliente que las votaciones son consultivas.
- **Pausa del plan gratuito.** Si nadie entra en 7 días, Supabase pausa el proyecto y la URL deja de funcionar hasta reactivarlo desde el panel.
- **Copias de seguridad.** El plan gratuito no tiene. Antes de cambios importantes: `npx supabase db dump --linked -f backup.sql`.
- **Sesiones anónimas.** Supabase no las borra solo. De vez en cuando, en el SQL Editor, borra las antiguas (nunca todas: quien tenga la página abierta perdería la sesión y no podría entrar hasta recargar):
  ```sql
  delete from auth.users where is_anonymous and created_at < now() - interval '30 days';
  ```

## Actualizar después

| Cambio                     | Cómo                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Código del frontend        | `npm run deploy` (o push a `main` con la opción A)                                  |
| Nueva migración            | `npm run db:push` (sin `--include-seed`, para no duplicar los datos de prueba)      |
| Ajustes de Auth            | Edita `deploy/supabase/config.toml` y `npm run db:config -- --project-ref <ref>`    |
| Volver a los datos de demo | No hay un `db reset` seguro en la nube: crea otro proyecto o borra los datos a mano |

## Auditoría del despliegue (17 de octubre de 2026)

### Supabase

| Comprobación                                     | Resultado                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asesores de seguridad y rendimiento              | 0 errores, 0 avisos de rendimiento, 61 avisos de seguridad revisados uno a uno (abajo)                                                                                       |
| RLS                                              | Activado en las 23 tablas de `public`; ninguna política con condición `true`                                                                                                 |
| Permisos sin sesión (`anon`)                     | Ninguno sobre tablas ni funciones                                                                                                                                            |
| Funciones `SECURITY DEFINER`                     | Todas con `search_path` fijo; todas comprueban permisos (directamente o con `private.assert_community_admin`, `private.lock_*_for_admin` o `private.require_session_member`) |
| Prueba de ataque con sesión anónima sin vivienda | 0 filas visibles en 21 tablas, nada en Storage, las funciones de administración responden `forbidden`                                                                        |
| Storage                                          | Buckets `minutes` y `community-files` privados, máximo 10 MB                                                                                                                 |
| Realtime                                         | Publicación con las 8 tablas que la aplicación escucha                                                                                                                       |
| Conexiones directas                              | SSL obligatorio activado; acceso abierto desde cualquier IP (no hay IP fija que restringir)                                                                                  |
| Copias de seguridad                              | No incluidas en el plan gratuito                                                                                                                                             |

Avisos de seguridad aceptados, por diseño:

- **38 × «authenticated_security_definer_function_executable»**: son las funciones RPC de la aplicación (`cast_vote`, `admin_*`, `member_*`…). Deben poder llamarse con sesión y cada una comprueba los permisos por dentro; lo cubren las pruebas pgTAP y de integración.
- **22 × «auth_allow_anonymous_sign_ins»**: los vecinos entran sobre una sesión anónima. Las políticas exigen que esa sesión esté vinculada a una vivienda (o que el usuario sea administrador); sin vincular no ve nada (prueba de ataque).
- **1 × «auth_leaked_password_protection»**: la comprobación de contraseñas filtradas (HaveIBeenPwned) es una función de los planes de pago de Supabase.

### Cloudflare

| Comprobación               | Resultado                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| HTTPS                      | Certificado activo; `http://` redirige a `https://` (301); HSTS de un año                                                |
| Rutas de la aplicación     | `/portal`, `/admin/...` y rutas desconocidas sirven `index.html` (200); la aplicación muestra su propia página 404       |
| Cabeceras                  | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`                      |
| Caché                      | `index.html` sin caché (cada despliegue se ve al momento); `/assets/*` un año e inmutable                                |
| Compresión                 | Brotli                                                                                                                   |
| Clave secreta en el bundle | No: solo la URL y la clave pública                                                                                       |
| Prueba real                | Administración y vecino entran desde la URL pública; tiempo real conectado; descargas de Storage; sin errores en consola |
