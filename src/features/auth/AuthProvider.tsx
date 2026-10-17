import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { authRepository } from '@/repositories/authRepository'
import { authService } from '@/services/authService'

const ACTIVE_COMMUNITY_KEY = 'portalactivo.activeCommunity'

function readStoredCommunity(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COMMUNITY_KEY)
  } catch {
    return null
  }
}

function storeCommunity(id: string) {
  try {
    localStorage.setItem(ACTIVE_COMMUNITY_KEY, id)
  } catch {
    // El almacenamiento local es solo una comodidad.
  }
}

async function resolveState(): Promise<AuthState> {
  const session = await authRepository.getSession()
  if (!session) return { status: 'signed_out' }
  const { user } = session

  if (user.is_anonymous) {
    const membership = await authRepository.getMyMembership()
    return membership
      ? { status: 'member', userId: user.id, membership }
      : { status: 'unlinked', userId: user.id }
  }

  const [communities, displayName] = await Promise.all([
    authRepository.getAdminCommunities(user.id),
    authRepository.getProfileName(user.id),
  ])
  const first = communities[0]
  if (!first) return { status: 'signed_out' }
  const stored = readStoredCommunity()
  return {
    status: 'admin',
    userId: user.id,
    email: user.email ?? '',
    displayName: displayName ?? user.email ?? 'Administración',
    communities,
    activeCommunity: communities.find((c) => c.id === stored) ?? first,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // Si se solapan varias resoluciones (p. ej. evento SIGNED_IN + refresh explícito tras vincular
  // la vivienda), solo se aplica la última que empezó.
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current
    let next: AuthState
    try {
      next = await resolveState()
    } catch {
      next = { status: 'signed_out' }
    }
    if (requestId === latestRequest.current) setState(next)
  }, [])

  useEffect(() => {
    void refresh()
    // No se llama a Supabase dentro del callback (recomendación de supabase-js): se difiere.
    return authRepository.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => void refresh(), 0)
      }
    })
  }, [refresh])

  const signOut = useCallback(async () => {
    latestRequest.current++
    await authService.signOut()
    // No dejar en caché datos de la sesión anterior (otro usuario podría usar el mismo dispositivo).
    queryClient.clear()
    setState({ status: 'signed_out' })
  }, [queryClient])

  const setActiveCommunity = useCallback((communityId: string) => {
    storeCommunity(communityId)
    setState((current) => {
      if (current.status !== 'admin') return current
      const next = current.communities.find((c) => c.id === communityId)
      return next ? { ...current, activeCommunity: next } : current
    })
  }, [])

  const value = useMemo(
    () => ({ state, refresh, signOut, setActiveCommunity }),
    [state, refresh, signOut, setActiveCommunity],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
