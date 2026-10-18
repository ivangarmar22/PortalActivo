import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  Megaphone,
  ReceiptText,
  StickyNote,
  Vote,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { CommunityEmblem } from '@/components/shared/Logo'
import { Metric, Section } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { IncidentStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { ParticipationChart } from '@/features/admin/ParticipationChart'
import { useAdmin } from '@/features/auth/useAuth'
import { useAdminCounters } from '@/features/admin/queries'
import { useFinanceSummary } from '@/features/finance/queries'
import { useIncidents } from '@/features/incidents/queries'
import { useMeetings } from '@/features/meetings/queries'
import { useDashboard } from '@/features/results/queries'
import { formatEuros, formatLongDay, formatRelative, pluralize } from '@/lib/format'

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Madrid',
    }).format(new Date()),
  )
  if (hour < 6 || hour >= 21) return 'Buenas noches'
  if (hour < 13) return 'Buenos días'
  return 'Buenas tardes'
}

interface Attention {
  to: string
  icon: LucideIcon
  title: string
  detail: string
}

export function DashboardPage() {
  const { activeCommunity, displayName } = useAdmin()
  const communityId = activeCommunity.id
  const dashboard = useDashboard(communityId)
  const meetings = useMeetings(communityId)
  const incidents = useIncidents(communityId)
  const finance = useFinanceSummary(communityId)
  const counters = useAdminCounters(communityId)

  const live = (meetings.data ?? []).filter((m) => m.status === 'in_progress')
  const openQuestions = dashboard.data?.questions.open ?? 0
  const attention: Attention[] = [
    ...(counters.data?.newIncidents
      ? [
          {
            to: '/admin/incidencias',
            icon: Wrench,
            title: `${pluralize(counters.data.newIncidents, 'incidencia nueva', 'incidencias nuevas')} sin revisar`,
            detail: 'Asígnales un responsable para que los vecinos sepan quién se encarga.',
          },
        ]
      : []),
    ...(counters.data?.pendingPosts
      ? [
          {
            to: '/admin/avisos',
            icon: StickyNote,
            title: `${pluralize(counters.data.pendingPosts, 'publicación', 'publicaciones')} del tablón por revisar`,
            detail: 'No se ven hasta que las apruebes.',
          },
        ]
      : []),
    ...(finance.data?.overdue_count
      ? [
          {
            to: '/admin/economia',
            icon: ReceiptText,
            title: `${pluralize(finance.data.overdue_count, 'recibo vencido', 'recibos vencidos')} sin pagar`,
            detail: `${formatEuros(finance.data.pending_cents)} pendientes de cobro en total.`,
          },
        ]
      : []),
    ...(openQuestions > 0
      ? [
          {
            to: live[0] ? `/admin/reuniones/${live[0].id}` : '/admin/reuniones',
            icon: Vote,
            title: `${pluralize(openQuestions, 'votación abierta', 'votaciones abiertas')}`,
            detail: 'Recuerda cerrarlas cuando termine el turno de voto.',
          },
        ]
      : []),
  ]
  const activeIncidents = (incidents.data ?? []).filter((i) =>
    ['reported', 'in_review', 'in_progress'].includes(i.status),
  )

  return (
    <div className="space-y-10">
      <section className="ink-panel overflow-hidden rounded-3xl p-6 shadow-raised sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <CommunityEmblem
              name={activeCommunity.name}
              logoUrl={activeCommunity.logo_url}
              tone="dark"
              className="size-16 rounded-2xl"
            />
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brass-bright uppercase">
                {formatLongDay(new Date().toISOString())}
              </p>
              <h1 className="mt-1 font-display text-[2rem] leading-tight font-medium sm:text-[2.4rem]">
                {greeting()}, {displayName.split(' ')[0]}
              </h1>
              <p className="mt-1 text-ink-muted">Panel de {activeCommunity.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-brass-bright text-ink shadow-none hover:bg-brass-bright/90"
            >
              <Link to="/admin/reuniones?nueva=1">
                <CalendarPlus aria-hidden /> Nueva junta
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-ink-border bg-ink-raised text-ink-foreground hover:bg-ink-raised/80 hover:text-ink-foreground"
            >
              <Link to="/admin/avisos">
                <Megaphone aria-hidden /> Publicar aviso
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Section id="atencion" title="Requiere tu atención">
          {counters.isPending || finance.isPending ? (
            <ListSkeleton rows={2} />
          ) : attention.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-status-open/20 bg-status-open-bg/60 p-5 text-status-open">
              <CheckCircle2 aria-hidden className="size-5 shrink-0" />
              <p className="font-medium">Todo al día. No hay nada pendiente.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {attention.map((item) => (
                <li key={item.to + item.title}>
                  <Link
                    to={item.to}
                    className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-card transition hover:-translate-y-px hover:border-brass/40"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brass-soft text-brass-ink ring-1 ring-brass/20">
                      <item.icon aria-hidden className="size-[1.15rem]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.title}</span>
                      <span className="block text-sm text-muted-foreground">{item.detail}</span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="incidencias-activas"
          title="Incidencias activas"
          action={
            <Link
              to="/admin/incidencias"
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
            >
              Ver todas
            </Link>
          }
        >
          <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            {incidents.isPending && (
              <li className="p-4">
                <ListSkeleton rows={2} />
              </li>
            )}
            {activeIncidents.slice(0, 5).map((i) => (
              <li key={i.id}>
                <Link
                  to={`/admin/incidencias/${i.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.reported_dwelling ? `Vivienda ${i.reported_dwelling}` : 'Administración'} ·{' '}
                      {formatRelative(i.created_at)}
                    </span>
                  </span>
                  <IncidentStatusBadge status={i.status} />
                </Link>
              </li>
            ))}
            {!incidents.isPending && activeIncidents.length === 0 && (
              <li className="px-4 py-5 text-sm text-muted-foreground">
                No hay incidencias activas.
              </li>
            )}
          </ul>
        </Section>
      </div>

      {dashboard.isPending ? (
        <ListSkeleton rows={2} />
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link
              to="/admin/reuniones"
              className="block rounded-2xl transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Metric
                label="Juntas en curso"
                value={dashboard.data.meetings.in_progress}
                detail={`${dashboard.data.meetings.total} juntas en total`}
              />
            </Link>
            <Link
              to={live[0] ? `/admin/reuniones/${live[0].id}` : '/admin/reuniones'}
              className="block rounded-2xl transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Metric
                label="Votaciones abiertas"
                value={dashboard.data.questions.open}
                detail={`${dashboard.data.questions.closed} cerradas`}
              />
            </Link>
            <Link
              to="/admin/incidencias"
              className="block rounded-2xl transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Metric
                label="Incidencias activas"
                value={counters.data?.openIncidents ?? '—'}
                detail={`${counters.data?.newIncidents ?? 0} sin revisar`}
              />
            </Link>
            <Link
              to="/admin/censo"
              className="block rounded-2xl transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Metric
                label="Viviendas en el censo"
                value={dashboard.data.members_active}
                detail="Activas (base de la participación)"
              />
            </Link>
          </section>

          <Section
            id="participacion"
            title="Participación por junta"
            description="Viviendas que votaron al menos una pregunta, sobre las viviendas activas del censo."
          >
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
              {dashboard.data.participation.length === 0 ? (
                <EmptyState icon={BarChart3} title="Aún no hay juntas con votaciones" />
              ) : (
                <ParticipationChart rows={dashboard.data.participation} />
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
