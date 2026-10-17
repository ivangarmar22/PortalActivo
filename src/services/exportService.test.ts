import { describe, expect, it } from 'vitest'
import { buildResultsCsv, slugify, toCsv } from '@/services/exportService'
import type { QuestionResult } from '@/types/domain'

describe('toCsv', () => {
  it('usa ";" como separador, CRLF y BOM UTF-8', () => {
    const csv = toCsv([
      ['a', 1],
      ['b', null],
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('a;1\r\nb;\r\n')
  })

  it('entrecomilla los valores con separadores, comillas o saltos de línea', () => {
    expect(toCsv([['x;y', 'di "hola"', 'l1\nl2']]).slice(1)).toBe(
      '"x;y";"di ""hola""";"l1\nl2"\r\n',
    )
  })
})

describe('buildResultsCsv', () => {
  it('genera una fila por opción con porcentajes en formato español', () => {
    const results: QuestionResult[] = [
      {
        id: 'q1',
        position: 1,
        title: 'Cuentas',
        status: 'open',
        openedAt: null,
        closedAt: null,
        totalVotes: 3,
        eligibleMembers: 10,
        participation: 30,
        options: [
          { id: 'a', label: 'A favor', position: 1, votes: 2, percentage: 66.7, isLeading: true },
          {
            id: 'b',
            label: 'En contra',
            position: 2,
            votes: 1,
            percentage: 33.3,
            isLeading: false,
          },
        ],
      },
    ]
    const lines = buildResultsCsv(results).slice(1).trim().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('1;Cuentas;Abierta;A favor;2;66,7;3;10;30,0;')
  })
})

describe('slugify', () => {
  it('quita acentos y caracteres especiales', () => {
    expect(slugify('Junta extraordinaria: rehabilitación de fachada')).toBe(
      'junta-extraordinaria-rehabilitacion-de-fachada',
    )
  })
})

describe('buildResultsPdf', () => {
  it('genera un PDF válido con los resultados', async () => {
    const { buildResultsPdf } = await import('@/services/exportService')
    const blob = await buildResultsPdf({
      communityName: 'Residencial de prueba',
      meeting: {
        id: 'm1',
        community_id: 'c1',
        title: 'Junta ordinaria 2026',
        description: null,
        meeting_date: '2026-03-12T17:00:00Z',
        minutes_content: null,
        minutes_file_path: null,
        minutes_file_name: null,
        status: 'finished',
        started_at: '2026-03-12T17:05:00Z',
        finished_at: '2026-03-12T18:40:00Z',
        created_by: null,
        created_at: '',
        updated_at: '',
      },
      results: [
        {
          id: 'q1',
          position: 1,
          title: 'Aprobación de cuentas',
          status: 'closed',
          openedAt: null,
          closedAt: '2026-03-12T18:30:00Z',
          totalVotes: 9,
          eligibleMembers: 10,
          participation: 90,
          options: [
            { id: 'a', label: 'A favor', position: 1, votes: 7, percentage: 77.8, isLeading: true },
            {
              id: 'b',
              label: 'En contra',
              position: 2,
              votes: 2,
              percentage: 22.2,
              isLeading: false,
            },
          ],
        },
      ],
    })
    const header = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
    expect(header).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(1000)
  })
})
