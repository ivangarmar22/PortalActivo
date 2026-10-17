import { FileDown, FileText, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/services/fileService'
import { useDocuments } from '@/features/finance/queries'
import { formatDate, formatEuros } from '@/lib/format'
import { documentKindLabel } from '@/lib/status'
import type { CommunityDocument } from '@/types/domain'

export function DocumentsList({
  communityId,
  onDelete,
}: {
  communityId: string
  onDelete?: (document: CommunityDocument) => void
}) {
  const documents = useDocuments(communityId)
  if (documents.isPending) return <ListSkeleton />
  if (documents.isError)
    return <ErrorState error={documents.error} onRetry={() => void documents.refetch()} />
  if (documents.data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aún no hay documentos"
        description="Facturas, presupuestos y cuentas aparecerán aquí."
      />
    )
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
      {documents.data.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brass-soft text-brass-ink">
            <FileText aria-hidden className="size-[1.15rem]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{d.title}</p>
            <p className="text-sm text-muted-foreground">
              {documentKindLabel[d.kind]}
              {d.supplier && ` · ${d.supplier}`} · {formatDate(d.document_date)}
            </p>
          </div>
          {d.amount_cents !== null && (
            <span className="tabular shrink-0 font-display text-lg">
              {formatEuros(d.amount_cents)}
            </span>
          )}
          <div className="flex shrink-0 gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void downloadFile(d.file_path, d.file_name)}
            >
              <FileDown aria-hidden /> Descargar
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Eliminar ${d.title}`}
                onClick={() => onDelete(d)}
              >
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
