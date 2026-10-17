import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Plus, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { FormField } from '@/components/shared/FormField'
import { NativeSelect } from '@/components/shared/NativeSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, ListSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdmin } from '@/features/auth/useAuth'
import { IncidentDetailView } from '@/features/incidents/IncidentDetailView'
import { IncidentList } from '@/features/incidents/IncidentList'
import { useIncident, useUpdateIncident } from '@/features/incidents/queries'
import { ReportIncidentDialog } from '@/features/incidents/ReportIncidentDialog'
import { useTableRealtime } from '@/hooks/useTableRealtime'
import { incidentResponsibleLabel, incidentStatusLabel, incidentStatusOrder } from '@/lib/status'
import { incidentUpdateSchema, type IncidentUpdateValues } from '@/schemas/forms'
import type { IncidentResponsible, IncidentWithUpdates } from '@/types/domain'

export function AdminIncidentsPage() {
  const { activeCommunity } = useAdmin()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader
        eyebrow="Vida en comunidad"
        title="Incidencias"
        description="Los vecinos las comunican y ven cada cambio de estado al momento. Asigna un responsable y deja constancia de cada paso."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> Registrar incidencia
          </Button>
        }
      />
      <IncidentList communityId={activeCommunity.id} basePath="/admin/incidencias" />
      <ReportIncidentDialog
        open={creating}
        onOpenChange={setCreating}
        communityId={activeCommunity.id}
        asAdmin
        onCreated={(id) => void navigate(`/admin/incidencias/${id}`)}
      />
    </>
  )
}

function defaultsFor(incident: IncidentWithUpdates): IncidentUpdateValues {
  return {
    status: incident.status,
    responsibleType: incident.responsible_type ?? 'none',
    responsibleName: incident.responsible_name ?? '',
    estimatedResolution: incident.estimated_resolution ?? '',
    message: '',
  }
}

function ManagePanel({
  incident,
  communityId,
}: {
  incident: IncidentWithUpdates
  communityId: string
}) {
  const update = useUpdateIncident(communityId, incident.id)
  const form = useForm<IncidentUpdateValues>({
    resolver: zodResolver(incidentUpdateSchema),
    defaultValues: defaultsFor(incident),
  })
  const { errors, isSubmitting } = form.formState
  const responsibleType = useWatch({ control: form.control, name: 'responsibleType' })

  useEffect(() => {
    form.reset(defaultsFor(incident))
  }, [incident, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        status: values.status,
        responsibleType: values.responsibleType === 'none' ? null : values.responsibleType,
        responsibleName: values.responsibleType === 'none' ? '' : values.responsibleName,
        estimatedResolution: values.estimatedResolution || null,
        message: values.message,
      })
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-card"
      aria-label="Gestionar incidencia"
    >
      <div>
        <h2 className="font-display text-lg font-medium">Gestionar</h2>
        <p className="text-sm text-muted-foreground">
          Cada cambio queda en el historial que ven los vecinos.
        </p>
      </div>
      <FormField label="Estado" error={errors.status?.message}>
        <NativeSelect {...form.register('status')}>
          {incidentStatusOrder.map((s) => (
            <option key={s} value={s}>
              {incidentStatusLabel[s]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Responsable" error={errors.responsibleType?.message}>
        <NativeSelect {...form.register('responsibleType')}>
          <option value="none">Sin asignar</option>
          {(Object.keys(incidentResponsibleLabel) as IncidentResponsible[]).map((r) => (
            <option key={r} value={r}>
              {incidentResponsibleLabel[r]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {responsibleType !== 'none' && (
        <FormField label="Nombre (empresa, promotora…)" error={errors.responsibleName?.message}>
          <Input
            placeholder="Por ejemplo: Ascensores Norte"
            {...form.register('responsibleName')}
          />
        </FormField>
      )}
      <FormField label="Previsión de solución" error={errors.estimatedResolution?.message}>
        <Input type="date" {...form.register('estimatedResolution')} />
      </FormField>
      <FormField label="Mensaje para los vecinos (opcional)" error={errors.message?.message}>
        <Textarea
          rows={3}
          placeholder="Qué se ha hecho o qué falta"
          {...form.register('message')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
        Guardar y notificar
      </Button>
    </form>
  )
}

export function AdminIncidentDetailPage() {
  const { incidentId = '' } = useParams()
  const { activeCommunity } = useAdmin()
  const incident = useIncident(incidentId)
  useTableRealtime('incidents', activeCommunity.id, [['incident', incidentId]])

  return (
    <>
      <Link
        to="/admin/incidencias"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Incidencias
      </Link>
      {incident.isPending ? (
        <ListSkeleton rows={3} />
      ) : incident.isError ? (
        <ErrorState error={incident.error} onRetry={() => void incident.refetch()} />
      ) : (
        <>
          <PageHeader eyebrow="Incidencia" title={incident.data.title} />
          <IncidentDetailView
            incident={incident.data}
            aside={<ManagePanel incident={incident.data} communityId={activeCommunity.id} />}
          />
        </>
      )}
    </>
  )
}
