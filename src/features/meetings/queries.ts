import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { meetingScopedKeys, queryKeys } from '@/hooks/queryKeys'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { meetingsRepository, type MeetingInput } from '@/repositories/meetingsRepository'
import { minutesRepository } from '@/repositories/minutesRepository'
import type { Meeting } from '@/types/domain'

export function useMeetings(communityId: string) {
  return useQuery({
    queryKey: queryKeys.meetings(communityId),
    queryFn: () => meetingsRepository.listByCommunity(communityId),
  })
}

export function useMeeting(meetingId: string, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.meeting(meetingId),
    queryFn: () => meetingsRepository.get(meetingId),
    refetchInterval: options.refetchInterval,
  })
}

function useInvalidateMeeting() {
  const queryClient = useQueryClient()
  return (meetingId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['meetings'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    if (meetingId) {
      for (const key of meetingScopedKeys(meetingId)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }
  }
}

const onError = (error: unknown) => {
  toast.error(errorMessage(error))
}

export function useCreateMeeting(communityId: string) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: (input: MeetingInput) => meetingsRepository.create(communityId, input),
    onSuccess: () => {
      invalidate()
      toast.success('Reunión creada en preparación')
    },
    onError,
  })
}

export function useUpdateMeeting(meetingId: string) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: (input: MeetingInput) => meetingsRepository.update(meetingId, input),
    onSuccess: () => {
      invalidate(meetingId)
      toast.success('Reunión actualizada')
    },
    onError,
  })
}

export function useDeleteMeeting() {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: async (meeting: Meeting) => {
      await meetingsRepository.remove(meeting.id)
      if (meeting.minutes_file_path) {
        await minutesRepository.remove(meeting.minutes_file_path).catch(() => undefined)
      }
    },
    onSuccess: () => {
      invalidate()
      toast.success('Reunión eliminada')
    },
    onError,
  })
}

export function useStartMeeting(meetingId: string) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: () => meetingsRepository.start(meetingId),
    onSuccess: () => {
      invalidate(meetingId)
      toast.success('Reunión en curso. Las preguntas siguen cerradas hasta que las abras.')
    },
    onError,
  })
}

export function useFinishMeeting(meetingId: string) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: () => meetingsRepository.finish(meetingId),
    onSuccess: (closed) => {
      invalidate(meetingId)
      toast.success(
        closed > 0
          ? `Reunión finalizada. Se han cerrado ${pluralize(closed, 'pregunta abierta', 'preguntas abiertas')}.`
          : 'Reunión finalizada.',
      )
    },
    onError,
  })
}

export function useSaveMinutesText(meetingId: string) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: (content: string) =>
      meetingsRepository.updateMinutesText(meetingId, content.trim() ? content : null),
    onSuccess: () => {
      invalidate(meetingId)
      toast.success('Acta guardada')
    },
    onError,
  })
}

export function useUploadMinutesFile(meeting: Meeting) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: async (file: File) => {
      const path = await minutesRepository.upload(meeting.id, file)
      try {
        await meetingsRepository.setMinutesFile(meeting.id, { path, name: file.name })
      } catch (error) {
        await minutesRepository.remove(path).catch(() => undefined)
        throw error
      }
      if (meeting.minutes_file_path) {
        await minutesRepository.remove(meeting.minutes_file_path).catch(() => undefined)
      }
    },
    onSuccess: () => {
      invalidate(meeting.id)
      toast.success('PDF del acta subido')
    },
    onError,
  })
}

export function useRemoveMinutesFile(meeting: Meeting) {
  const invalidate = useInvalidateMeeting()
  return useMutation({
    mutationFn: async () => {
      if (!meeting.minutes_file_path) return
      await meetingsRepository.setMinutesFile(meeting.id, null)
      await minutesRepository.remove(meeting.minutes_file_path).catch(() => undefined)
    },
    onSuccess: () => {
      invalidate(meeting.id)
      toast.success('PDF del acta eliminado')
    },
    onError,
  })
}

export async function downloadMinutesFile(meeting: Meeting): Promise<void> {
  if (!meeting.minutes_file_path || !meeting.minutes_file_name) return
  try {
    const url = await minutesRepository.getDownloadUrl(
      meeting.minutes_file_path,
      meeting.minutes_file_name,
    )
    window.location.assign(url)
  } catch (error) {
    toast.error(errorMessage(error))
  }
}
