import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'

export interface MyVote {
  question_id: string
  option_id: string
  updated_at: string
}

export const votesRepository = {
  /** Registra o modifica el voto. El servidor comprueba el estado de la pregunta de forma atómica. */
  async cast(questionId: string, optionId: string): Promise<{ changed: boolean }> {
    const data = unwrap(
      await supabase.rpc('cast_vote', { p_question_id: questionId, p_option_id: optionId }),
    )
    return data as unknown as { changed: boolean }
  },

  /** Registra un voto presencial con permisos de administración y trazabilidad. */
  async recordManual(input: {
    questionId: string
    memberId: string
    optionId: string
  }): Promise<void> {
    unwrap(
      await supabase.rpc('admin_record_vote', {
        p_question_id: input.questionId,
        p_member_id: input.memberId,
        p_option_id: input.optionId,
      }),
    )
  },

  /** Votos propios (RLS: un propietario solo ve los de su vivienda). */
  async listMine(questionIds: string[]): Promise<MyVote[]> {
    if (questionIds.length === 0) return []
    return unwrap(
      await supabase
        .from('votes')
        .select('question_id, option_id, updated_at')
        .in('question_id', questionIds),
    )
  },
}
