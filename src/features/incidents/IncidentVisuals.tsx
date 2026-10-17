import {
  ArrowUpDown,
  Building2,
  Droplets,
  HardHat,
  Leaf,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { incidentStatusLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { IncidentCategory, IncidentStatus } from '@/types/domain'

const categoryIcon: Record<IncidentCategory, LucideIcon> = {
  electricity: Lightbulb,
  plumbing: Droplets,
  elevator: ArrowUpDown,
  cleaning: Sparkles,
  gardening: Leaf,
  security: ShieldCheck,
  structure: Building2,
  other: Wrench,
}

export function CategoryIcon({
  category,
  className,
}: {
  category: IncidentCategory
  className?: string
}) {
  const Icon = categoryIcon[category] ?? HardHat
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-foreground/80 ring-1 ring-border',
        className,
      )}
    >
      <Icon aria-hidden className="size-[1.15rem]" />
    </span>
  )
}

const steps: IncidentStatus[] = ['reported', 'in_review', 'in_progress', 'resolved']

/** Progreso de la incidencia: recibida → en revisión → en proceso → resuelta. */
export function IncidentProgress({ status }: { status: IncidentStatus }) {
  if (status === 'dismissed') {
    return (
      <p className="rounded-xl bg-status-closed-bg px-4 py-3 text-sm text-status-closed">
        La administración ha descartado esta incidencia. Consulta el historial para ver el motivo.
      </p>
    )
  }
  const current = steps.indexOf(status)
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Progreso de la incidencia">
      {steps.map((step, index) => {
        const done = index <= current
        return (
          <li key={step} className="min-w-0" aria-current={index === current ? 'step' : undefined}>
            <span
              aria-hidden
              className={cn(
                'block h-1.5 rounded-full',
                done ? (status === 'resolved' ? 'bg-status-open' : 'bg-primary') : 'bg-border',
              )}
            />
            <span
              className={cn(
                'mt-2 block truncate text-xs',
                index === current
                  ? 'font-semibold text-foreground'
                  : done
                    ? 'text-foreground/70'
                    : 'text-muted-foreground',
              )}
            >
              {incidentStatusLabel[step]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
