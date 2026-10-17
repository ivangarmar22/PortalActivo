import { CalendarDays, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader, Section } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { MeetingStatusBadge } from '@/components/shared/StatusBadge'
import { useMember } from '@/features/auth/useAuth'
import { useMeetings } from '@/features/meetings/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Meeting } from '@/types/domain'

function MeetingLink({ meeting }: { meeting: Meeting }) {
  const live = meeting.status === 'in_progress'
  return (
    <Link
      to={`/portal/votaciones/${meeting.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border p-4 shadow-card transition hover:-translate-y-px sm:p-5',
        live ? 'border-primary/25 bg-card ring-1 ring-primary/10' : 'border-border/80 bg-card',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2">
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <p className="font-display text-xl leading-snug font-medium break-words">{meeting.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(meeting.meeting_date)}</p>
      </div>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
      />
    </Link>
  )
}

export function ParticipantHomePage() {
  const { membership } = useMember()
  const meetings = useMeetings(membership.community_id)

  return (
    <>
      <PageHeader
        eyebrow="Gobierno de la comunidad"
        title="Juntas y votaciones"
        description="Vota cada punto mientras la administración mantenga abierta la votación. Puedes cambiar tu voto hasta que se cierre."
      />
      {meetings.isPending ? (
        <ListSkeleton />
      ) : meetings.isError ? (
        <ErrorState error={meetings.error} onRetry={() => void meetings.refetch()} />
      ) : (
        <div className="space-y-10">
          <Section title="En curso" id="en-curso">
            {meetings.data.filter((m) => m.status === 'in_progress').length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No hay ninguna junta en curso"
                description="Cuando la administración inicie una junta aparecerá aquí."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-3">
                {meetings.data
                  .filter((m) => m.status === 'in_progress')
                  .map((m) => (
                    <li key={m.id}>
                      <MeetingLink meeting={m} />
                    </li>
                  ))}
              </ul>
            )}
          </Section>
          {meetings.data.some((m) => m.status === 'finished') && (
            <Section title="Finalizadas" id="finalizadas">
              <ul className="grid grid-cols-1 gap-3">
                {meetings.data
                  .filter((m) => m.status === 'finished')
                  .map((m) => (
                    <li key={m.id}>
                      <MeetingLink meeting={m} />
                    </li>
                  ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </>
  )
}
