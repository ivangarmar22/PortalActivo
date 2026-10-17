import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meetingScopedKeys, queryKeys } from '@/hooks/queryKeys'
import { votesRepository } from '@/repositories/votesRepository'

export function useMyVotes(meetingId: string, questionIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.myVotes(meetingId), questionIds.join(',')],
    queryFn: () => votesRepository.listMine(questionIds),
    enabled: questionIds.length > 0,
  })
}

export function useCastVote(meetingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, optionId }: { questionId: string; optionId: string }) =>
      votesRepository.cast(questionId, optionId),
    onSettled: () => {
      // Tanto si se registra como si falla (p. ej. la pregunta se acaba de cerrar), se recarga el estado real.
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
