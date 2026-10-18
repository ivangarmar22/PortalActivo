import { CalendarDays, CalendarPlus, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { MeetingStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdmin } from '@/features/auth/useAuth'
import { MeetingFormDialog } from '@/features/meetings/MeetingFormDialog'
import { useCreateMeeting, useMeetings } from '@/features/meetings/queries'
import { formatDateTime } from '@/lib/format'
import type { MeetingStatus } from '@/types/domain'

type Filter = 'all' | MeetingStatus

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'En preparación' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'finished', label: 'Finalizadas' },
]

export function MeetingsListPage() {
  const { activeCommunity } = useAdmin()
  const meetings = useMeetings(activeCommunity.id)
  const createMeeting = useCreateMeeting(activeCommunity.id)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  // «?nueva=1» (enlace desde el panel) abre el formulario una vez y se limpia de la URL.
  const [creating, setCreating] = useState(() => searchParams.get('nueva') === '1')
  useEffect(() => {
    if (searchParams.has('nueva')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (meetings.data ?? []).filter(
      (m) =>
        (filter === 'all' || m.status === filter) &&
        (!term || m.title.toLowerCase().includes(term)),
    )
  }, [meetings.data, filter, query])

  return (
    <>
      <PageHeader
        eyebrow="Gobierno"
        title="Juntas y votaciones"
        description="Crea juntas, prepara su orden del día y controla las votaciones."
        actions={
          <Button onClick={() => setCreating(true)}>
            <CalendarPlus aria-hidden /> Nueva reunión
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-auto w-full flex-wrap justify-start md:w-auto">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative md:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar reuniones por título"
            placeholder="Buscar por título"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {meetings.isPending ? (
        <ListSkeleton />
      ) : meetings.isError ? (
        <ErrorState error={meetings.error} onRetry={() => void meetings.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            meetings.data.length === 0
              ? 'Todavía no hay reuniones'
              : 'Ninguna reunión coincide con el filtro'
          }
          description={
            meetings.data.length === 0
              ? 'Crea la primera para empezar a preparar su orden del día.'
              : undefined
          }
          action={
            meetings.data.length === 0 && (
              <Button onClick={() => setCreating(true)}>
                <CalendarPlus aria-hidden /> Nueva reunión
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Escritorio y tablet horizontal: tabla */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reunión</TableHead>
                  <TableHead className="w-48">Fecha</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Abrir</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => void navigate(`/admin/reuniones/${m.id}`)}
                  >
                    <TableCell className="max-w-0 whitespace-normal">
                      <Link
                        to={`/admin/reuniones/${m.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.title}
                      </Link>
                      {m.description && (
                        <p className="truncate text-sm text-muted-foreground">{m.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-sm">
                      {formatDateTime(m.meeting_date)}
                    </TableCell>
                    <TableCell>
                      <MeetingStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil y tablet vertical: tarjetas */}
          <ul className="space-y-3 md:hidden">
            {visible.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/admin/reuniones/${m.id}`}
                  className="block rounded-xl border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium break-words">{m.title}</p>
                    <MeetingStatusBadge status={m.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(m.meeting_date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <MeetingFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (input) => {
          const meeting = await createMeeting.mutateAsync(input)
          void navigate(`/admin/reuniones/${meeting.id}`)
        }}
      />
    </>
  )
}
