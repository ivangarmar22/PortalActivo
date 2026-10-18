import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '@/lib/errors'
import type { QuestionWithOptions } from '@/types/domain'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
const cast = vi.fn<(...args: unknown[]) => Promise<{ changed: boolean }>>()
vi.mock('@/repositories/votesRepository', () => ({
  votesRepository: { cast: (...args: unknown[]) => cast(...args) },
}))

const { VoteCard } = await import('@/features/participant/VoteCard')

function question(overrides: Partial<QuestionWithOptions> = {}): QuestionWithOptions {
  return {
    id: 'q1',
    meeting_id: 'm1',
    title: 'Elección del presupuesto',
    description: null,
    position: 1,
    response_type: 'single_choice',
    status: 'open',
    opened_at: '2026-10-16T16:40:00Z',
    closed_at: null,
    reopen_count: 0,
    created_at: '',
    updated_at: '',
    answer_options: [
      { id: 'a', question_id: 'q1', label: 'Presupuesto A', position: 1, created_at: '' },
      { id: 'b', question_id: 'q1', label: 'Presupuesto B', position: 2, created_at: '' },
    ],
    ...overrides,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('VoteCard', () => {
  beforeEach(() => {
    cast.mockReset()
  })

  it('pide confirmación antes de registrar el voto y confirma el registro', async () => {
    const user = userEvent.setup()
    cast.mockResolvedValue({ changed: false })
    render(
      <VoteCard meetingId="m1" question={question()} myVote={undefined} result={undefined} />,
      {
        wrapper,
      },
    )

    // Sin opción elegida, el botón indica qué falta.
    expect(screen.getByRole('button', { name: 'Elige una opción' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'Presupuesto B' }))
    const submit = screen.getByRole('button', { name: 'Votar' })
    expect(submit).toBeEnabled()
    await user.click(submit)
    expect(cast).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Presupuesto B')

    await user.click(screen.getByRole('button', { name: 'Confirmar voto' }))
    await waitFor(() => expect(cast).toHaveBeenCalledWith('q1', 'b'))
    expect(await screen.findByText('Tu voto se ha registrado correctamente.')).toBeInTheDocument()
  })

  it('si la votación se cerró mientras tanto, muestra el error del servidor', async () => {
    const user = userEvent.setup()
    cast.mockImplementation(() => Promise.reject(new AppError('question_not_open')))
    render(
      <VoteCard meetingId="m1" question={question()} myVote={undefined} result={undefined} />,
      {
        wrapper,
      },
    )

    await user.click(screen.getByRole('radio', { name: 'Presupuesto A' }))
    await user.click(screen.getByRole('button', { name: 'Votar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar voto' }))

    expect(await screen.findByText(/La votación de esta pregunta está cerrada/)).toBeInTheDocument()
  })

  it('con voto previo permite cambiarlo solo si se elige otra opción', async () => {
    const user = userEvent.setup()
    render(
      <VoteCard
        meetingId="m1"
        question={question()}
        myVote={{ question_id: 'q1', option_id: 'a', updated_at: '2026-10-16T16:45:00Z' }}
        result={undefined}
      />,
      { wrapper },
    )
    expect(screen.getByText(/Tu voto:/)).toHaveTextContent('Presupuesto A')
    const change = screen.getByRole('button', { name: 'Cambiar mi voto' })
    expect(change).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Presupuesto B' }))
    expect(change).toBeEnabled()
  })

  it('una pregunta cerrada no muestra controles de voto', () => {
    render(
      <VoteCard
        meetingId="m1"
        question={question({ status: 'closed', closed_at: '2026-10-16T17:00:00Z' })}
        myVote={undefined}
        result={undefined}
      />,
      { wrapper },
    )
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /votar/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Votación cerrada/)).toBeInTheDocument()
    const noVoteNotice = screen.getByRole('status')
    expect(noVoteNotice).toHaveTextContent('No consta voto de tu vivienda.')
    expect(noVoteNotice).toHaveClass('text-destructive')
  })

  it('una pregunta cerrada con voto no muestra el aviso de voto ausente', () => {
    render(
      <VoteCard
        meetingId="m1"
        question={question({ status: 'closed', closed_at: '2026-10-16T17:00:00Z' })}
        myVote={{ question_id: 'q1', option_id: 'a', updated_at: '2026-10-16T16:45:00Z' }}
        result={undefined}
      />,
      { wrapper },
    )
    expect(screen.getByText(/Tu voto:/)).toHaveTextContent('Presupuesto A')
    expect(screen.queryByText('No consta voto de tu vivienda.')).not.toBeInTheDocument()
  })
})
