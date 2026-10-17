// Concurrencia real: peticiones simultáneas por HTTP contra PostgreSQL.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  createOpenQuestion,
  expectOk,
  MEMBERS_A,
  memberClient,
  voteRows,
} from '@/tests/integration/helpers'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Client = Awaited<ReturnType<typeof adminClient>>

let admin: Client
let members: Client[]

beforeAll(async () => {
  admin = await adminClient()
  members = await Promise.all(MEMBERS_A.map(memberClient))
})

describe('votación concurrente', () => {
  it('20 votos simultáneos de la misma vivienda dejan un único voto', async () => {
    const { questionId, optionIds } = await createOpenQuestion(admin, 'misma vivienda')
    const voter = members[0]!

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        voter.rpc('cast_vote', { p_question_id: questionId, p_option_id: optionIds[i % 3]! }),
      ),
    )

    expect(responses.every((r) => r.error === null)).toBe(true)
    const rows = await voteRows(admin, questionId)
    expect(rows).toHaveLength(1)
  })

  it('votos simultáneos de todas las viviendas: un voto por vivienda y recuentos exactos', async () => {
    const { meetingId, questionId, optionIds } = await createOpenQuestion(
      admin,
      'todas las viviendas',
    )
    // Cada vivienda vota 3 veces a la vez (la última opción gana): 1 fila por vivienda.
    const responses = await Promise.all(
      members.flatMap((client, index) =>
        [0, 1, 2].map(() =>
          client.rpc('cast_vote', {
            p_question_id: questionId,
            p_option_id: optionIds[index % 2]!,
          }),
        ),
      ),
    )
    expect(responses.filter((r) => r.error).map((r) => r.error?.message)).toEqual([])

    const rows = await voteRows(admin, questionId)
    expect(rows).toHaveLength(MEMBERS_A.length)

    const results = await expectOk(admin.rpc('get_meeting_results', { p_meeting_id: meetingId }))
    const counts = Object.fromEntries(results.map((r) => [r.option_label, r.vote_count]))
    expect(counts).toEqual({ 'A favor': 5, 'En contra': 5, Abstención: 0 })
    expect(results.every((r) => r.total_votes === 10)).toBe(true)
    expect(results.find((r) => r.option_label === 'Abstención')?.percentage).toBe(0)
  })

  it('cerrar en mitad de una ráfaga: ningún voto entra después del cierre', async () => {
    const { questionId, optionIds } = await createOpenQuestion(admin, 'cierre en ráfaga')

    const attempts = members.flatMap((client, index) =>
      [0, 15, 30, 60, 120].map(async (delay): Promise<{ ok: boolean; message?: string }> => {
        await sleep(delay)
        const { error } = await client.rpc('cast_vote', {
          p_question_id: questionId,
          p_option_id: optionIds[(index + delay) % 3]!,
        })
        return error ? { ok: false, message: error.message } : { ok: true }
      }),
    )
    const closing = (async () => {
      await sleep(40)
      const { error } = await admin.rpc('close_question', { p_question_id: questionId })
      if (error) throw new Error(error.message)
    })()

    const [outcomes] = await Promise.all([Promise.all(attempts), closing])

    // Los rechazos solo pueden deberse al cierre.
    const failures = outcomes.filter((o) => !o.ok)
    expect(failures.every((f) => f.message === 'question_not_open')).toBe(true)

    const { data: question, error } = await admin
      .from('questions')
      .select('status, closed_at')
      .eq('id', questionId)
      .single()
    if (error) throw error
    expect(question.status).toBe('closed')
    const closedAt = new Date(question.closed_at ?? 0).getTime()
    const rows = await voteRows(admin, questionId)
    for (const row of rows) {
      expect(new Date(row.updated_at).getTime()).toBeLessThanOrEqual(closedAt)
    }

    // Una pantalla que siga abierta en un dispositivo tampoco puede votar ya.
    const late = await members[0]!.rpc('cast_vote', {
      p_question_id: questionId,
      p_option_id: optionIds[0]!,
    })
    expect(late.error?.message).toBe('question_not_open')
  })

  it('apertura y cierre globales simultáneos mantienen estados coherentes', async () => {
    const { meetingId } = await createOpenQuestion(admin, 'operaciones globales')
    await expectOk(
      admin.rpc('admin_save_question', {
        p_meeting_id: meetingId,
        p_title: 'Segunda',
        p_description: '',
        p_options: ['Sí', 'No'],
      }),
    )

    const [opened, closed] = await Promise.all([
      admin.rpc('open_eligible_questions', { p_meeting_id: meetingId }),
      admin.rpc('close_open_questions', { p_meeting_id: meetingId }),
    ])
    expect(opened.error).toBeNull()
    expect(closed.error).toBeNull()

    const questions = await expectOk(
      admin.from('questions').select('status, opened_at, closed_at').eq('meeting_id', meetingId),
    )
    for (const q of questions) {
      expect(q.opened_at).not.toBeNull()
      if (q.status === 'closed') expect(q.closed_at).not.toBeNull()
      else expect(q.closed_at).toBeNull()
    }
    const log = await expectOk(admin.from('question_status_log').select('question_id'))
    expect(log.length).toBeGreaterThan(0)
  })
})
