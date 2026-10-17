import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { useNotifyingMutation } from '@/hooks/useNotifyingMutation'
import { pluralize } from '@/lib/format'
import {
  financeRepository,
  type DocumentInput,
  type IssueReceiptsInput,
} from '@/repositories/financeRepository'
import { filesRepository } from '@/repositories/filesRepository'
import type { ReceiptStatus } from '@/types/domain'

export function useMyReceipts() {
  return useQuery({
    queryKey: queryKeys.myReceipts(),
    queryFn: () => financeRepository.listMyReceipts(),
  })
}

export function useAdminReceipts(communityId: string) {
  return useQuery({
    queryKey: queryKeys.adminReceipts(communityId),
    queryFn: () => financeRepository.listReceiptsForAdmin(communityId),
  })
}

export function useFinanceSummary(communityId: string) {
  return useQuery({
    queryKey: queryKeys.financeSummary(communityId),
    queryFn: () => financeRepository.summary(communityId),
  })
}

export function useDocuments(communityId: string) {
  return useQuery({
    queryKey: queryKeys.documents(communityId),
    queryFn: () => financeRepository.listDocuments(communityId),
  })
}

const receiptKeys = (communityId: string) => [
  queryKeys.adminReceipts(communityId),
  queryKeys.financeSummary(communityId),
  ['dashboard'],
]

export function useIssueReceipts(communityId: string) {
  return useNotifyingMutation({
    mutationFn: (input: IssueReceiptsInput) => financeRepository.issueReceipts(communityId, input),
    invalidate: receiptKeys(communityId),
    success: (count) =>
      count > 0
        ? `${pluralize(count, 'recibo emitido', 'recibos emitidos')}`
        : 'Todas las viviendas ya tenían ese recibo: no se ha duplicado ninguno.',
  })
}

export function useSetReceiptStatus(communityId: string) {
  return useNotifyingMutation({
    mutationFn: ({ id, status }: { id: string; status: ReceiptStatus }) =>
      financeRepository.setReceiptStatus(id, status),
    invalidate: receiptKeys(communityId),
    success: (_, { status }) =>
      status === 'paid'
        ? 'Recibo marcado como pagado'
        : status === 'returned'
          ? 'Recibo marcado como devuelto'
          : 'Recibo marcado como pendiente',
  })
}

export function useAttachReceiptFile(communityId: string) {
  return useNotifyingMutation({
    mutationFn: async ({ id, memberId, file }: { id: string; memberId: string; file: File }) => {
      const path = await filesRepository.upload(communityId, 'receipts', file, { memberId })
      await financeRepository.setReceiptFile(id, { path, name: file.name })
    },
    invalidate: receiptKeys(communityId),
    success: 'PDF del recibo adjuntado',
  })
}

export function useCreateDocument(communityId: string) {
  return useNotifyingMutation({
    mutationFn: async ({ input, file }: { input: Omit<DocumentInput, 'file'>; file: File }) => {
      const path = await filesRepository.upload(communityId, 'documents', file)
      try {
        await financeRepository.createDocument(communityId, {
          ...input,
          file: { path, name: file.name },
        })
      } catch (error) {
        await filesRepository.remove(path).catch(() => undefined)
        throw error
      }
    },
    invalidate: [queryKeys.documents(communityId)],
    success: 'Documento publicado para toda la comunidad',
  })
}

export function useDeleteDocument(communityId: string) {
  return useNotifyingMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await financeRepository.removeDocument(id)
      await filesRepository.remove(path).catch(() => undefined)
    },
    invalidate: [queryKeys.documents(communityId)],
    success: 'Documento eliminado',
  })
}
