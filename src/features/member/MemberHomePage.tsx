import {
  ArrowRight,
  CalendarCheck2,
  Megaphone,
  ReceiptText,
  Vote,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Section } from '@/components/shared/PageHeader'
import { IncidentStatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMember } from '@/features/auth/useAuth'
import { useMyReceipts } from '@/features/finance/queries'
import { isOverdue } from '@/features/finance/receipts'
import { useIncidents } from '@/features/incidents/queries'
import { useMeetings } from '@/features/meetings/queries'
import { useNotices } from '@/features/notices/queries'
import { useMyReservations } from '@/features/reservations/queries'
import { formatDay, formatEuros, formatLongDay, formatRelative, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Madrid',
    }).format(now),
  )
  if (hour < 6 || hour >= 21) return 'Buenas noches'
  if (hour < 13) return 'Buenos días'
  return 'Buenas tardes'
}

function Tile({
  to,
  icon: Icon,
  label,
  value,
  detail,
  emphasis = false,
  loading = false,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: ReactNode
  detail?: ReactNode
  emphasis?: boolean
  loading?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-2xl border p-4 shadow-card transition hover:-translate-y-px',
        emphasis
          ? 'border-brass/40 bg-brass-soft/70'
          : 'border-border/80 bg-card hover:border-primary/30',
      )}
    >
      <span className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-xl bg-ink text-brass-bright">
          <Icon aria-hidden className="size-4" />
        </span>
        <ArrowRight
          aria-hidden
          className="size-4 text-muted-foreground transition group-hover:translate-x-0.5"
        />
      </span>
      <span className="mt-4 text-sm text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-16" />
      ) : (
        <span className="font-display text-[1.75rem] leading-tight font-medium">{value}</span>
      )}
      {detail && (
        <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{detail}</span>
      )}
    </Link>
  )
}

export function MemberHomePage() {
  const { membership } = useMember()
  const communityId = membership.community_id
  const meetings = useMeetings(communityId)
  const incidents = useIncidents(communityId)
  const notices = useNotices(communityId)
  const reservations = useMyReservations(communityId)
  const receipts = useMyReceipts()

  const liveMeetings = (meetings.data ?? []).filter((m) => m.status === 'in_progress')
  const activeIncidents = (incidents.data ?? []).filter((i) =>
    ['reported', 'in_review', 'in_progress'].includes(i.status),
  )
  const unreadNotices = (notices.data ?? []).filter(
    (n) => !n.notice_reads.some((r) => r.member_id === membership.member_id),
  )
  const urgent = (notices.data ?? []).filter((n) => n.is_urgent)
  const next = reservations.data?.[0]
  const pendingReceipts = (receipts.data ?? []).filter((r) => r.status !== 'paid')
  const pendingCents = pendingReceipts.reduce((sum, r) => sum + r.amount_cents, 0)
  const overdue = (receipts.data ?? []).some((r) => isOverdue(r))
  const firstName = membership.full_name.split(' ')[0]

  return (
    <div className="space-y-10">
      <section className="ink-panel relative overflow-hidden rounded-3xl p-6 shadow-raised sm:p-8">
        <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brass-bright uppercase">
          {formatLongDay(new Date().toISOString())}
        </p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight font-medium sm:text-[2.5rem]">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Esto es lo que pasa hoy en {membership.community_name}.
        </p>
        {urgent.length > 0 && (
          <Link
            to="/portal/avisos"
            className="mt-6 flex items-start gap-3 rounded-2xl bg-ink-foreground/95 p-4 text-ink transition hover:bg-ink-foreground"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-status-danger-bg text-status-danger">
              <Megaphone aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold tracking-wide text-status-danger uppercase">
                Aviso urgente
              </span>
              <span className="block font-medium">{urgent[0]?.title}</span>
            </span>
          </Link>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          to="/portal/votaciones"
          icon={Vote}
          label="Votaciones"
          value={liveMeetings.length > 0 ? 'Abiertas' : 'Ninguna'}
          detail={liveMeetings[0]?.title ?? 'Sin juntas en curso'}
          emphasis={liveMeetings.length > 0}
          loading={meetings.isPending}
        />
        <Tile
          to="/portal/incidencias"
          icon={Wrench}
          label="Incidencias activas"
          value={activeIncidents.length}
          detail={activeIncidents[0]?.title ?? 'Todo en orden'}
          loading={incidents.isPending}
        />
        <Tile
          to="/portal/reservas"
          icon={CalendarCheck2}
          label="Tu próxima reserva"
          value={next ? formatDay(next.starts_at) : '—'}
          detail={
            next
              ? `${next.common_spaces?.name} · ${formatTime(next.starts_at)}`
              : 'Reserva la barbacoa o el pádel'
          }
          loading={reservations.isPending}
        />
        <Tile
          to="/portal/recibos"
          icon={ReceiptText}
          label="Pendiente de pago"
          value={formatEuros(pendingCents)}
          detail={
            overdue
              ? 'Tienes recibos vencidos'
              : pendingReceipts.length === 0
                ? 'Estás al día'
                : `${pendingReceipts.length} recibos`
          }
          emphasis={overdue}
          loading={receipts.isPending}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          id="avisos"
          title="Avisos"
          description={
            unreadNotices.length > 0 ? `${unreadNotices.length} sin leer` : 'Estás al día'
          }
          action={
            <Link
              to="/portal/avisos"
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
            >
              Ver todos
            </Link>
          }
        >
          <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            {(notices.data ?? []).slice(0, 4).map((n) => {
              const unread = unreadNotices.includes(n)
              return (
                <li key={n.id}>
                  <Link
                    to="/portal/avisos"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-sunken/50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-2 size-2 shrink-0 rounded-full',
                        unread ? 'bg-brass' : 'bg-transparent',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate', unread && 'font-medium')}>
                        {n.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(n.published_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
            {notices.data?.length === 0 && (
              <li className="px-4 py-5 text-sm text-muted-foreground">No hay avisos.</li>
            )}
          </ul>
        </Section>

        <Section
          id="incidencias"
          title="Incidencias en curso"
          description="Se actualizan en tiempo real"
          action={
            <Link
              to="/portal/incidencias"
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
            >
              Ver todas
            </Link>
          }
        >
          <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            {activeIncidents.slice(0, 4).map((i) => (
              <li key={i.id}>
                <Link
                  to={`/portal/incidencias/${i.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.responsible_name ?? 'Sin responsable asignado'}
                    </span>
                  </span>
                  <IncidentStatusBadge status={i.status} />
                </Link>
              </li>
            ))}
            {activeIncidents.length === 0 && (
              <li className="px-4 py-5 text-sm text-muted-foreground">
                No hay incidencias activas.
              </li>
            )}
          </ul>
        </Section>
      </div>
    </div>
  )
}
