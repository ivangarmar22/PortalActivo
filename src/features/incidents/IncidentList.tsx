import { Search, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Input } from '@/components/ui/input'
import { IncidentCard } from '@/features/incidents/IncidentCard'
import { useIncidents } from '@/features/incidents/queries'
import { cn } from '@/lib/utils'
import type { Incident } from '@/types/domain'

type Filter = 'active' | 'resolved' | 'all'

const filters: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'resolved', label: 'Cerradas' },
  { value: 'all', label: 'Todas' },
]

const isActive = (i: Incident) => ['reported', 'in_review', 'in_progress'].includes(i.status)

/** Listado en tiempo real con filtros por estado y búsqueda. */
export function IncidentList({ communityId, basePath }: { communityId: string; basePath: string }) {
  const incidents = useIncidents(communityId)
  const [filter, setFilter] = useState<Filter>('active')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const all = incidents.data ?? []
    return {
      active: all.filter(isActive).length,
      resolved: all.filter((i) => !isActive(i)).length,
      all: all.length,
    }
  }, [incidents.data])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (incidents.data ?? []).filter(
      (i) =>
        (filter === 'all' || (filter === 'active' ? isActive(i) : !isActive(i))) &&
        (!term ||
          `${i.title} ${i.location ?? ''} ${i.reported_dwelling ?? ''}`
            .toLowerCase()
            .includes(term)),
    )
  }, [incidents.data, filter, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="inline-flex w-fit rounded-xl bg-sunken p-1"
        >
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition pointer-coarse:min-h-10',
                filter === f.value
                  ? 'bg-card shadow-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label} <span className="tabular text-muted-foreground">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar incidencias"
            placeholder="Buscar por título, zona o vivienda"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {incidents.isPending ? (
        <ListSkeleton />
      ) : incidents.isError ? (
        <ErrorState error={incidents.error} onRetry={() => void incidents.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            filter === 'active' ? 'No hay incidencias activas' : 'No hay incidencias que mostrar'
          }
          description={filter === 'active' ? 'Todo en orden en la comunidad.' : undefined}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {visible.map((incident) => (
            <li key={incident.id}>
              <IncidentCard incident={incident} to={`${basePath}/${incident.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
