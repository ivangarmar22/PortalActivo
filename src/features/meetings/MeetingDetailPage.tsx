import { ArrowLeft, Flag, Pencil, Play, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, ListSkeleton } from '@/components/shared/States'
import { MeetingStatusBadge } from '@/components/shared/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdmin } from '@/features/auth/useAuth'
import { MeetingFormDialog } from '@/features/meetings/MeetingFormDialog'
import { MinutesPanel } from '@/features/meetings/MinutesPanel'
import {
  useDeleteMeeting,
  useFinishMeeting,
  useMeeting,
  useStartMeeting,
  useUpdateMeeting,
} from '@/features/meetings/queries'
import { QuestionsPanel } from '@/features/questions/QuestionsPanel'
import { useQuestions } from '@/features/questions/queries'
import { useMeetingResults } from '@/features/results/queries'
import { ResultsPanel } from '@/features/results/ResultsPanel'
import { useMeetingRealtime } from '@/hooks/useMeetingRealtime'
import { formatDateTime, pluralize } from '@/lib/format'

const POLL_MS = 15_000

export function MeetingDetailPage() {
  const { meetingId = '' } = useParams()
  const { activeCommunity } = useAdmin()
  const navigate = useNavigate()
  const meeting = useMeeting(meetingId)
  const live = meeting.data?.status === 'in_progress'
  const questions = useQuestions(meetingId, { refetchInterval: live ? POLL_MS : undefined })
  const results = useMeetingResults(meetingId, { refetchInterval: live ? POLL_MS : undefined })
  const questionIds = useMemo(() => (questions.data ?? []).map((q) => q.id), [questions.data])
  useMeetingRealtime(meetingId, live ? questionIds : [])

  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'start' | 'finish' | 'delete' | null>(null)
  const updateMeeting = useUpdateMeeting(meetingId)
  const startMeeting = useStartMeeting(meetingId)
  const finishMeeting = useFinishMeeting(meetingId)
  const deleteMeeting = useDeleteMeeting()

  if (meeting.isPending) return <ListSkeleton rows={4} />
  if (meeting.isError)
    return <ErrorState error={meeting.error} onRetry={() => void meeting.refetch()} />

  const m = meeting.data
  const openCount = (questions.data ?? []).filter((q) => q.status === 'open').length

  return (
    <>
      <Link
        to="/admin/reuniones"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Juntas y votaciones
      </Link>

      <PageHeader
        eyebrow="Junta de propietarios"
        title={m.title}
        description={
          <>
            <span className="flex flex-wrap items-center gap-3">
              <MeetingStatusBadge status={m.status} size="md" />
              <span className="tabular">{formatDateTime(m.meeting_date)}</span>
            </span>
            {m.description && (
              <span className="mt-1 block whitespace-pre-line">{m.description}</span>
            )}
          </>
        }
        actions={
          <>
            {m.status !== 'finished' && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Editar
              </Button>
            )}
            {m.status === 'draft' && (
              <>
                <Button variant="ghost" onClick={() => setConfirm('delete')}>
                  <Trash2 aria-hidden /> Eliminar
                </Button>
                <Button onClick={() => setConfirm('start')}>
                  <Play aria-hidden /> Iniciar reunión
                </Button>
              </>
            )}
            {m.status === 'in_progress' && (
              <Button onClick={() => setConfirm('finish')}>
                <Flag aria-hidden /> Finalizar reunión
              </Button>
            )}
          </>
        }
      />

      {m.status === 'finished' && (
        <Alert className="mb-4">
          <AlertDescription>
            Reunión finalizada el {formatDateTime(m.finished_at)}. Es de solo lectura.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="questions">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">Preguntas</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="minutes">Acta</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          {questions.isPending ? (
            <ListSkeleton />
          ) : questions.isError ? (
            <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
          ) : (
            <QuestionsPanel meeting={m} questions={questions.data} results={results.data ?? []} />
          )}
        </TabsContent>
        <TabsContent value="results">
          <ResultsPanel
            meeting={m}
            communityName={activeCommunity.name}
            results={results.data}
            isPending={results.isPending}
            error={results.error}
            onRetry={() => void results.refetch()}
          />
        </TabsContent>
        <TabsContent value="minutes">
          <MinutesPanel meeting={m} />
        </TabsContent>
      </Tabs>

      <MeetingFormDialog
        open={editing}
        onOpenChange={setEditing}
        meeting={m}
        onSubmit={(input) => updateMeeting.mutateAsync(input)}
      />
      <ConfirmDialog
        open={confirm === 'start'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Iniciar la reunión?"
        description={
          <>
            <p>Los propietarios podrán ver la reunión, sus preguntas abiertas y el acta.</p>
            <p>
              Ninguna pregunta se abre automáticamente: tendrás que abrirlas una a una o con «Abrir
              elegibles».
            </p>
          </>
        }
        confirmLabel="Iniciar reunión"
        onConfirm={() => startMeeting.mutateAsync()}
      />
      <ConfirmDialog
        open={confirm === 'finish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Finalizar la reunión?"
        description={
          <>
            {openCount > 0 ? (
              <p>
                {openCount === 1 ? 'Se cerrará' : 'Se cerrarán'}{' '}
                {pluralize(openCount, 'pregunta abierta', 'preguntas abiertas')} y no se admitirán
                más votos.
              </p>
            ) : (
              <p>No hay preguntas abiertas.</p>
            )}
            <p>La reunión quedará en solo lectura (incluida el acta) y no se podrá reabrir.</p>
          </>
        }
        confirmLabel="Finalizar reunión"
        onConfirm={() => finishMeeting.mutateAsync()}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Eliminar la reunión?"
        description={<p>Se eliminarán la reunión «{m.title}» y todas sus preguntas en borrador.</p>}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          await deleteMeeting.mutateAsync(m)
          void navigate('/admin/reuniones', { replace: true })
        }}
      />
    </>
  )
}
