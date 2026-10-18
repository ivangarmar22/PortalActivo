import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type { MemberAccessStatus, MemberWithDni } from '@/types/domain'

export interface MemberInput {
  dwellingLabel: string
  fullName: string
  dni: string
}

export interface VotingMember {
  id: string
  dwelling_label: string
  full_name: string
}

export const membersRepository = {
  async listByCommunity(communityId: string): Promise<MemberWithDni[]> {
    const rows = unwrap(
      await supabase
        .from('community_members')
        .select('*, member_private(dni)')
        .eq('community_id', communityId),
    )
    return rows.sort((a, b) =>
      a.dwelling_label.localeCompare(b.dwelling_label, 'es', { numeric: true }),
    )
  },

  async listActiveForVoting(communityId: string): Promise<VotingMember[]> {
    const members = unwrap(
      await supabase
        .from('community_members')
        .select('id, dwelling_label, full_name')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('dwelling_label'),
    )
    return members.sort((a, b) =>
      a.dwelling_label.localeCompare(b.dwelling_label, 'es', { numeric: true }),
    )
  },

  /** Crea la vivienda y devuelve el PIN en claro (solo se muestra una vez). */
  async create(
    communityId: string,
    input: MemberInput,
  ): Promise<{ memberId: string; pin: string }> {
    const data = unwrap(
      await supabase.rpc('admin_create_member', {
        p_community_id: communityId,
        p_dwelling_label: input.dwellingLabel,
        p_full_name: input.fullName,
        p_dni: input.dni,
      }),
    ) as unknown as { member_id: string; pin: string }
    return { memberId: data.member_id, pin: data.pin }
  },

  async update(memberId: string, input: MemberInput & { isActive: boolean }): Promise<void> {
    unwrap(
      await supabase.rpc('admin_update_member', {
        p_member_id: memberId,
        p_dwelling_label: input.dwellingLabel,
        p_full_name: input.fullName,
        p_dni: input.dni,
        p_is_active: input.isActive,
      }),
    )
  },

  async resetPin(memberId: string): Promise<string> {
    return unwrap(await supabase.rpc('admin_reset_member_pin', { p_member_id: memberId }))
  },

  /** Si la vivienda ya creó su contraseña y si está bloqueada (sin exponer hashes). */
  async accessStatus(communityId: string): Promise<MemberAccessStatus[]> {
    return unwrap(await supabase.rpc('admin_member_access_status', { p_community_id: communityId }))
  },
}
