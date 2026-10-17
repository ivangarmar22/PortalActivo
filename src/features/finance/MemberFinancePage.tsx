import { FileDown, FileText, Lock, ReceiptText } from 'lucide-react'
import { Metric, PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { ReceiptStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMember } from '@/features/auth/useAuth'
import { DocumentsList } from '@/features/finance/DocumentsList'
import { downloadFile } from '@/services/fileService'
import { useMyReceipts } from '@/features/finance/queries'
import { isOverdue } from '@/features/finance/receipts'
import { capitalizeFirst, formatDate, formatEuros, formatMonth } from '@/lib/format'

function MyReceipts() {
  const receipts = useMyReceipts()
  if (receipts.isPending) return <ListSkeleton />
  if (receipts.isError)
    return <ErrorState error={receipts.error} onRetry={() => void receipts.refetch()} />
  if (receipts.data.length === 0) return <EmptyState icon={ReceiptText} title="No tienes recibos" />

  const pending = receipts.data.filter((r) => r.status !== 'paid')
  const pendingCents = pending.reduce((sum, r) => sum + r.amount_cents, 0)
  const overdue = receipts.data.filter((r) => isOverdue(r)).length

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          tone={pendingCents > 0 ? 'ink' : 'default'}
          label="Pendiente de pago"
          value={formatEuros(pendingCents)}
          detail={
            pending.length === 0
              ? 'Estás al día'
              : `${pending.length} ${pending.length === 1 ? 'recibo' : 'recibos'}`
          }
        />
        <Metric
          tone={overdue > 0 ? 'attention' : 'default'}
          label="Vencidos"
          value={overdue}
          detail={overdue > 0 ? 'Contacta con la administración' : 'Ninguno'}
        />
        <Metric label="Recibos emitidos" value={receipts.data.length} />
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden className="size-4" /> Solo tú y la administración veis los recibos de tu
        vivienda.
      </p>
      <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
        {receipts.data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.concept}</p>
              <p className="text-sm text-muted-foreground">
                {capitalizeFirst(formatMonth(r.period_start))} · vence el {formatDate(r.due_date)}
                {r.paid_at && ` · pagado el ${formatDate(r.paid_at)}`}
              </p>
            </div>
            <ReceiptStatusBadge status={r.status} overdue={isOverdue(r)} />
            <span className="tabular w-24 shrink-0 text-right font-display text-lg">
              {formatEuros(r.amount_cents)}
            </span>
            {r.file_path && r.file_name ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Descargar recibo ${r.concept}`}
                onClick={() => void downloadFile(r.file_path as string, r.file_name as string)}
              >
                <FileDown aria-hidden />
              </Button>
            ) : (
              <span className="hidden size-8 sm:block" aria-hidden />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MemberFinancePage() {
  const { membership } = useMember()
  return (
    <>
      <PageHeader
        eyebrow="Economía"
        title="Recibos y documentos"
        description="Tus recibos y las cuentas de la comunidad."
      />
      <Tabs defaultValue="receipts">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
          <TabsTrigger value="receipts">
            <ReceiptText aria-hidden /> Mis recibos
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText aria-hidden />
            <span className="sm:hidden">Documentos</span>
            <span className="max-sm:hidden">Documentos de la comunidad</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="receipts">
          <MyReceipts />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsList communityId={membership.community_id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
