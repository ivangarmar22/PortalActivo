import { AlertTriangle, Inbox, RotateCcw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brass-soft ring-1 ring-brass/20">
        <Icon aria-hidden className="size-5 text-brass-ink" />
      </div>
      <p className="font-display text-lg font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-destructive/25 bg-status-danger-bg/60 px-6 py-10 text-center"
    >
      <AlertTriangle aria-hidden className="mb-3 size-6 text-destructive" />
      <p className="font-medium">No se han podido cargar los datos</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCcw aria-hidden /> Reintentar
        </Button>
      )}
    </div>
  )
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  )
}
