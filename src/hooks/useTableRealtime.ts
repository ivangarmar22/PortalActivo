import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import { subscribeToTable } from '@/repositories/realtimeRepository'

/**
 * Invalida las consultas indicadas cuando cambia una tabla filtrada por comunidad.
 * Realtime respeta RLS: cada usuario solo recibe los cambios que puede leer.
 */
export function useTableRealtime(table: string, communityId: string | undefined, keys: QueryKey[]) {
  const queryClient = useQueryClient()
  const keysHash = JSON.stringify(keys)

  useEffect(() => {
    if (!communityId) return
    const parsed = JSON.parse(keysHash) as QueryKey[]
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeToTable(table, `community_id=eq.${communityId}`, () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const key of parsed) void queryClient.invalidateQueries({ queryKey: key })
      }, 250)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [table, communityId, keysHash, queryClient])
}
