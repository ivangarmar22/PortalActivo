import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { useNotifyingMutation } from '@/hooks/useNotifyingMutation'
import { useTableRealtime } from '@/hooks/useTableRealtime'
import { filesRepository } from '@/repositories/filesRepository'
import {
  incidentsRepository,
  type IncidentReportInput,
  type IncidentUpdateInput,
} from '@/repositories/incidentsRepository'
import { incidentStatusLabel } from '@/lib/status'

export function useIncidents(communityId: string) {
  // Tiempo real: cualquier cambio de estado se refleja al momento en todas las pantallas.
  useTableRealtime('incidents', communityId, [['incidents'], ['incident']])
  return useQuery({
    queryKey: queryKeys.incidents(communityId),
    queryFn: () => incidentsRepository.listByCommunity(communityId),
  })
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: queryKeys.incident(incidentId),
    queryFn: () => incidentsRepository.get(incidentId),
  })
}

/** Firma y abre la foto de una incidencia (solo la ven los vecinos de la comunidad). */
export function useIncidentPhoto(path: string | null) {
  return useQuery({
    queryKey: ['incidentPhoto', path],
    queryFn: () => filesRepository.signedUrl(path as string),
    enabled: Boolean(path),
    staleTime: 4 * 60_000,
  })
}

export function useReportIncident(communityId: string, asAdmin = false) {
  return useNotifyingMutation({
    mutationFn: async ({
      input,
      photo,
    }: {
      input: Omit<IncidentReportInput, 'photoPath'>
      photo: File | null
    }) => {
      const photoPath = photo ? await filesRepository.upload(communityId, 'incidents', photo) : null
      const payload = { ...input, photoPath }
      return asAdmin
        ? incidentsRepository.adminCreate(communityId, payload)
        : incidentsRepository.report(payload)
    },
    invalidate: [queryKeys.incidents(communityId)],
    success: 'Incidencia registrada. La administración ya la puede ver.',
  })
}

export function useUpdateIncident(communityId: string, incidentId: string) {
  return useNotifyingMutation({
    mutationFn: (input: IncidentUpdateInput) => incidentsRepository.adminUpdate(incidentId, input),
    invalidate: [queryKeys.incidents(communityId), queryKeys.incident(incidentId)],
    success: (_, input) =>
      `Incidencia actualizada: ${incidentStatusLabel[input.status].toLowerCase()}`,
  })
}
