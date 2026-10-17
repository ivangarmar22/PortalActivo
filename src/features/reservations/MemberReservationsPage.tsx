import { CalendarCheck2, CalendarX2, Clock, Info, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader, Section } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMember } from '@/features/auth/useAuth'
import {
  useAvailability,
  useBookSlot,
  useCancelReservation,
  useMyReservations,
  useSpaces,
} from '@/features/reservations/queries'
import { useNow } from '@/hooks/useNow'
import { capitalizeFirst, formatDay, formatLongDay, formatTime, todayInMadrid } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot, ReservationWithSpace, SpaceWithSlots } from '@/types/domain'

const DAYS = 14

function slotRange(slot: { starts_at: string; ends_at: string }) {
  return `${formatTime(slot.starts_at)}–${formatTime(slot.ends_at)}`
}

function duration(slot: { starts_at: string; ends_at: string }) {
  const minutes = Math.round(
    (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60_000,
  )
  return minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`
}

/** Título y detalle de una franja: si su nombre ya es una hora («18:30»), no se repite. */
function slotText(label: string, slot: { starts_at: string; ends_at: string }) {
  return /^\d{1,2}:\d{2}$/.test(label)
    ? { title: slotRange(slot), detail: duration(slot), summary: slotRange(slot) }
    : { title: label, detail: slotRange(slot), summary: `${label} · ${slotRange(slot)}` }
}

function MyReservations({
  communityId,
  spaces,
}: {
  communityId: string
  spaces: SpaceWithSlots[]
}) {
  const reservations = useMyReservations(communityId)
  const cancel = useCancelReservation()
  const [cancelling, setCancelling] = useState<ReservationWithSpace | null>(null)
  const now = useNow()
  const noticeHours = (spaceId: string) =>
    spaces.find((s) => s.id === spaceId)?.cancel_notice_hours ?? 24

  if (reservations.isPending) return <ListSkeleton rows={1} />
  if (reservations.isError)
    return <ErrorState error={reservations.error} onRetry={() => void reservations.refetch()} />
  if (reservations.data.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed bg-card/60 px-4 py-5 text-sm text-muted-foreground">
        No tienes reservas próximas.
      </p>
    )
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reservations.data.map((r) => {
          const tooLate =
            new Date(r.starts_at).getTime() - now < noticeHours(r.space_id) * 3_600_000
          return (
            <li
              key={r.id}
              className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-card"
            >
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-ink py-2 text-ink-foreground">
                <span className="text-[0.6875rem] tracking-wider text-brass-bright uppercase">
                  {new Intl.DateTimeFormat('es-ES', {
                    month: 'short',
                    timeZone: 'Europe/Madrid',
                  }).format(new Date(r.starts_at))}
                </span>
                <span className="font-display text-2xl leading-none">
                  {new Intl.DateTimeFormat('es-ES', {
                    day: 'numeric',
                    timeZone: 'Europe/Madrid',
                  }).format(new Date(r.starts_at))}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.common_spaces?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDay(r.starts_at)} · {slotText(r.slot_label, r).summary}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={tooLate}
                title={
                  tooLate
                    ? `Solo se puede cancelar con ${noticeHours(r.space_id)} h de antelación`
                    : undefined
                }
                onClick={() => setCancelling(r)}
              >
                <CalendarX2 aria-hidden /> Cancelar
              </Button>
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="¿Cancelar la reserva?"
        description={
          cancelling && (
            <p>
              {cancelling.common_spaces?.name} · {formatLongDay(cancelling.starts_at)} ·{' '}
              {slotRange(cancelling)}. La franja quedará libre para otras viviendas.
            </p>
          )
        }
        confirmLabel="Cancelar reserva"
        destructive
        onConfirm={() => cancel.mutateAsync(cancelling?.id ?? '')}
      />
    </>
  )
}

function SlotButton({ slot, onBook }: { slot: AvailabilitySlot; onBook: () => void }) {
  const text = slotText(slot.slot_label, slot)
  const label = text.summary
  if (slot.state === 'free') {
    return (
      <button
        type="button"
        onClick={onBook}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary/15 bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-primary-soft focus-visible:border-primary"
      >
        <span>
          <span className="tabular block font-medium">{text.title}</span>
          <span className="tabular text-sm text-muted-foreground">{text.detail}</span>
        </span>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
          Reservar<span className="sr-only"> {label}</span>
        </span>
      </button>
    )
  }
  const stateText = {
    taken: 'Ocupado',
    mine: 'Tu reserva',
    past: 'Ya ha pasado',
    closed: 'Aún no disponible',
  }[slot.state]
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3',
        slot.state === 'mine'
          ? 'border-brass/40 bg-brass-soft/70'
          : 'border-dashed bg-sunken/50 text-muted-foreground',
      )}
    >
      <span>
        <span className="tabular block font-medium">{text.title}</span>
        <span className="tabular text-sm">{text.detail}</span>
      </span>
      <span className={cn('text-sm font-medium', slot.state === 'mine' && 'text-brass-ink')}>
        {stateText}
      </span>
    </div>
  )
}

function SpaceBooking({ space }: { space: SpaceWithSlots }) {
  const today = todayInMadrid()
  const availability = useAvailability(space.id, today, DAYS)
  const book = useBookSlot()
  const [day, setDay] = useState(today)
  const [pending, setPending] = useState<AvailabilitySlot | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const slot of availability.data ?? [])
      map.set(slot.day, [...(map.get(slot.day) ?? []), slot])
    return map
  }, [availability.data])
  const days = [...byDay.keys()]
  const selected = byDay.get(day) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarCheck2 aria-hidden className="size-4 text-brass-ink" /> Hasta{' '}
          {space.max_future_per_member}{' '}
          {space.max_future_per_member === 1 ? 'reserva futura' : 'reservas futuras'} por vivienda
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4 text-brass-ink" /> Cancelación hasta{' '}
          {space.cancel_notice_hours} h antes
        </span>
      </div>
      {space.rules && (
        <details className="rounded-xl border bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <Info aria-hidden className="size-4 text-brass-ink" /> Normas de uso
          </summary>
          <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground">
            {space.rules}
          </p>
        </details>
      )}

      {availability.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : availability.isError ? (
        <ErrorState error={availability.error} onRetry={() => void availability.refetch()} />
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="Día"
            className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:py-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0"
          >
            {days.map((d) => {
              const slots = byDay.get(d) ?? []
              const free = slots.filter((s) => s.state === 'free').length
              const mine = slots.some((s) => s.state === 'mine')
              const date = new Date(`${d}T12:00:00`)
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === day}
                  aria-label={`${formatLongDay(d)}: ${free} ${free === 1 ? 'franja libre' : 'franjas libres'}`}
                  onClick={() => setDay(d)}
                  className={cn(
                    'flex w-[4.25rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition sm:w-auto',
                    d === day
                      ? 'border-ink bg-ink text-ink-foreground shadow-raised'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <span
                    className={cn(
                      'text-[0.6875rem] uppercase',
                      d === day ? 'text-brass-bright' : 'text-muted-foreground',
                    )}
                  >
                    {new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date)}
                  </span>
                  <span className="font-display text-xl leading-tight">{date.getDate()}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 size-1.5 rounded-full',
                      mine ? 'bg-brass' : free > 0 ? 'bg-status-open' : 'bg-border',
                    )}
                  />
                </button>
              )
            })}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{capitalizeFirst(formatLongDay(day))}</p>
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este espacio no tiene franjas ese día.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selected.map((slot) => (
                  <li key={slot.slot_id}>
                    <SlotButton slot={slot} onBook={() => setPending(slot)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={`¿Reservar ${space.name.toLowerCase()}?`}
        description={
          pending && (
            <>
              <p className="text-foreground">
                {capitalizeFirst(formatLongDay(pending.day))} ·{' '}
                {slotText(pending.slot_label, pending).summary}
              </p>
              <p>
                Al confirmar aceptas las normas de uso del espacio. La reserva se confirma al
                momento.
              </p>
            </>
          )
        }
        confirmLabel="Confirmar reserva"
        onConfirm={() =>
          book.mutateAsync({ slotId: pending?.slot_id ?? '', day: pending?.day ?? '' })
        }
      />
    </div>
  )
}

export function MemberReservationsPage() {
  const { membership } = useMember()
  const spaces = useSpaces(membership.community_id)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const active = spaces.data?.find((s) => s.id === spaceId) ?? spaces.data?.[0]

  return (
    <>
      <PageHeader
        eyebrow="Zonas comunes"
        title="Reservas"
        description="Elige espacio, día y franja. La confirmación es inmediata y nadie más puede reservar la misma franja."
      />
      <div className="space-y-10">
        <Section title="Mis próximas reservas" id="mis-reservas">
          <MyReservations communityId={membership.community_id} spaces={spaces.data ?? []} />
        </Section>

        <Section title="Reservar un espacio" id="reservar">
          {spaces.isPending ? (
            <ListSkeleton rows={2} />
          ) : spaces.isError ? (
            <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
          ) : !active ? (
            <EmptyState
              icon={Users}
              title="No hay espacios reservables"
              description="La administración todavía no ha configurado ninguno."
            />
          ) : (
            <div className="space-y-6">
              <div
                role="tablist"
                aria-label="Espacio"
                className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:py-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0"
              >
                {spaces.data.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={s.id === active.id}
                    onClick={() => setSpaceId(s.id)}
                    className={cn(
                      'w-60 shrink-0 snap-start rounded-2xl border p-4 text-left transition sm:w-auto',
                      s.id === active.id
                        ? 'border-primary bg-primary-soft shadow-card ring-1 ring-primary'
                        : 'border-border/80 bg-card hover:border-primary/40',
                    )}
                  >
                    <p className="font-display text-lg leading-tight font-medium">{s.name}</p>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
              <SpaceBooking key={active.id} space={active} />
            </div>
          )}
        </Section>
      </div>
    </>
  )
}
