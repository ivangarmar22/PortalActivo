import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type {
  BoardCategory,
  BoardPost,
  BoardPostStatus,
  NoticeCategory,
  NoticeWithReads,
} from '@/types/domain'

export interface NoticeInput {
  title: string
  body: string
  category: NoticeCategory
  isUrgent: boolean
  isPinned: boolean
  publishedAt: string
  expiresAt: string | null
  attachment: { path: string; name: string } | null
}

export const noticesRepository = {
  /** Avisos visibles para el usuario (RLS: los vecinos no ven programados ni caducados). */
  async list(communityId: string): Promise<NoticeWithReads[]> {
    return unwrap(
      await supabase
        .from('notices')
        .select('*, notice_reads(member_id)')
        .eq('community_id', communityId)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false }),
    )
  },

  async create(communityId: string, input: NoticeInput): Promise<void> {
    unwrap(
      await supabase.from('notices').insert({
        community_id: communityId,
        title: input.title,
        body: input.body,
        category: input.category,
        is_urgent: input.isUrgent,
        is_pinned: input.isPinned,
        published_at: input.publishedAt,
        expires_at: input.expiresAt,
        attachment_path: input.attachment?.path ?? null,
        attachment_name: input.attachment?.name ?? null,
      }),
    )
  },

  async update(noticeId: string, input: NoticeInput): Promise<void> {
    unwrap(
      await supabase
        .from('notices')
        .update({
          title: input.title,
          body: input.body,
          category: input.category,
          is_urgent: input.isUrgent,
          is_pinned: input.isPinned,
          published_at: input.publishedAt,
          expires_at: input.expiresAt,
          attachment_path: input.attachment?.path ?? null,
          attachment_name: input.attachment?.name ?? null,
        })
        .eq('id', noticeId),
    )
  },

  async remove(noticeId: string): Promise<void> {
    unwrap(await supabase.from('notices').delete().eq('id', noticeId))
  },

  async markRead(noticeId: string): Promise<void> {
    unwrap(await supabase.rpc('mark_notice_read', { p_notice_id: noticeId }))
  },
}

export const boardRepository = {
  /** RLS: los vecinos ven las publicaciones aprobadas y las suyas; la administración, todas. */
  async list(communityId: string): Promise<BoardPost[]> {
    return unwrap(
      await supabase
        .from('board_posts')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false }),
    )
  },

  async create(input: { title: string; body: string; category: BoardCategory }): Promise<void> {
    unwrap(
      await supabase.rpc('member_create_board_post', {
        p_title: input.title,
        p_body: input.body,
        p_category: input.category,
      }),
    )
  },

  async withdraw(postId: string): Promise<void> {
    unwrap(await supabase.rpc('member_withdraw_board_post', { p_post_id: postId }))
  },

  async moderate(postId: string, decision: BoardPostStatus, note: string): Promise<void> {
    unwrap(
      await supabase.rpc('admin_moderate_board_post', {
        p_post_id: postId,
        p_decision: decision,
        p_note: note,
      }),
    )
  },
}
