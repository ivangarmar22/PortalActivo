import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { countersRepository } from '@/repositories/countersRepository'

/** Incidencias nuevas y publicaciones pendientes, para el menú y el panel. */
export function useAdminCounters(communityId: string) {
  return useQuery({
    queryKey: queryKeys.adminCounters(communityId),
    queryFn: () => countersRepository.admin(communityId),
    refetchInterval: 30_000,
  })
}
