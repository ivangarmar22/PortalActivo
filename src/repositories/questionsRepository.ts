import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type { QuestionWithOptions } from '@/types/domain'

export interface QuestionInput {
  title: string
  description: string
  options: string[]
}

export const questionsRepository = {
  /** Preguntas visibles para el usuario actual (RLS: los propietarios no ven borradores). */
  async listByMeeting(meetingId: string): Promise<QuestionWithOptions[]> {
    const rows = unwrap(
      await supabase
        .from('questions')
        .select('*, answer_options(*)')
        .eq('meeting_id', meetingId)
        .order('position'),
    )
    return rows.map((q) => ({
      ...q,
      answer_options: [...q.answer_options].sort((a, b) => a.position - b.position),
    }))
  },

  async save(meetingId: string, input: QuestionInput, questionId?: string): Promise<string> {
    return unwrap(
      await supabase.rpc('admin_save_question', {
        p_meeting_id: meetingId,
        p_title: input.title,
        p_description: input.description,
        p_options: input.options,
        ...(questionId ? { p_question_id: questionId } : {}),
      }),
    )
  },

  async remove(questionId: string): Promise<void> {
    unwrap(await supabase.rpc('admin_delete_question', { p_question_id: questionId }))
  },

  async reorder(meetingId: string, orderedIds: string[]): Promise<void> {
    unwrap(
      await supabase.rpc('admin_reorder_questions', {
        p_meeting_id: meetingId,
        p_question_ids: orderedIds,
      }),
    )
  },

  async open(questionId: string): Promise<void> {
    unwrap(await supabase.rpc('open_question', { p_question_id: questionId }))
  },

  async close(questionId: string): Promise<void> {
    unwrap(await supabase.rpc('close_question', { p_question_id: questionId }))
  },

  async reopen(questionId: string): Promise<void> {
    unwrap(await supabase.rpc('reopen_question', { p_question_id: questionId }))
  },

  async openEligible(meetingId: string): Promise<number> {
    return unwrap(await supabase.rpc('open_eligible_questions', { p_meeting_id: meetingId }))
  },

  async closeOpen(meetingId: string): Promise<number> {
    return unwrap(await supabase.rpc('close_open_questions', { p_meeting_id: meetingId }))
  },
}
