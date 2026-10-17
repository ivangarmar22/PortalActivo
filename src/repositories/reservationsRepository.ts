import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type {
  AdminReservation,
  AvailabilitySlot,
  ReservationWithSpace,
  SpaceWithSlots,
} from '@/types/domain'

export interface SpaceInput {
  name: string
  description: string
  rules: string
  maxFuture: number
  cancelHours: number
  windowDays: number
  isActive: boolean
  slots: { id?: string; label: string; start: string; end: string; weekdays: number[] }[]
}

export const reservationsRepository = {
  async listSpaces(communityId: string): Promise<SpaceWithSlots[]> {
    const rows = unwrap(
      await supabase
        .from('common_spaces')
        .select('*, space_slots(*)')
        .eq('community_id', communityId)
        .order('name'),
    )
    return rows.map((s) => ({
      ...s,
      space_slots: [...s.space_slots].sort((a, b) => a.position - b.position),
    }))
  },

  async availability(spaceId: string, from: string, days: number): Promise<AvailabilitySlot[]> {
    const rows = unwrap(
      await supabase.rpc('get_space_availability', {
        p_space_id: spaceId,
        p_from: from,
        p_days: days,
      }),
    )
    return rows as AvailabilitySlot[]
  },

  /** Reservas propias (RLS: cada vivienda solo ve las suyas). */
  async listMine(): Promise<ReservationWithSpace[]> {
    return unwrap(
      await supabase
        .from('reservations')
        .select('*, common_spaces(name)')
        .eq('status', 'confirmed')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at'),
    )
  },

  async listForAdmin(communityId: string): Promise<AdminReservation[]> {
    return unwrap(
      await supabase
        .from('reservations')
        .select('*, common_spaces(name), community_members(dwelling_label, full_name)')
        .eq('community_id', communityId)
        .gte('ends_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('starts_at'),
    )
  },

  async book(slotId: string, day: string): Promise<string> {
    return unwrap(await supabase.rpc('member_book_slot', { p_slot_id: slotId, p_day: day }))
  },

  async cancel(reservationId: string): Promise<void> {
    unwrap(await supabase.rpc('member_cancel_reservation', { p_reservation_id: reservationId }))
  },

  async adminCancel(reservationId: string, reason: string): Promise<void> {
    unwrap(
      await supabase.rpc('admin_cancel_reservation', {
        p_reservation_id: reservationId,
        p_reason: reason,
      }),
    )
  },

  async saveSpace(communityId: string, input: SpaceInput, spaceId?: string): Promise<string> {
    return unwrap(
      await supabase.rpc('admin_save_space', {
        p_community_id: communityId,
        p_space_id: spaceId as string,
        p_name: input.name,
        p_description: input.description,
        p_rules: input.rules,
        p_max_future: input.maxFuture,
        p_cancel_hours: input.cancelHours,
        p_window_days: input.windowDays,
        p_is_active: input.isActive,
        p_slots: input.slots,
      }),
    )
  },
}
