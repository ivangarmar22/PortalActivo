import { ArrowLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, ListSkeleton } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { useMember } from '@/features/auth/useAuth'
import { IncidentDetailView } from '@/features/incidents/IncidentDetailView'
import { IncidentList } from '@/features/incidents/IncidentList'
import { useIncident } from '@/features/incidents/queries'
import { ReportIncidentDialog } from '@/features/incidents/ReportIncidentDialog'
import { useTableRealtime } from '@/hooks/useTableRealtime'

export function MemberIncidentsPage() {
  const { membership } = useMember()
  const navigate = useNavigate()
  const [reporting, setReporting] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow="Vida en comunidad"
        title="Incidencias"
        description="Lo que está pasando en las zonas comunes y quién se encarga, actualizado al momento."
        actions={
          <Button onClick={() => setReporting(true)}>
            <Plus aria-hidden /> Comunicar incidencia
          </Button>
        }
      />
      <IncidentList communityId={membership.community_id} basePath="/portal/incidencias" />
      <ReportIncidentDialog
        open={reporting}
        onOpenChange={setReporting}
        communityId={membership.community_id}
        onCreated={(id) => void navigate(`/portal/incidencias/${id}`)}
      />
    </>
  )
}

export function MemberIncidentDetailPage() {
  const { incidentId = '' } = useParams()
  const { membership } = useMember()
  const incident = useIncident(incidentId)
  useTableRealtime('incidents', membership.community_id, [['incident', incidentId]])

  return (
    <>
      <Link
        to="/portal/incidencias"
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
          <IncidentDetailView incident={incident.data} />
        </>
      )}
    </>
  )
}
