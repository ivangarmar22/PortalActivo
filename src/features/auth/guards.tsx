import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullPageLoader } from '@/components/shared/FullPageLoader'
import { useAuth } from '@/features/auth/useAuth'

// Las guardas solo mejoran la navegación. La seguridad real está en RLS y en las funciones RPC.

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <FullPageLoader />
  if (state.status !== 'admin') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export function RequireMember({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') return <FullPageLoader />
  if (state.status !== 'member') return <Navigate to="/acceso" replace />
  return children
}

/** Secciones que exigen acceso completo (DNI + contraseña). El acceso de solo votación va a votaciones. */
export function RequireFullAccess({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'member' && state.membership.access_scope !== 'full') {
    return <Navigate to="/portal/votaciones" replace />
  }
  return children
}
