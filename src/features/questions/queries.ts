import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { meetingScopedKeys, queryKeys } from '@/hooks/queryKeys'
import { errorMessage, toAppError } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { questionsRepository, type QuestionInput } from '@/repositories/questionsRepository'
import { votesRepository } from '@/repositories/votesRepository'

export function useQuestions(meetingId: string, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.questions(meetingId),
    queryFn: () => questionsRepository.listByMeeting(meetingId),
    refetchInterval: options.refetchInterval,
  })
}

function useMeetingMutation<TVariables, TResult>(
  meetingId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
  successMessage: (result: TResult, variables: TVariables) => string | null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      const message = successMessage(result, variables)
      if (message) toast.success(message)
    },
    onError: (error) => {
      toast.error(errorMessage(error))
      // El estado del servidor puede haber cambiado (p. ej. otra persona cerró la pregunta).
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useSaveQuestion(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    ({ input, questionId }: { input: QuestionInput; questionId?: string }) =>
      questionsRepository.save(meetingId, input, questionId),
    (_, { questionId }) => (questionId ? 'Pregunta actualizada' : 'Pregunta añadida'),
  )
}

export function useDeleteQuestion(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    (questionId: string) => questionsRepository.remove(questionId),
    () => 'Pregunta eliminada',
  )
}

export function useReorderQuestions(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    (orderedIds: string[]) => questionsRepository.reorder(meetingId, orderedIds),
    () => null,
  )
}

export function useOpenQuestion(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    (questionId: string) => questionsRepository.open(questionId),
    () => 'Votación abierta',
  )
}

export function useCloseQuestion(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    (questionId: string) => questionsRepository.close(questionId),
    () => 'Votación cerrada: ya no se admiten votos ni cambios',
  )
}

export function useReopenQuestion(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    (questionId: string) => questionsRepository.reopen(questionId),
    () => 'Votación reabierta. Se conservan los votos anteriores.',
  )
}

export function useOpenEligible(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    () => questionsRepository.openEligible(meetingId),
    (count) =>
      count > 0
        ? `Se han abierto ${pluralize(count, 'pregunta', 'preguntas')}`
        : 'No había preguntas elegibles para abrir',
  )
}

export function useCloseOpen(meetingId: string) {
  return useMeetingMutation(
    meetingId,
    () => questionsRepository.closeOpen(meetingId),
    (count) =>
      count > 0
        ? `Se han cerrado ${pluralize(count, 'pregunta', 'preguntas')}`
        : 'No había preguntas abiertas',
  )
}

export function useRecordManualVote(meetingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { questionId: string; memberId: string; optionId: string }) =>
      votesRepository.recordManual(input),
    onSuccess: () => {
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Voto presencial registrado')
    },
    onError: (error) => {
      if (toAppError(error).code !== 'vote_already_exists') {
        toast.error(errorMessage(error))
      }
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
