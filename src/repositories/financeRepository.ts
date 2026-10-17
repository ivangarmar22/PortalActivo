import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type {
  AdminReceipt,
  CommunityDocument,
  DocumentKind,
  FinanceSummary,
  Receipt,
  ReceiptStatus,
} from '@/types/domain'

export interface IssueReceiptsInput {
  concept: string
  periodStart: string
  amountCents: number
  dueDate: string
}

export interface DocumentInput {
  kind: DocumentKind
  title: string
  supplier: string | null
  amountCents: number | null
  documentDate: string
  file: { path: string; name: string }
}

export const financeRepository = {
  /** RLS: cada vivienda solo ve sus recibos. */
  async listMyReceipts(): Promise<Receipt[]> {
    return unwrap(
      await supabase.from('receipts').select('*').order('period_start', { ascending: false }),
    )
  },

  async listReceiptsForAdmin(communityId: string): Promise<AdminReceipt[]> {
    return unwrap(
      await supabase
        .from('receipts')
        .select('*, community_members(dwelling_label, full_name)')
        .eq('community_id', communityId)
        .order('period_start', { ascending: false })
        .order('due_date', { ascending: true }),
    )
  },

  async summary(communityId: string): Promise<FinanceSummary> {
    const data = unwrap(
      await supabase.rpc('admin_finance_summary', { p_community_id: communityId }),
    )
    return data as unknown as FinanceSummary
  },

  async issueReceipts(communityId: string, input: IssueReceiptsInput): Promise<number> {
    return unwrap(
      await supabase.rpc('admin_issue_receipts', {
        p_community_id: communityId,
        p_concept: input.concept,
        p_period_start: input.periodStart,
        p_amount_cents: input.amountCents,
        p_due_date: input.dueDate,
      }),
    )
  },

  async setReceiptStatus(receiptId: string, status: ReceiptStatus): Promise<void> {
    unwrap(
      await supabase
        .from('receipts')
        .update({
          status,
          paid_at: status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq('id', receiptId),
    )
  },

  async setReceiptFile(
    receiptId: string,
    file: { path: string; name: string } | null,
  ): Promise<void> {
    unwrap(
      await supabase
        .from('receipts')
        .update({ file_path: file?.path ?? null, file_name: file?.name ?? null })
        .eq('id', receiptId),
    )
  },

  async listDocuments(communityId: string): Promise<CommunityDocument[]> {
    return unwrap(
      await supabase
        .from('community_documents')
        .select('*')
        .eq('community_id', communityId)
        .order('document_date', { ascending: false }),
    )
  },

  async createDocument(communityId: string, input: DocumentInput): Promise<void> {
    unwrap(
      await supabase.from('community_documents').insert({
        community_id: communityId,
        kind: input.kind,
        title: input.title,
        supplier: input.supplier,
        amount_cents: input.amountCents,
        document_date: input.documentDate,
        file_path: input.file.path,
        file_name: input.file.name,
      }),
    )
  },

  async removeDocument(documentId: string): Promise<void> {
    unwrap(await supabase.from('community_documents').delete().eq('id', documentId))
  },
}
