import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultBars } from '@/features/results/ResultBars'
import type { QuestionResult } from '@/types/domain'

const base: QuestionResult = {
  id: 'q1',
  position: 1,
  title: 'Cuentas 2025',
  status: 'closed',
  openedAt: null,
  closedAt: null,
  totalVotes: 9,
  eligibleMembers: 10,
  participation: 90,
  options: [
    { id: 'a', label: 'A favor', position: 1, votes: 7, percentage: 77.8, isLeading: true },
    { id: 'b', label: 'En contra', position: 2, votes: 2, percentage: 22.2, isLeading: false },
  ],
}

describe('ResultBars', () => {
  it('muestra recuentos, porcentajes y la opción más votada con texto (no solo color)', () => {
    render(<ResultBars result={base} />)
    expect(screen.getByRole('img', { name: 'A favor: 7 votos, 77,8 %' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'En contra: 2 votos, 22,2 %' })).toBeInTheDocument()
    expect(screen.getByText('Más votada')).toBeInTheDocument()
    expect(screen.getByText(/Participación: 9 de 10 viviendas \(90,0 %\)/)).toBeInTheDocument()
  })

  it('sin votos muestra «Sin votos todavía» y guiones en lugar de 0 %', () => {
    render(
      <ResultBars
        result={{
          ...base,
          totalVotes: 0,
          participation: 0,
          options: base.options.map((o) => ({
            ...o,
            votes: 0,
            percentage: null,
            isLeading: false,
          })),
        }}
      />,
    )
    expect(screen.getByText(/Sin votos todavía/)).toBeInTheDocument()
    expect(screen.queryByText('Más votada')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'A favor: 0 votos, —' })).toBeInTheDocument()
  })
})
