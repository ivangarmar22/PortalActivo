import { Trophy } from 'lucide-react'
import { formatPercent, pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { QuestionResult } from '@/types/domain'

/**
 * Resultados de una pregunta en barras horizontales. El porcentaje es sobre los votos emitidos;
 * sin votos se muestra «Sin votos» en lugar de 0 %.
 */
export function ResultBars({ result }: { result: QuestionResult }) {
  const noVotes = result.totalVotes === 0

  return (
    <div>
      <ul className="space-y-3" aria-label={`Resultados: ${result.title}`}>
        {result.options.map((option) => {
          const width = option.percentage ?? 0
          return (
            <li key={option.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  <span className="break-words">{option.label}</span>
                  {option.isLeading && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                      <Trophy aria-hidden className="size-3" /> Más votada
                    </span>
                  )}
                </span>
                <span className="tabular shrink-0 text-muted-foreground">
                  <span className="font-semibold text-foreground">{option.votes}</span>
                  <span className="mx-1.5" aria-hidden>
                    ·
                  </span>
                  {formatPercent(option.percentage)}
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-r-[4px] bg-muted"
                role="img"
                aria-label={`${option.label}: ${pluralize(option.votes, 'voto', 'votos')}, ${formatPercent(option.percentage)}`}
              >
                <div
                  className={cn(
                    'h-full rounded-r-[4px] transition-[width] duration-500',
                    option.isLeading ? 'bg-chart-1' : 'bg-chart-2',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {noVotes
          ? 'Sin votos todavía.'
          : `Porcentajes sobre ${pluralize(result.totalVotes, 'voto emitido', 'votos emitidos')}.`}{' '}
        Participación: {result.totalVotes} de{' '}
        {pluralize(result.eligibleMembers, 'vivienda', 'viviendas')}
        {result.participation !== null && ` (${formatPercent(result.participation)})`}.
      </p>
    </div>
  )
}
