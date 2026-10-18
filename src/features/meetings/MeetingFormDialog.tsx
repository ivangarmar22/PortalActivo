import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
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
import { Textarea } from '@/components/ui/textarea'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/format'
import type { MeetingInput } from '@/repositories/meetingsRepository'
import { meetingSchema, type MeetingFormValues } from '@/schemas/forms'
import type { Meeting } from '@/types/domain'

function defaultsFor(meeting?: Meeting): MeetingFormValues {
  return {
    title: meeting?.title ?? '',
    description: meeting?.description ?? '',
    meetingDate: meeting ? toDateTimeLocalValue(meeting.meeting_date) : '',
  }
}

export function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting?: Meeting
  onSubmit: (input: MeetingInput) => Promise<unknown>
}) {
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: defaultsFor(meeting),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFor(meeting))
  }, [open, meeting, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        title: values.title,
        description: values.description || null,
        meetingDate: fromDateTimeLocalValue(values.meetingDate),
      })
      onOpenChange(false)
    } catch {
      // El error ya se ha notificado; el formulario sigue abierto.
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Editar reunión' : 'Nueva reunión'}</DialogTitle>
          <DialogDescription>
            {meeting
              ? 'Los cambios se guardan para todos los dispositivos.'
              : 'La reunión se crea en preparación: los propietarios no la verán hasta que la inicies.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField label="Título" error={errors.title?.message}>
            <Input placeholder="Junta ordinaria 2027" {...form.register('title')} />
          </FormField>
          <FormField
            label="Fecha y hora"
            error={errors.meetingDate?.message}
            hint="Hora de tu dispositivo."
          >
            <Input type="datetime-local" {...form.register('meetingDate')} />
          </FormField>
          <FormField label="Descripción (opcional)" error={errors.description?.message}>
            <Textarea
              rows={4}
              placeholder="Información general para los propietarios sobre la junta"
              {...form.register('description')}
            />
          </FormField>
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
              {meeting ? 'Guardar cambios' : 'Crear reunión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
