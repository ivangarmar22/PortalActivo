import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { useNotifyingMutation } from '@/hooks/useNotifyingMutation'
import { useTableRealtime } from '@/hooks/useTableRealtime'
import { reservationsRepository, type SpaceInput } from '@/repositories/reservationsRepository'

export function useSpaces(communityId: string) {
  return useQuery({
    queryKey: queryKeys.spaces(communityId),
    queryFn: () => reservationsRepository.listSpaces(communityId),
  })
}

export function useAvailability(spaceId: string | undefined, from: string, days: number) {
  return useQuery({
    queryKey: queryKeys.availability(spaceId ?? '', from),
    queryFn: () => reservationsRepository.availability(spaceId as string, from, days),
    enabled: Boolean(spaceId),
    refetchInterval: 30_000,
  })
}

export function useMyReservations(communityId: string) {
  useTableRealtime('reservations', communityId, [['myReservations'], ['availability']])
  return useQuery({
    queryKey: queryKeys.myReservations(),
    queryFn: () => reservationsRepository.listMine(),
  })
}

export function useAdminReservations(communityId: string) {
  useTableRealtime('reservations', communityId, [['adminReservations']])
  return useQuery({
    queryKey: queryKeys.adminReservations(communityId),
    queryFn: () => reservationsRepository.listForAdmin(communityId),
  })
}

const reservationKeys = [['availability'], ['myReservations'], ['adminReservations']]

export function useBookSlot() {
  return useNotifyingMutation({
    mutationFn: ({ slotId, day }: { slotId: string; day: string }) =>
      reservationsRepository.book(slotId, day),
    invalidate: reservationKeys,
    success: 'Reserva confirmada',
  })
}

export function useCancelReservation() {
  return useNotifyingMutation({
    mutationFn: (reservationId: string) => reservationsRepository.cancel(reservationId),
    invalidate: reservationKeys,
    success: 'Reserva cancelada',
  })
}

export function useAdminCancelReservation() {
  return useNotifyingMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      reservationsRepository.adminCancel(id, reason),
    invalidate: reservationKeys,
    success: 'Reserva cancelada',
  })
}

export function useSaveSpace(communityId: string) {
  return useNotifyingMutation({
    mutationFn: ({ input, spaceId }: { input: SpaceInput; spaceId?: string }) =>
      reservationsRepository.saveSpace(communityId, input, spaceId),
    invalidate: [queryKeys.spaces(communityId), ['availability']],
    success: (_, { spaceId }) => (spaceId ? 'Espacio actualizado' : 'Espacio creado'),
  })
}
