import {
  ArrowDown,
  ArrowUp,
  CirclePlay,
  ListPlus,
  Lock,
  LockOpen,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/States'
import { QuestionStatusBadge } from '@/components/shared/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { QuestionEditorDialog } from '@/features/questions/QuestionEditorDialog'
import {
  useCloseOpen,
  useCloseQuestion,
  useDeleteQuestion,
  useOpenEligible,
  useOpenQuestion,
  useReopenQuestion,
  useReorderQuestions,
  useSaveQuestion,
} from '@/features/questions/queries'
import { formatDateTime, formatPercent, pluralize } from '@/lib/format'
import type { Meeting, QuestionResult, QuestionWithOptions } from '@/types/domain'

type PendingAction =
  | { kind: 'close' | 'reopen' | 'delete'; question: QuestionWithOptions }
  | { kind: 'openAll' | 'closeAll' }

function isEligible(q: QuestionWithOptions) {
  return q.status === 'draft' && q.answer_options.length >= 2
}

export function QuestionsPanel({
  meeting,
  questions,
  results,
}: {
  meeting: Meeting
  questions: QuestionWithOptions[]
  results: QuestionResult[]
}) {
  const [editing, setEditing] = useState<QuestionWithOptions | 'new' | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const saveQuestion = useSaveQuestion(meeting.id)
  const deleteQuestion = useDeleteQuestion(meeting.id)
  const reorder = useReorderQuestions(meeting.id)
  const openQuestion = useOpenQuestion(meeting.id)
  const closeQuestion = useCloseQuestion(meeting.id)
  const reopenQuestion = useReopenQuestion(meeting.id)
  const openEligible = useOpenEligible(meeting.id)
  const closeOpen = useCloseOpen(meeting.id)

  const readOnly = meeting.status === 'finished'
  const live = meeting.status === 'in_progress'
  const eligible = questions.filter(isEligible)
  const openQuestions = questions.filter((q) => q.status === 'open')
  const resultsById = new Map(results.map((r) => [r.id, r]))

  function move(index: number, delta: -1 | 1) {
    const ids = questions.map((q) => q.id)
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(index + delta, 0, moved)
    reorder.mutate(ids)
  }

  return (
    <div className="space-y-4">
      {meeting.status === 'draft' && (
        <Alert>
          <AlertDescription>
            Prepara aquí los puntos del orden del día. Para abrir votaciones, primero inicia la
            reunión. Iniciarla no abre ninguna pregunta automáticamente.
          </AlertDescription>
        </Alert>
      )}

      {live && (
        <section
          aria-label="Control global de votaciones"
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="text-sm">
            <p className="font-medium">Control global</p>
            <p className="text-muted-foreground">
              {pluralize(openQuestions.length, 'abierta', 'abiertas')} ·{' '}
              {pluralize(
                eligible.length,
                'en borrador lista para abrir',
                'en borrador listas para abrir',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={eligible.length === 0}
              onClick={() => setPending({ kind: 'openAll' })}
            >
              <LockOpen aria-hidden /> Abrir elegibles ({eligible.length})
            </Button>
            <Button
              variant="outline"
              disabled={openQuestions.length === 0}
              onClick={() => setPending({ kind: 'closeAll' })}
            >
              <Lock aria-hidden /> Cerrar abiertas ({openQuestions.length})
            </Button>
          </div>
        </section>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="El orden del día está vacío"
          description={readOnly ? undefined : 'Añade los puntos que se van a votar.'}
          action={
            !readOnly && (
              <Button onClick={() => setEditing('new')}>
                <ListPlus aria-hidden /> Añadir punto
              </Button>
            )
          }
        />
      ) : (
        <ol className="space-y-3">
          {questions.map((q, index) => {
            const result = resultsById.get(q.id)
            return (
              <li key={q.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {q.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium break-words">{q.title}</h3>
                      <QuestionStatusBadge status={q.status} />
                    </div>
                    {q.description && (
                      <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                        {q.description}
                      </p>
                    )}
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Opciones">
                      {q.answer_options.map((o) => (
                        <li
                          key={o.id}
                          className="rounded-md border bg-background px-2 py-0.5 text-xs"
                        >
                          {o.label}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {q.opened_at && <>Abierta: {formatDateTime(q.opened_at)}</>}
                      {q.closed_at && <> · Cerrada: {formatDateTime(q.closed_at)}</>}
                      {q.reopen_count > 0 && (
                        <> · Reabierta {pluralize(q.reopen_count, 'vez', 'veces')}</>
                      )}
                      {result && (
                        <>
                          {' '}
                          ·{' '}
                          <span className="font-medium text-foreground">
                            {pluralize(result.totalVotes, 'voto', 'votos')}
                          </span>{' '}
                          ({formatPercent(result.participation)} de participación)
                        </>
                      )}
                      {q.status === 'draft' &&
                        q.answer_options.length < 2 &&
                        ' Necesita al menos dos opciones.'}
                    </p>
                  </div>
                </div>

                {!readOnly && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    {q.status === 'draft' && live && (
                      <Button
                        size="sm"
                        disabled={!isEligible(q) || openQuestion.isPending}
                        onClick={() => openQuestion.mutate(q.id)}
                      >
                        <CirclePlay aria-hidden /> Abrir votación
                      </Button>
                    )}
                    {q.status === 'open' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPending({ kind: 'close', question: q })}
                      >
                        <Square aria-hidden /> Cerrar votación
                      </Button>
                    )}
                    {q.status === 'closed' && live && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPending({ kind: 'reopen', question: q })}
                      >
                        <RotateCcw aria-hidden /> Reabrir
                      </Button>
                    )}
                    {q.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditing(q)}>
                          <Pencil aria-hidden /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPending({ kind: 'delete', question: q })}
                        >
                          <Trash2 aria-hidden /> Eliminar
                        </Button>
                      </>
                    )}
                    <div className="ml-auto flex">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Subir la pregunta ${q.position}`}
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Bajar la pregunta ${q.position}`}
                        disabled={index === questions.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {!readOnly && questions.length > 0 && (
        <Button variant="outline" onClick={() => setEditing('new')}>
          <ListPlus aria-hidden /> Añadir pregunta
        </Button>
      )}

      <QuestionEditorDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        question={editing === 'new' || editing === null ? undefined : editing}
        onSubmit={(input) =>
          saveQuestion.mutateAsync({
            input,
            questionId: editing === 'new' || editing === null ? undefined : editing.id,
          })
        }
      />

      <ConfirmDialog
        open={pending?.kind === 'close'}
        onOpenChange={(open) => !open && setPending(null)}
        title="¿Cerrar la votación?"
        description={
          <>
            <p>
              «{pending && 'question' in pending ? pending.question.title : ''}» dejará de admitir
              votos y cambios de voto de inmediato, también en las pantallas que ya estén abiertas.
            </p>
            <p>Podrás reabrirla mientras la reunión siga en curso.</p>
          </>
        }
        confirmLabel="Cerrar votación"
        onConfirm={() =>
          closeQuestion.mutateAsync(pending && 'question' in pending ? pending.question.id : '')
        }
      />
      <ConfirmDialog
        open={pending?.kind === 'reopen'}
        onOpenChange={(open) => !open && setPending(null)}
        title="¿Reabrir la votación?"
        description={
          <>
            <p>Se conservan los votos ya emitidos.</p>
            <p>Todas las viviendas podrán votar o cambiar su voto hasta que vuelvas a cerrarla.</p>
          </>
        }
        confirmLabel="Reabrir"
        onConfirm={() =>
          reopenQuestion.mutateAsync(pending && 'question' in pending ? pending.question.id : '')
        }
      />
      <ConfirmDialog
        open={pending?.kind === 'delete'}
        onOpenChange={(open) => !open && setPending(null)}
        title="¿Eliminar la pregunta?"
        description={
          <p>
            Se eliminará «{pending && 'question' in pending ? pending.question.title : ''}» con sus
            opciones.
          </p>
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          deleteQuestion.mutateAsync(pending && 'question' in pending ? pending.question.id : '')
        }
      />
      <ConfirmDialog
        open={pending?.kind === 'openAll'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`¿Abrir ${pluralize(eligible.length, 'pregunta', 'preguntas')}?`}
        description={
          <>
            <p>Se abrirán las preguntas en borrador con al menos dos opciones:</p>
            <ul className="list-disc pl-5">
              {eligible.map((q) => (
                <li key={q.id}>
                  {q.position}. {q.title}
                </li>
              ))}
            </ul>
            <p>Las preguntas cerradas no se reabren.</p>
          </>
        }
        confirmLabel="Abrir preguntas"
        onConfirm={() => openEligible.mutateAsync()}
      />
      <ConfirmDialog
        open={pending?.kind === 'closeAll'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`¿Cerrar ${pluralize(openQuestions.length, 'pregunta abierta', 'preguntas abiertas')}?`}
        description={
          <>
            <ul className="list-disc pl-5">
              {openQuestions.map((q) => (
                <li key={q.id}>
                  {q.position}. {q.title}
                </li>
              ))}
            </ul>
            <p>Dejarán de admitir votos y cambios de inmediato.</p>
          </>
        }
        confirmLabel="Cerrar preguntas"
        onConfirm={() => closeOpen.mutateAsync()}
      />
    </div>
  )
}
