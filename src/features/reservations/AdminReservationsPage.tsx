import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck2, CalendarX2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAdmin } from '@/features/auth/useAuth'
import {
  useAdminCancelReservation,
  useAdminReservations,
  useSaveSpace,
  useSpaces,
} from '@/features/reservations/queries'
import { formatLongDay, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { spaceSchema, type SpaceFormInput, type SpaceFormValues } from '@/schemas/forms'
import type { AdminReservation, SpaceWithSlots } from '@/types/domain'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function UpcomingReservations({ communityId }: { communityId: string }) {
  const reservations = useAdminReservations(communityId)
  const cancel = useAdminCancelReservation()
  const [cancelling, setCancelling] = useState<AdminReservation | null>(null)
  const [reason, setReason] = useState('')

  const byDay = useMemo(() => {
    const map = new Map<string, AdminReservation[]>()
    for (const r of reservations.data ?? []) {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
        new Date(r.starts_at),
      )
      map.set(day, [...(map.get(day) ?? []), r])
    }
    return [...map.entries()]
  }, [reservations.data])

  if (reservations.isPending) return <ListSkeleton />
  if (reservations.isError)
    return <ErrorState error={reservations.error} onRetry={() => void reservations.refetch()} />
  if (byDay.length === 0)
    return <EmptyState icon={CalendarCheck2} title="No hay reservas próximas" />

  return (
    <>
      <div className="space-y-6">
        {byDay.map(([day, items]) => (
          <section key={day} aria-label={formatLongDay(day)}>
            <h3 className="eyebrow mb-2">{formatLongDay(day)}</h3>
            <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {items.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3',
                    r.status === 'cancelled' && 'opacity-60',
                  )}
                >
                  <span className="tabular w-28 shrink-0 text-sm font-medium">
                    {formatTime(r.starts_at)}–{formatTime(r.ends_at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {r.common_spaces?.name} ·{' '}
                      <span className="text-muted-foreground">{r.slot_label}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vivienda {r.community_members?.dwelling_label} ·{' '}
                      {r.community_members?.full_name}
                    </p>
                  </div>
                  {r.status === 'cancelled' ? (
                    <span className="text-sm text-muted-foreground">
                      Cancelada{' '}
                      {r.cancelled_by === 'admin' ? 'por la administración' : 'por la vivienda'}
                    </span>
                  ) : new Date(r.ends_at) > new Date() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReason('')
                        setCancelling(r)
                      }}
                    >
                      <CalendarX2 aria-hidden /> Cancelar
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Finalizada</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Dialog open={cancelling !== null} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              {cancelling &&
                `${cancelling.common_spaces?.name} · vivienda ${cancelling.community_members?.dwelling_label}`}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Motivo (opcional)">
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Por ejemplo: mantenimiento del espacio"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={async () => {
                if (!cancelling) return
                try {
                  await cancel.mutateAsync({ id: cancelling.id, reason })
                  setCancelling(null)
                } catch {
                  // Notificado por la mutación.
                }
              }}
            >
              {cancel.isPending && <Loader2 aria-hidden className="animate-spin" />}
              Cancelar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function defaultsFor(space?: SpaceWithSlots): SpaceFormInput {
  return {
    name: space?.name ?? '',
    description: space?.description ?? '',
    rules: space?.rules ?? '',
    maxFuture: space?.max_future_per_member ?? 2,
    cancelHours: space?.cancel_notice_hours ?? 24,
    windowDays: space?.booking_window_days ?? 30,
    isActive: space?.is_active ?? true,
    slots: space
      ? space.space_slots.map((s) => ({
          id: s.id,
          label: s.label,
          start: s.start_time.slice(0, 5),
          end: s.end_time.slice(0, 5),
          weekdays: [...s.weekdays],
        }))
      : [{ label: '', start: '10:00', end: '14:00', weekdays: [1, 2, 3, 4, 5, 6, 7] }],
  }
}

function SpaceDialog({
  open,
  onOpenChange,
  space,
  communityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  space?: SpaceWithSlots
  communityId: string
}) {
  const save = useSaveSpace(communityId)
  const form = useForm<SpaceFormInput, unknown, SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: defaultsFor(space),
  })
  const slots = useFieldArray({ control: form.control, name: 'slots' })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (open) form.reset(defaultsFor(space))
  }, [open, space, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ input: values, spaceId: space?.id })
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">
            {space ? `Editar ${space.name}` : 'Nuevo espacio'}
          </DialogTitle>
          <DialogDescription>
            Las reservas ya hechas se mantienen aunque cambies las franjas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre" error={errors.name?.message}>
              <Input {...form.register('name')} />
            </FormField>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 sm:mt-6">
                  <Label htmlFor="space-active">Reservable</Label>
                  <Switch
                    id="space-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>
          <FormField label="Descripción" error={errors.description?.message}>
            <Textarea rows={2} {...form.register('description')} />
          </FormField>
          <FormField label="Normas de uso" hint="Una por línea." error={errors.rules?.message}>
            <Textarea rows={3} {...form.register('rules')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Reservas futuras por vivienda" error={errors.maxFuture?.message}>
              <Input type="number" min={1} max={10} {...form.register('maxFuture')} />
            </FormField>
            <FormField label="Cancelar hasta (horas antes)" error={errors.cancelHours?.message}>
              <Input type="number" min={0} max={168} {...form.register('cancelHours')} />
            </FormField>
            <FormField label="Antelación máxima (días)" error={errors.windowDays?.message}>
              <Input type="number" min={1} max={180} {...form.register('windowDays')} />
            </FormField>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Franjas</legend>
            {slots.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-xl border bg-sunken/40 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
              >
                <FormField label="Nombre" error={errors.slots?.[index]?.label?.message}>
                  <Input placeholder="Comida, 18:30…" {...form.register(`slots.${index}.label`)} />
                </FormField>
                <FormField label="Desde" error={errors.slots?.[index]?.start?.message}>
                  <Input type="time" {...form.register(`slots.${index}.start`)} />
                </FormField>
                <FormField label="Hasta" error={errors.slots?.[index]?.end?.message}>
                  <Input type="time" {...form.register(`slots.${index}.end`)} />
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar franja ${index + 1}`}
                  disabled={slots.fields.length <= 1}
                  onClick={() => slots.remove(index)}
                >
                  <Trash2 aria-hidden />
                </Button>
                <Controller
                  control={form.control}
                  name={`slots.${index}.weekdays`}
                  render={({ field: days }) => (
                    <div
                      role="group"
                      aria-label="Días de la semana"
                      className="flex flex-wrap gap-1.5 sm:col-span-4"
                    >
                      {WEEKDAYS.map((d, i) => {
                        const value = i + 1
                        const on = days.value.includes(value)
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={on}
                            aria-label={WEEKDAY_NAMES[i]}
                            onClick={() =>
                              days.onChange(
                                on
                                  ? days.value.filter((v) => v !== value)
                                  : [...days.value, value].sort(),
                              )
                            }
                            className={cn(
                              'size-8 rounded-full text-xs font-semibold transition',
                              on
                                ? 'bg-ink text-ink-foreground'
                                : 'bg-card text-muted-foreground ring-1 ring-border',
                            )}
                          >
                            {d}
                          </button>
                        )
                      })}
                      {errors.slots?.[index]?.weekdays?.message && (
                        <p role="alert" className="w-full text-sm text-destructive">
                          {errors.slots[index].weekdays.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                slots.append({
                  label: '',
                  start: '10:00',
                  end: '14:00',
                  weekdays: [1, 2, 3, 4, 5, 6, 7],
                })
              }
            >
              <Plus aria-hidden /> Añadir franja
            </Button>
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
              Guardar espacio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SpacesPanel({ communityId }: { communityId: string }) {
  const spaces = useSpaces(communityId)
  const [editing, setEditing] = useState<SpaceWithSlots | 'new' | null>(null)

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden /> Nuevo espacio
        </Button>
      </div>
      {spaces.isPending ? (
        <ListSkeleton />
      ) : spaces.isError ? (
        <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
      ) : spaces.data.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="Aún no hay espacios"
          description="Crea la barbacoa, la pista o el salón para que los vecinos puedan reservar."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {spaces.data.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl leading-tight font-medium">{s.name}</p>
                  {!s.is_active && (
                    <p className="mt-1 text-sm font-medium text-status-draft">No reservable</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                  <Pencil aria-hidden /> Editar
                </Button>
              </div>
              {s.description && (
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              )}
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {s.space_slots.map((slot) => (
                  <li key={slot.id} className="tabular rounded-lg bg-sunken px-2 py-1 text-xs">
                    {/* Si el nombre de la franja ya es su hora («17:00»), no se repite */}
                    {!/^\d{1,2}:\d{2}$/.test(slot.label) && (
                      <span className="font-medium">{slot.label} </span>
                    )}
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                {s.max_future_per_member} reservas futuras por vivienda · cancelación hasta{' '}
                {s.cancel_notice_hours} h antes · reservas con {s.booking_window_days} días de
                antelación
              </p>
            </li>
          ))}
        </ul>
      )}
      <SpaceDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        space={editing === 'new' || editing === null ? undefined : editing}
        communityId={communityId}
      />
    </>
  )
}

export function AdminReservationsPage() {
  const { activeCommunity } = useAdmin()
  return (
    <>
      <PageHeader
        eyebrow="Vida en comunidad"
        title="Reservas de zonas comunes"
        description="Los vecinos reservan franjas fijas con confirmación inmediata. Aquí ves quién ha reservado y configuras los espacios."
      />
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Próximas reservas</TabsTrigger>
          <TabsTrigger value="spaces">Espacios y franjas</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <UpcomingReservations communityId={activeCommunity.id} />
        </TabsContent>
        <TabsContent value="spaces">
          <SpacesPanel communityId={activeCommunity.id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
