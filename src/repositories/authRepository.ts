import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { toAppError, type AppErrorCode } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { unwrap, unwrapMaybe } from '@/repositories/unwrap'
import type { Community, Membership } from '@/types/domain'

/** Resultado de las RPC de acceso de vecinos: los fallos se devuelven (no se lanzan) para que
 *  el contador de intentos fallidos se guarde en la base de datos. */
export type MemberSignInResult = ({ ok: true } & Membership) | { ok: false; error: AppErrorCode }

export const authRepository = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw toAppError(error)
    return data.session
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback)
    return () => data.subscription.unsubscribe()
  },

  async signInWithPassword(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },

  async signInAnonymously(): Promise<Session> {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.session) throw toAppError(error)
    return data.session
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw toAppError(error)
  },

  async memberSignIn(input: {
    fullName: string
    dni: string
    dwelling: string
    pin: string
  }): Promise<MemberSignInResult> {
    const data = unwrap(
      await supabase.rpc('member_sign_in', {
        p_full_name: input.fullName,
        p_dni: input.dni,
        p_dwelling: input.dwelling,
        p_pin: input.pin,
      }),
    )
    return data as unknown as MemberSignInResult
  },

  async memberActivate(input: {
    dni: string
    pin: string
    password: string
  }): Promise<MemberSignInResult> {
    const data = unwrap(
      await supabase.rpc('member_activate', {
        p_dni: input.dni,
        p_pin: input.pin,
        p_password: input.password,
      }),
    )
    return data as unknown as MemberSignInResult
  },

  async memberPasswordSignIn(input: {
    dni: string
    password: string
  }): Promise<MemberSignInResult> {
    const data = unwrap(
      await supabase.rpc('member_password_sign_in', {
        p_dni: input.dni,
        p_password: input.password,
      }),
    )
    return data as unknown as MemberSignInResult
  },

  async memberChangePassword(current: string, next: string): Promise<void> {
    unwrap(await supabase.rpc('member_change_password', { p_current: current, p_new: next }))
  },

  async memberSignOut(): Promise<void> {
    unwrap(await supabase.rpc('member_sign_out'))
  },

  async getMyMembership(): Promise<Membership | null> {
    const data = unwrapMaybe(await supabase.rpc('get_my_membership'))
    return (data as unknown as Membership | null) ?? null
  },

  async getAdminCommunities(userId: string): Promise<Community[]> {
    const rows = unwrap(
      await supabase
        .from('community_admins')
        .select('community:communities(*)')
        .eq('user_id', userId),
    )
    return rows
      .map((row) => row.community)
      .filter((c): c is Community => c !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async getProfileName(userId: string): Promise<string | null> {
    const row: { display_name: string } | null = unwrapMaybe(
      await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
    )
    return row?.display_name ?? null
  },
}
