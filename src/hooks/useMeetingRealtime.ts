import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { meetingScopedKeys } from '@/hooks/queryKeys'
import { subscribeToMeeting } from '@/repositories/realtimeRepository'

/**
 * Refresca los datos de la reunión cuando cambia algo en el servidor (apertura, cierre, votos).
 * Agrupa ráfagas de eventos para no lanzar una consulta por cada voto.
 */
export function useMeetingRealtime(meetingId: string, questionIdsForVotes: string[] = []) {
  const queryClient = useQueryClient()
  const votesKey = questionIdsForVotes.join(',')

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const key of meetingScopedKeys(meetingId)) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        void queryClient.invalidateQueries({ queryKey: ['meetings'] })
      }, 300)
    }
    const unsubscribe = subscribeToMeeting(meetingId, onChange, votesKey ? votesKey.split(',') : [])
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [meetingId, votesKey, queryClient])
}
