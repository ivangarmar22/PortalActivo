import { ChevronRight, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { IncidentStatusBadge } from '@/components/shared/StatusBadge'
import { CategoryIcon } from '@/features/incidents/IncidentVisuals'
import { formatRelative } from '@/lib/format'
import { incidentResponsibleLabel } from '@/lib/status'
import type { Incident } from '@/types/domain'

export function IncidentCard({ incident, to }: { incident: Incident; to: string }) {
  return (
    <Link
      to={to}
      className="group flex gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-card transition hover:-translate-y-px hover:border-primary/30"
    >
      <CategoryIcon category={incident.category} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <p className="font-medium break-words">{incident.title}</p>
          <IncidentStatusBadge status={incident.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {incident.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5" />
              {incident.location}
            </span>
          )}
          <span>
            {incident.reported_dwelling
              ? `Vivienda ${incident.reported_dwelling}`
              : 'Administración'}{' '}
            · {formatRelative(incident.created_at)}
          </span>
        </p>
        {incident.responsible_type && (
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-sunken px-2 py-1 text-xs">
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">
              {incidentResponsibleLabel[incident.responsible_type]}:
            </span>
            <span className="min-w-0 truncate font-medium">{incident.responsible_name ?? '—'}</span>
          </p>
        )}
      </div>
      <ChevronRight
        aria-hidden
        className="mt-2.5 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
      />
    </Link>
  )
}
