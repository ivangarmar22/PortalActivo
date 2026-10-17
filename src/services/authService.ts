import { AppError, toAppError } from '@/lib/errors'
import { authRepository, type MemberSignInResult } from '@/repositories/authRepository'
import type { Membership } from '@/types/domain'

/** Las RPC de acceso de vecinos funcionan sobre una sesión anónima de Supabase Auth. */
async function ensureAnonymousSession(): Promise<void> {
  const current = await authRepository.getSession()
  if (current && !current.user.is_anonymous) throw new AppError('anonymous_session_required')
  if (!current) await authRepository.signInAnonymously()
}

function toMembership(result: MemberSignInResult): Membership {
  if (!result.ok) throw new AppError(result.error)
  const { ok: _ok, ...membership } = result
  return membership
}

export const authService = {
  /** Acceso de administración: email + contraseña y comprobación de que administra alguna comunidad. */
  async adminSignIn(email: string, password: string): Promise<void> {
    const current = await authRepository.getSession()
    if (current?.user.is_anonymous) await this.signOut()

    try {
      const session = await authRepository.signInWithPassword(email, password)
      const communities = await authRepository.getAdminCommunities(session.user.id)
      if (communities.length === 0) {
        await authRepository.signOut()
        throw new AppError('not_admin')
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      const code = (error as { code?: string }).code
      if (code === 'invalid_credentials') throw new AppError('invalid_login', error)
      throw toAppError(error)
    }
  },

  /** Acceso completo: DNI + contraseña. */
  async memberPasswordSignIn(dni: string, password: string): Promise<Membership> {
    await ensureAnonymousSession()
    return toMembership(await authRepository.memberPasswordSignIn({ dni, password }))
  },

  /** Primer acceso: DNI + PIN de la administración; el vecino crea su contraseña. */
  async memberActivate(dni: string, pin: string, password: string): Promise<Membership> {
    await ensureAnonymousSession()
    return toMembership(await authRepository.memberActivate({ dni, pin, password }))
  },

  /**
   * Solo votación: el servidor solo valida el PIN; nombre, DNI y vivienda solo tienen que estar
   * rellenos. La sesión queda limitada a las votaciones.
   */
  async memberVoteSignIn(values: {
    fullName: string
    dni: string
    dwelling: string
    pin: string
  }): Promise<Membership> {
    await ensureAnonymousSession()
    return toMembership(await authRepository.memberSignIn(values))
  },

  async memberChangePassword(current: string, password: string): Promise<void> {
    await authRepository.memberChangePassword(current, password)
  },

  async signOut(): Promise<void> {
    const session = await authRepository.getSession()
    if (session?.user.is_anonymous) {
      // Desvincula la sesión de la vivienda antes de cerrarla (si falla, la sesión caduca igualmente).
      await authRepository.memberSignOut().catch(() => undefined)
    }
    await authRepository.signOut()
  },
}
