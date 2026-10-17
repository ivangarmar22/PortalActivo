#!/usr/bin/env node
// Alta controlada de un administrador (procedimiento fuera del navegador).
// Usa la clave service_role de .env.local: NUNCA la expongas en el frontend ni la subas al repositorio.
//
// Uso:
//   node scripts/create-admin.mjs --email ana@ejemplo.com --name "Ana Pérez" --community <uuid> [--password ...]
//
// Si el usuario ya existe, solo se le asigna la comunidad. Sin --password se genera una contraseña aleatoria.
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    community: { type: 'string' },
    password: { type: 'string' },
  },
})

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (!url || !serviceKey) fail('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
if (!values.email || !values.name || !values.community) {
  fail(
    'Uso: node scripts/create-admin.mjs --email <email> --name "<nombre>" --community <uuid> [--password <contraseña>]',
  )
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: community, error: communityError } = await supabase
  .from('communities')
  .select('id, name')
  .eq('id', values.community)
  .maybeSingle()
if (communityError) fail(communityError.message)
if (!community) fail(`No existe la comunidad ${values.community}`)

const password = values.password ?? randomBytes(12).toString('base64url')
let userId
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email: values.email,
  password,
  email_confirm: true,
})

if (createError) {
  if (!/already/i.test(createError.message)) fail(createError.message)
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) fail(listError.message)
  const existing = list.users.find((u) => u.email?.toLowerCase() === values.email.toLowerCase())
  if (!existing) fail('El usuario existe pero no se ha podido localizar')
  userId = existing.id
  console.log(`· El usuario ${values.email} ya existía: se le asigna la comunidad.`)
} else {
  userId = created.user.id
}

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({ id: userId, display_name: values.name })
if (profileError) fail(profileError.message)

const { error: adminError } = await supabase
  .from('community_admins')
  .upsert({ community_id: community.id, user_id: userId })
if (adminError) fail(adminError.message)

console.log(`✓ ${values.email} administra «${community.name}».`)
if (!createError) console.log(`  Contraseña inicial: ${password}  (entrégala por un canal seguro)`)
