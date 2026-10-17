import { CalendarClock, MapPin, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { IncidentStatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryIcon, IncidentProgress } from '@/features/incidents/IncidentVisuals'
import { useIncidentPhoto } from '@/features/incidents/queries'
import { formatDate, formatDateTime } from '@/lib/format'
import { incidentCategoryLabel, incidentResponsibleLabel, incidentStatusLabel } from '@/lib/status'
import type { IncidentWithUpdates } from '@/types/domain'

function Photo({ path, title }: { path: string; title: string }) {
  const photo = useIncidentPhoto(path)
  if (photo.isPending) return <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
  if (!photo.data) return null
  return (
    <a
      href={photo.data}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-2xl ring-1 ring-border"
    >
      <img
        src={photo.data}
        alt={`Foto de la incidencia: ${title}`}
        className="aspect-[4/3] w-full object-cover"
      />
    </a>
  )
}

/** Detalle de una incidencia (vecinos y administración). `aside` permite añadir el panel de gestión. */
export function IncidentDetailView({
  incident,
  aside,
}: {
  incident: IncidentWithUpdates
  aside?: ReactNode
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-start gap-3">
            <CategoryIcon category={incident.category} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{incidentCategoryLabel[incident.category]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <IncidentStatusBadge status={incident.status} size="md" />
              </div>
            </div>
          </div>
          {incident.description && (
            <p className="mt-5 leading-relaxed whitespace-pre-line">{incident.description}</p>
          )}
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {incident.location && (
              <div className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Ubicación</dt>
                  <dd className="font-medium">{incident.location}</dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <UserRound aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Comunicada por</dt>
                <dd className="font-medium">
                  {incident.reported_dwelling
                    ? `Vivienda ${incident.reported_dwelling}`
                    : 'Administración'}{' '}
                  · {formatDateTime(incident.created_at)}
                </dd>
              </div>
            </div>
          </dl>
          <div className="mt-6">
            <IncidentProgress status={incident.status} />
          </div>
        </section>

        {incident.photo_path && <Photo path={incident.photo_path} title={incident.title} />}

        <section
          aria-labelledby="historial"
          className="rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6"
        >
          <h2 id="historial" className="font-display text-xl font-medium">
            Historial
          </h2>
          <ol className="relative mt-5 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-border">
            {[...incident.incident_updates].reverse().map((update, index) => (
              <li key={update.id} className="relative pl-7">
                <span
                  aria-hidden
                  className={`absolute top-1.5 left-0 size-[15px] rounded-full border-[3px] border-card ${index === 0 ? 'bg-brass ring-2 ring-brass/30' : 'bg-input'}`}
                />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{update.author_label}</span> ·{' '}
                  {formatDateTime(update.created_at)}
                </p>
                {(update.status || update.responsible_type) && (
                  <p className="mt-1 flex flex-wrap gap-2 text-sm">
                    {update.status && (
                      <span>
                        Estado:{' '}
                        <strong className="font-semibold">
                          {incidentStatusLabel[update.status]}
                        </strong>
                      </span>
                    )}
                    {update.responsible_type && (
                      <span>
                        Responsable:{' '}
                        <strong className="font-semibold">
                          {update.responsible_name ??
                            incidentResponsibleLabel[update.responsible_type]}
                        </strong>
                        {/* El tipo solo se añade si el nombre no lo dice ya («Promotora (garantía…)»). */}
                        {update.responsible_name &&
                          !update.responsible_name
                            .toLowerCase()
                            .includes(
                              incidentResponsibleLabel[update.responsible_type].toLowerCase(),
                            ) && (
                            <span className="text-muted-foreground">
                              {' '}
                              ({incidentResponsibleLabel[update.responsible_type]})
                            </span>
                          )}
                      </span>
                    )}
                  </p>
                )}
                {update.message && <p className="mt-1 text-sm leading-relaxed">{update.message}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="ink-panel rounded-2xl p-5 shadow-raised">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-brass-bright uppercase">
            ¿Quién se encarga?
          </p>
          {incident.responsible_type ? (
            <>
              <p className="mt-2 font-display text-xl leading-tight">
                {incident.responsible_name ?? incidentResponsibleLabel[incident.responsible_type]}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {incidentResponsibleLabel[incident.responsible_type]}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              Pendiente de asignar por la administración.
            </p>
          )}
          {incident.estimated_resolution && incident.status !== 'resolved' && (
            <p className="mt-4 flex items-center gap-2 border-t border-ink-border pt-4 text-sm">
              <CalendarClock aria-hidden className="size-4 text-brass-bright" />
              Previsión: {formatDate(incident.estimated_resolution)}
            </p>
          )}
          {incident.resolved_at && (
            <p className="mt-4 border-t border-ink-border pt-4 text-sm">
              Resuelta el {formatDateTime(incident.resolved_at)}
            </p>
          )}
        </div>
        {aside}
      </aside>
    </div>
  )
}
