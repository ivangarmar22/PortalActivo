import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database'

// Único cliente de Supabase de la aplicación. Usa la clave pública (anon): la seguridad
// depende de RLS y de las funciones RPC, nunca de la clave service_role.
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'portalactivo-auth' },
})
