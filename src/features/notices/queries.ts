import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { useNotifyingMutation } from '@/hooks/useNotifyingMutation'
import { useTableRealtime } from '@/hooks/useTableRealtime'
import { filesRepository } from '@/repositories/filesRepository'
import {
  boardRepository,
  noticesRepository,
  type NoticeInput,
} from '@/repositories/noticesRepository'
import type { BoardCategory, BoardPostStatus } from '@/types/domain'

export function useNotices(communityId: string) {
  useTableRealtime('notices', communityId, [['notices']])
  return useQuery({
    queryKey: queryKeys.notices(communityId),
    queryFn: () => noticesRepository.list(communityId),
  })
}

export function useBoard(communityId: string) {
  useTableRealtime('board_posts', communityId, [['board']])
  return useQuery({
    queryKey: queryKeys.board(communityId),
    queryFn: () => boardRepository.list(communityId),
  })
}

/** Marca un aviso como leído sin avisos visuales (se hace al abrirlo). */
export function useMarkNoticeRead(communityId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noticeId: string) => noticesRepository.markRead(noticeId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices(communityId) }),
  })
}

export function useSaveNotice(communityId: string) {
  return useNotifyingMutation({
    mutationFn: async ({
      input,
      noticeId,
      file,
      previousPath,
    }: {
      input: Omit<NoticeInput, 'attachment'> & { attachment: NoticeInput['attachment'] }
      noticeId?: string
      file: File | null
      previousPath: string | null
    }) => {
      let attachment = input.attachment
      if (file) {
        attachment = {
          path: await filesRepository.upload(communityId, 'notices', file),
          name: file.name,
        }
      }
      const payload = { ...input, attachment }
      if (noticeId) await noticesRepository.update(noticeId, payload)
      else await noticesRepository.create(communityId, payload)
      if (previousPath && previousPath !== attachment?.path) {
        await filesRepository.remove(previousPath).catch(() => undefined)
      }
    },
    invalidate: [queryKeys.notices(communityId)],
    success: (_, { noticeId }) => (noticeId ? 'Aviso actualizado' : 'Aviso publicado'),
  })
}

export function useDeleteNotice(communityId: string) {
  return useNotifyingMutation({
    mutationFn: async ({ id, attachmentPath }: { id: string; attachmentPath: string | null }) => {
      await noticesRepository.remove(id)
      if (attachmentPath) await filesRepository.remove(attachmentPath).catch(() => undefined)
    },
    invalidate: [queryKeys.notices(communityId)],
    success: 'Aviso eliminado',
  })
}

export function useCreateBoardPost(communityId: string) {
  return useNotifyingMutation({
    mutationFn: (input: { title: string; body: string; category: BoardCategory }) =>
      boardRepository.create(input),
    invalidate: [queryKeys.board(communityId)],
    success: 'Enviada. Se publicará cuando la administración la revise.',
  })
}

export function useWithdrawBoardPost(communityId: string) {
  return useNotifyingMutation({
    mutationFn: (postId: string) => boardRepository.withdraw(postId),
    invalidate: [queryKeys.board(communityId)],
    success: 'Publicación retirada',
  })
}

export function useModerateBoardPost(communityId: string) {
  return useNotifyingMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: BoardPostStatus; note: string }) =>
      boardRepository.moderate(id, decision, note),
    invalidate: [queryKeys.board(communityId)],
    success: (_, { decision }) =>
      decision === 'approved'
        ? 'Publicación aprobada y visible para la comunidad'
        : decision === 'rejected'
          ? 'Publicación rechazada'
          : 'Publicación retirada',
  })
}
