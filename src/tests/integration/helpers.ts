// Utilidades para las pruebas de integración contra el Supabase LOCAL (npx supabase start).
// Usan la clave pública (anon), igual que el navegador: lo que aquí se permite o se deniega
// es exactamente lo que permiten RLS y las funciones RPC.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local')
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  throw new Error('Las pruebas de integración solo se ejecutan contra Supabase local')
}

export const COMMUNITY_A = 'c0000000-0000-4000-8000-000000000001'
export const COMMUNITY_B = 'c0000000-0000-4000-8000-000000000002'
export const DRAFT_MEETING_A = 'e0000000-0000-4000-8000-000000000003'
export const LIVE_MEETING_B = 'e0000000-0000-4000-8000-000000000004'
const ADMIN_PASSWORD = 'PortalActivo2026!'

export interface SeedMember {
  dwelling: string
  fullName: string
  dni: string
  pin: string
}

export const MEMBERS_A: SeedMember[] = [
  { dwelling: '1º A', fullName: 'Ana García López', dni: '10000001S', pin: '111111' },
  { dwelling: '1º B', fullName: 'Bruno Martín Sanz', dni: '10000002Q', pin: '222222' },
  { dwelling: '2º A', fullName: 'Carmen Ruiz Ortega', dni: '10000003V', pin: '333333' },
  { dwelling: '2º B', fullName: 'David Navarro Gil', dni: '10000004H', pin: '444444' },
  { dwelling: '3º A', fullName: 'Elena Torres Vidal', dni: '10000005L', pin: '555555' },
  { dwelling: '3º B', fullName: 'Fernando Castro Peña', dni: '10000006C', pin: '666666' },
  { dwelling: '4º A', fullName: 'Gloria Romero Díaz', dni: '10000007K', pin: '777777' },
  { dwelling: '4º B', fullName: 'Héctor Molina Ramos', dni: '10000008E', pin: '888888' },
  { dwelling: 'Ático', fullName: 'Irene Delgado Cano', dni: '10000009T', pin: '999999' },
  { dwelling: 'Local 1', fullName: 'Julian Petrov', dni: 'X1000001F', pin: '101010' },
]

export const MEMBER_B: SeedMember = {
  dwelling: '1º',
  fullName: 'Lucía Herrera Mora',
  dni: '20000001Y',
  pin: '121212',
}

export function newClient(): Client {
  return createClient<Database>(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function adminClient(email = 'admin@portalactivo.test'): Promise<Client> {
  const client = newClient()
  const { error } = await client.auth.signInWithPassword({ email, password: ADMIN_PASSWORD })
  if (error) throw error
  return client
}

export async function memberClient(member: SeedMember): Promise<Client> {
  const client = newClient()
  const { error: authError } = await client.auth.signInAnonymously()
  if (authError) throw authError
  const { data, error } = await client.rpc('member_sign_in', {
    p_full_name: member.fullName,
    p_dni: member.dni,
    p_dwelling: member.dwelling,
    p_pin: member.pin,
  })
  if (error) throw error
  if (!(data as { ok: boolean }).ok)
    throw new Error(`No se pudo vincular ${member.dwelling}: ${JSON.stringify(data)}`)
  return client
}

const DEMO_PASSWORD = 'Vecinos2026'

/**
 * Sesión con acceso completo (DNI + contraseña). Si la vivienda aún no tiene contraseña, la crea
 * con su PIN (primer acceso), así la función es repetible tras `npm run db:reset`.
 */
export async function fullMemberClient(member: SeedMember): Promise<Client> {
  const client = newClient()
  const { error: authError } = await client.auth.signInAnonymously()
  if (authError) throw authError
  const login = await client.rpc('member_password_sign_in', {
    p_dni: member.dni,
    p_password: DEMO_PASSWORD,
  })
  if (login.error) throw login.error
  if ((login.data as { ok: boolean }).ok) return client

  const activation = await client.rpc('member_activate', {
    p_dni: member.dni,
    p_pin: member.pin,
    p_password: DEMO_PASSWORD,
  })
  if (activation.error) throw activation.error
  if (!(activation.data as { ok: boolean }).ok) {
    throw new Error(`No se pudo activar ${member.dwelling}: ${JSON.stringify(activation.data)}`)
  }
  return client
}

/** Crea una reunión en curso con una pregunta abierta de tres opciones. */
export async function createOpenQuestion(admin: Client, label: string) {
  const { data: meeting, error: meetingError } = await admin
    .from('meetings')
    .insert({
      community_id: COMMUNITY_A,
      title: `[TEST] ${label}`,
      meeting_date: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (meetingError) throw meetingError

  await expectOk(admin.rpc('start_meeting', { p_meeting_id: meeting.id }))
  const questionId = await expectOk(
    admin.rpc('admin_save_question', {
      p_meeting_id: meeting.id,
      p_title: `Pregunta ${label}`,
      p_description: '',
      p_options: ['A favor', 'En contra', 'Abstención'],
    }),
  )
  await expectOk(admin.rpc('open_question', { p_question_id: questionId }))

  const { data: options, error } = await admin
    .from('answer_options')
    .select('id')
    .eq('question_id', questionId)
    .order('position')
  if (error) throw error
  return { meetingId: meeting.id, questionId, optionIds: options.map((o) => o.id) }
}

export async function expectOk<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await promise
  if (error) throw new Error(JSON.stringify(error), { cause: error })
  return data as T
}

export async function voteRows(admin: Client, questionId: string) {
  return expectOk(
    admin.from('votes').select('member_id, option_id, updated_at').eq('question_id', questionId),
  )
}
