import type { MeetingResultRow, QuestionResult } from '@/types/domain'

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Agrupa las filas de get_meeting_results (una por opción) en resultados por pregunta.
 * Los recuentos y porcentajes vienen calculados por PostgreSQL; aquí solo se agrupan y se marca
 * la opción u opciones más votadas (empates incluidos; ninguna si no hay votos).
 */
export function buildQuestionResults(rows: MeetingResultRow[]): QuestionResult[] {
  const byQuestion = new Map<string, QuestionResult>()

  for (const row of rows) {
    let question = byQuestion.get(row.question_id)
    if (!question) {
      question = {
        id: row.question_id,
        position: row.question_position,
        title: row.question_title,
        status: row.question_status,
        openedAt: row.question_opened_at,
        closedAt: row.question_closed_at,
        totalVotes: row.total_votes,
        eligibleMembers: row.eligible_members,
        participation:
          row.eligible_members > 0
            ? roundOne((100 * row.total_votes) / row.eligible_members)
            : null,
        options: [],
      }
      byQuestion.set(row.question_id, question)
    }
    question.options.push({
      id: row.option_id,
      label: row.option_label,
      position: row.option_position,
      votes: row.vote_count,
      percentage: row.percentage === null ? null : Number(row.percentage),
      isLeading: false,
    })
  }

  const results = [...byQuestion.values()].sort((a, b) => a.position - b.position)
  for (const question of results) {
    question.options.sort((a, b) => a.position - b.position)
    const max = Math.max(0, ...question.options.map((o) => o.votes))
    if (max > 0) {
      for (const option of question.options) option.isLeading = option.votes === max
    }
  }
  return results
}
