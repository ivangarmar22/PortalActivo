import { BarChart3, Download, FileSpreadsheet, FileText, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { QuestionStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ResultBars } from '@/features/results/ResultBars'
import { useMeetingVotes } from '@/features/results/queries'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { resultsRepository } from '@/repositories/resultsRepository'
import {
  buildResultsCsv,
  buildResultsPdf,
  buildVotesCsv,
  downloadBlob,
  downloadCsv,
  slugify,
} from '@/services/exportService'
import type { Meeting, QuestionResult } from '@/types/domain'

function NominalVotes({ meetingId }: { meetingId: string }) {
  const votes = useMeetingVotes(meetingId, true)
  if (votes.isPending) return <ListSkeleton rows={2} />
  if (votes.isError) return <ErrorState error={votes.error} onRetry={() => void votes.refetch()} />
  if (votes.data.length === 0)
    return <p className="text-sm text-muted-foreground">Todavía no hay votos.</p>

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Nº</TableHead>
            <TableHead>Vivienda</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Opción</TableHead>
            <TableHead className="whitespace-nowrap">Última modificación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {votes.data.map((v) => (
            <TableRow key={`${v.question_id}-${v.dwelling_label}`}>
              <TableCell className="tabular">{v.question_position}</TableCell>
              <TableCell className="whitespace-nowrap">{v.dwelling_label}</TableCell>
              <TableCell className="whitespace-nowrap">{v.full_name}</TableCell>
              <TableCell>{v.option_label}</TableCell>
              <TableCell className="tabular text-sm whitespace-nowrap text-muted-foreground">
                {formatDateTime(v.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ResultsPanel({
  meeting,
  communityName,
  results,
  isPending,
  error,
  onRetry,
}: {
  meeting: Meeting
  communityName: string
  results: QuestionResult[] | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
}) {
  const [showNominal, setShowNominal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const baseName = `resultados-${slugify(meeting.title)}`

  async function exportWith(task: () => void | Promise<void>) {
    setExporting(true)
    try {
      await task()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  if (isPending) return <ListSkeleton />
  if (error || !results) return <ErrorState error={error} onRetry={onRetry} />

  if (results.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin resultados todavía"
        description="Los resultados aparecen en cuanto se abre la primera votación."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {meeting.status === 'finished'
            ? 'Resultados definitivos.'
            : 'Resultados en vivo: se actualizan al llegar nuevos votos. Los propietarios solo ven los de preguntas cerradas.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNominal((v) => !v)}
            aria-expanded={showNominal}
          >
            <Users aria-hidden /> {showNominal ? 'Ocultar detalle' : 'Quién ha votado'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={exporting}>
                <Download aria-hidden /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  void exportWith(async () => {
                    const blob = await buildResultsPdf({ communityName, meeting, results })
                    downloadBlob(`${baseName}.pdf`, blob)
                  })
                }
              >
                <FileText aria-hidden /> Informe de resultados (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void exportWith(() => downloadCsv(`${baseName}.csv`, buildResultsCsv(results)))
                }
              >
                <FileSpreadsheet aria-hidden /> Resultados (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void exportWith(async () => {
                    const votes = await resultsRepository.getMeetingVotes(meeting.id)
                    downloadCsv(
                      `votos-nominales-${slugify(meeting.title)}.csv`,
                      buildVotesCsv(votes),
                    )
                  })
                }
              >
                <Users aria-hidden /> Detalle nominal de votos (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showNominal && (
        <section aria-label="Detalle nominal de votos" className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Datos personales: visibles solo para la administración. No los compartas fuera de la
            comunidad.
          </p>
          <NominalVotes meetingId={meeting.id} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((r) => (
          <Card key={r.id}>
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base leading-snug">
                  {r.position}. {r.title}
                </CardTitle>
                <QuestionStatusBadge status={r.status} />
              </div>
              {r.closedAt && (
                <p className="text-xs text-muted-foreground">
                  Cerrada el {formatDateTime(r.closedAt)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ResultBars result={r} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
