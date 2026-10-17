import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { QuestionStatusBadge } from '@/components/shared/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCastVote } from '@/features/participant/queries'
import { ResultBars } from '@/features/results/ResultBars'
import { toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MyVote } from '@/repositories/votesRepository'
import type { QuestionResult, QuestionWithOptions } from '@/types/domain'

export function VoteCard({
  meetingId,
  question,
  myVote,
  result,
}: {
  meetingId: string
  question: QuestionWithOptions
  myVote: MyVote | undefined
  result: QuestionResult | undefined
}) {
  const headingId = useId()
  const castVote = useCastVote(meetingId)
  // Selección local; si no hay, se muestra el voto guardado en el servidor.
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const isOpen = question.status === 'open'
  const votedOption = question.answer_options.find((o) => o.id === myVote?.option_id)
  const selectedOption = question.answer_options.find(
    (o) => o.id === (selected ?? myVote?.option_id),
  )
  const currentSelection = selected ?? myVote?.option_id
  const unchanged = currentSelection === myVote?.option_id

  async function submitVote() {
    if (!currentSelection) return
    setFeedback(null)
    try {
      const { changed } = await castVote.mutateAsync({
        questionId: question.id,
        optionId: currentSelection,
      })
      setFeedback({
        kind: 'success',
        text: changed
          ? 'Tu voto se ha modificado correctamente.'
          : 'Tu voto se ha registrado correctamente.',
      })
    } catch (error) {
      // Se cierra el diálogo y el error se muestra en la tarjeta (p. ej. la votación se acaba de cerrar).
      setSelected(undefined)
      setFeedback({ kind: 'error', text: toAppError(error).message })
    }
  }

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="font-display text-xl leading-snug font-medium break-words">
          <span className="text-muted-foreground">{question.position}.</span> {question.title}
        </h2>
        <QuestionStatusBadge status={question.status} size="md" />
      </div>
      {question.description && (
        <p className="mt-2 whitespace-pre-line text-muted-foreground">{question.description}</p>
      )}

      {votedOption && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-status-open-bg px-3 py-2 text-sm text-status-open">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          <span>
            Tu voto: <strong className="font-semibold">{votedOption.label}</strong>
            {myVote && (
              <span className="text-status-open/80"> · {formatDateTime(myVote.updated_at)}</span>
            )}
          </span>
        </p>
      )}

      {isOpen ? (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (currentSelection && !unchanged) setConfirming(true)
          }}
        >
          <RadioGroup
            aria-labelledby={headingId}
            value={currentSelection ?? ''}
            onValueChange={(value) => {
              setSelected(value)
              setFeedback(null)
            }}
            className="gap-2"
          >
            {question.answer_options.map((option) => {
              const id = `${question.id}-${option.id}`
              const checked = currentSelection === option.id
              return (
                <label
                  key={option.id}
                  htmlFor={id}
                  className={cn(
                    'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-base transition',
                    checked
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <RadioGroupItem id={id} value={option.id} className="size-5" />
                  <span className="font-medium break-words">{option.label}</span>
                </label>
              )
            })}
          </RadioGroup>

          {votedOption && (
            <p className="mt-3 text-sm text-muted-foreground">
              Puedes cambiar tu voto mientras la votación siga abierta.
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-4 h-12 w-full text-base"
            disabled={!currentSelection || unchanged || castVote.isPending}
          >
            {castVote.isPending && <Loader2 aria-hidden className="animate-spin" />}
            {!currentSelection ? 'Elige una opción' : votedOption ? 'Cambiar mi voto' : 'Votar'}
          </Button>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" />
            Votación cerrada{question.closed_at && ` el ${formatDateTime(question.closed_at)}`}.
            {!votedOption && ' No consta voto de tu vivienda.'}
          </p>
          {result && <ResultBars result={result} />}
        </div>
      )}

      <div aria-live="polite" className="empty:hidden mt-3">
        {feedback && (
          <Alert variant={feedback.kind === 'error' ? 'destructive' : 'default'}>
            {feedback.kind === 'success' && (
              <CheckCircle2 aria-hidden className="text-status-open" />
            )}
            <AlertDescription>{feedback.text}</AlertDescription>
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={votedOption ? '¿Cambiar tu voto?' : '¿Confirmas tu voto?'}
        description={
          <>
            <p className="text-foreground">{question.title}</p>
            <p>
              Opción elegida: <strong className="text-foreground">{selectedOption?.label}</strong>
            </p>
          </>
        }
        confirmLabel={votedOption ? 'Cambiar voto' : 'Confirmar voto'}
        onConfirm={submitVote}
      />
    </article>
  )
}
