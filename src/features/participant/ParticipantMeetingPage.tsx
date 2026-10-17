import { ArrowLeft, FileDown, FileText, MessageSquareText } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { MeetingStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { downloadMinutesFile, useMeeting } from '@/features/meetings/queries'
import { useMyVotes } from '@/features/participant/queries'
import { VoteCard } from '@/features/participant/VoteCard'
import { useQuestions } from '@/features/questions/queries'
import { useMeetingResults } from '@/features/results/queries'
import { useMeetingRealtime } from '@/hooks/useMeetingRealtime'
import { formatDateTime, pluralize } from '@/lib/format'

// Respaldo por si Realtime no está disponible: el servidor siempre tiene la última palabra al votar.
const POLL_MS = 15_000

export function ParticipantMeetingPage() {
  const { meetingId = '' } = useParams()
  const meeting = useMeeting(meetingId)
  const live = meeting.data?.status === 'in_progress'
  const questions = useQuestions(meetingId, { refetchInterval: live ? POLL_MS : undefined })
  const results = useMeetingResults(meetingId, { refetchInterval: live ? POLL_MS : undefined })
  const questionIds = useMemo(() => (questions.data ?? []).map((q) => q.id), [questions.data])
  const myVotes = useMyVotes(meetingId, questionIds)
  useMeetingRealtime(meetingId)

  if (meeting.isPending) return <ListSkeleton />
  if (meeting.isError)
    return <ErrorState error={meeting.error} onRetry={() => void meeting.refetch()} />

  const m = meeting.data
  const votesByQuestion = new Map((myVotes.data ?? []).map((v) => [v.question_id, v]))
  const resultsByQuestion = new Map((results.data ?? []).map((r) => [r.id, r]))
  const openQuestions = (questions.data ?? []).filter((q) => q.status === 'open')
  const pendingCount = openQuestions.filter((q) => !votesByQuestion.has(q.id)).length

  return (
    <div className="space-y-6">
      <Link
        to="/portal/votaciones"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Votaciones
      </Link>

      <header>
        <MeetingStatusBadge status={m.status} size="md" />
        <h1 className="mt-3 font-display text-[1.85rem] leading-tight font-medium break-words">
          {m.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{formatDateTime(m.meeting_date)}</p>
        {m.description && <p className="mt-3 whitespace-pre-line">{m.description}</p>}
        {live && openQuestions.length > 0 && (
          <p
            className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-accent-foreground"
            role="status"
          >
            {pendingCount > 0
              ? `Tienes ${pluralize(pendingCount, 'votación pendiente', 'votaciones pendientes')}.`
              : 'Has votado en todas las preguntas abiertas.'}
          </p>
        )}
      </header>

      {(m.minutes_content || m.minutes_file_name) && (
        <details className="group rounded-2xl border bg-card p-4">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <FileText aria-hidden className="size-4 text-primary" /> Acta de la reunión
          </summary>
          {m.minutes_content && (
            <div className="mt-3 max-h-96 overflow-y-auto text-sm leading-relaxed whitespace-pre-line">
              {m.minutes_content}
            </div>
          )}
          {m.minutes_file_name && (
            <Button variant="outline" className="mt-3" onClick={() => void downloadMinutesFile(m)}>
              <FileDown aria-hidden /> Descargar PDF
            </Button>
          )}
        </details>
      )}

      <section aria-label="Preguntas" className="space-y-4">
        {questions.isPending ? (
          <ListSkeleton />
        ) : questions.isError ? (
          <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
        ) : questions.data.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="Todavía no hay preguntas abiertas"
            description="Esta pantalla se actualiza sola cuando la administración abra una votación."
          />
        ) : (
          questions.data.map((q) => (
            <VoteCard
              key={q.id}
              meetingId={meetingId}
              question={q}
              myVote={votesByQuestion.get(q.id)}
              result={resultsByQuestion.get(q.id)}
            />
          ))
        )}
      </section>
    </div>
  )
}
