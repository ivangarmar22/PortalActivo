import { use } from 'react'
import { AuthContext, type AuthContextValue, type AuthState } from '@/features/auth/AuthContext'

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}

type AdminState = Extract<AuthState, { status: 'admin' }>
type MemberState = Extract<AuthState, { status: 'member' }>

/** Solo dentro de rutas protegidas por <RequireAdmin>. */
export function useAdmin(): AdminState {
  const { state } = useAuth()
  if (state.status !== 'admin') throw new Error('useAdmin requiere una sesión de administración')
  return state
}

/** Solo dentro de rutas protegidas por <RequireMember>. */
export function useMember(): MemberState {
  const { state } = useAuth()
  if (state.status !== 'member') throw new Error('useMember requiere una sesión de propietario')
  return state
}
