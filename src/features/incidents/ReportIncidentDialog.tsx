import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FilePicker } from '@/components/shared/FilePicker'
import { FormField } from '@/components/shared/FormField'
import { NativeSelect } from '@/components/shared/NativeSelect'
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
import { useReportIncident } from '@/features/incidents/queries'
import { incidentCategoryLabel } from '@/lib/status'
import { IMAGE_TYPES } from '@/repositories/filesRepository'
import { incidentReportSchema, type IncidentReportValues } from '@/schemas/forms'
import type { IncidentCategory } from '@/types/domain'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  communityId: string
  asAdmin?: boolean
  onCreated?: (id: string) => void
}

// El formulario vive dentro del contenido del diálogo, que se desmonta al cerrarse:
// cada apertura empieza con el formulario y la foto vacíos.
function ReportForm({
  onOpenChange,
  communityId,
  asAdmin = false,
  onCreated,
}: Omit<Props, 'open'>) {
  const [photo, setPhoto] = useState<File | null>(null)
  const report = useReportIncident(communityId, asAdmin)
  const form = useForm<IncidentReportValues>({
    resolver: zodResolver(incidentReportSchema),
    defaultValues: { title: '', description: '', location: '', category: 'other' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      const id = await report.mutateAsync({ input: values, photo })
      onOpenChange(false)
      onCreated?.(id)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormField label="¿Qué ocurre?" error={errors.title?.message}>
        <Input
          placeholder="Por ejemplo: la luz del portal 2 no se enciende"
          {...form.register('title')}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Categoría" error={errors.category?.message}>
          <NativeSelect {...form.register('category')}>
            {(Object.keys(incidentCategoryLabel) as IncidentCategory[]).map((c) => (
              <option key={c} value={c}>
                {incidentCategoryLabel[c]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Ubicación" error={errors.location?.message}>
          <Input placeholder="Portal, planta, zona…" {...form.register('location')} />
        </FormField>
      </div>
      <FormField label="Detalles (opcional)" error={errors.description?.message}>
        <Textarea
          rows={4}
          placeholder="Desde cuándo pasa, cómo afecta…"
          {...form.register('description')}
        />
      </FormField>
      <FilePicker
        label="Foto (opcional)"
        accept={IMAGE_TYPES}
        file={photo}
        onChange={setPhoto}
        hint="JPG, PNG o WebP. Máximo 10 MB. Evita que aparezcan personas."
      />
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
          Enviar incidencia
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ReportIncidentDialog({ open, onOpenChange, asAdmin = false, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">
            Comunicar una incidencia
          </DialogTitle>
          <DialogDescription>
            {asAdmin
              ? 'Aparecerá como abierta por la administración.'
              : 'Toda la comunidad verá la incidencia y que la ha comunicado tu vivienda.'}
          </DialogDescription>
        </DialogHeader>
        <ReportForm onOpenChange={onOpenChange} asAdmin={asAdmin} {...rest} />
      </DialogContent>
    </Dialog>
  )
}
