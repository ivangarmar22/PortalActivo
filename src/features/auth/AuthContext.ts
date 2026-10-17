import { createContext } from 'react'
import type { Community, Membership } from '@/types/domain'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | {
      status: 'admin'
      userId: string
      email: string
      displayName: string
      communities: Community[]
      activeCommunity: Community
    }
  | { status: 'member'; userId: string; membership: Membership }
  /** Sesión anónima todavía no vinculada a una vivienda (o desvinculada por el administrador). */
  | { status: 'unlinked'; userId: string }

export interface AuthContextValue {
  state: AuthState
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  setActiveCommunity: (communityId: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
