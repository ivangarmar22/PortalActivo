import { describe, expect, it } from 'vitest'
import { buildQuestionResults } from '@/services/resultsService'
import type { MeetingResultRow } from '@/types/domain'

function row(overrides: Partial<MeetingResultRow>): MeetingResultRow {
  return {
    question_id: 'q1',
    question_position: 1,
    question_title: 'Cuentas',
    question_status: 'closed',
    question_opened_at: '2026-03-12T17:10:00Z',
    question_closed_at: '2026-03-12T18:30:00Z',
    option_id: 'o1',
    option_position: 1,
    option_label: 'A favor',
    vote_count: 0,
    total_votes: 0,
    eligible_members: 10,
    percentage: null,
    ...overrides,
  }
}

describe('buildQuestionResults', () => {
  it('agrupa por pregunta, ordena y calcula la participación sobre el censo', () => {
    const results = buildQuestionResults([
      row({
        question_id: 'q2',
        question_position: 2,
        option_id: 'x',
        vote_count: 1,
        total_votes: 1,
        percentage: 100,
      }),
      row({
        option_id: 'o2',
        option_position: 2,
        option_label: 'En contra',
        vote_count: 2,
        total_votes: 9,
        percentage: 22.2,
      }),
      row({ option_id: 'o1', vote_count: 7, total_votes: 9, percentage: 77.8 }),
    ])

    expect(results.map((r) => r.id)).toEqual(['q1', 'q2'])
    const [first] = results
    expect(first?.options.map((o) => o.label)).toEqual(['A favor', 'En contra'])
    expect(first?.totalVotes).toBe(9)
    expect(first?.participation).toBe(90)
    expect(first?.options[0]?.isLeading).toBe(true)
    expect(first?.options[1]?.isLeading).toBe(false)
  })

  it('marca todas las opciones empatadas como más votadas', () => {
    const [result] = buildQuestionResults([
      row({ option_id: 'a', vote_count: 3, total_votes: 6, percentage: 50 }),
      row({ option_id: 'b', option_position: 2, vote_count: 3, total_votes: 6, percentage: 50 }),
    ])
    expect(result?.options.every((o) => o.isLeading)).toBe(true)
  })

  it('una pregunta sin votos no tiene opción más votada ni porcentajes', () => {
    const [result] = buildQuestionResults([
      row({ option_id: 'a' }),
      row({ option_id: 'b', option_position: 2 }),
    ])
    expect(result?.totalVotes).toBe(0)
    expect(result?.participation).toBe(0)
    expect(result?.options.some((o) => o.isLeading)).toBe(false)
    expect(result?.options.every((o) => o.percentage === null)).toBe(true)
  })

  it('sin censo la participación es nula (no se divide entre cero)', () => {
    const [result] = buildQuestionResults([row({ eligible_members: 0 })])
    expect(result?.participation).toBeNull()
  })

  it('convierte el porcentaje numérico que llega como texto', () => {
    const [result] = buildQuestionResults([
      row({ vote_count: 1, total_votes: 3, percentage: '33.3' as unknown as number }),
    ])
    expect(result?.options[0]?.percentage).toBe(33.3)
  })
})
