import { zodResolver } from '@hookform/resolvers/zod'
import {
  FileText,
  FileUp,
  Loader2,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FilePicker } from '@/components/shared/FilePicker'
import { FormField } from '@/components/shared/FormField'
import { NativeSelect } from '@/components/shared/NativeSelect'
import { Metric, PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { ReceiptStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdmin } from '@/features/auth/useAuth'
import { DocumentsList } from '@/features/finance/DocumentsList'
import { downloadFile } from '@/services/fileService'
import { isOverdue } from '@/features/finance/receipts'
import {
  useAdminReceipts,
  useAttachReceiptFile,
  useCreateDocument,
  useDeleteDocument,
  useFinanceSummary,
  useIssueReceipts,
  useSetReceiptStatus,
} from '@/features/finance/queries'
import { capitalizeFirst, formatDate, formatEuros, formatMonth, todayInMadrid } from '@/lib/format'
import { documentKindLabel } from '@/lib/status'
import {
  documentSchema,
  issueReceiptsSchema,
  parseEurosToCents,
  type DocumentFormValues,
  type IssueReceiptsValues,
} from '@/schemas/forms'
import type { AdminReceipt, CommunityDocument, DocumentKind, ReceiptStatus } from '@/types/domain'

function IssueForm({
  onOpenChange,
  communityId,
}: {
  onOpenChange: (o: boolean) => void
  communityId: string
}) {
  const issue = useIssueReceipts(communityId)
  const today = todayInMadrid()
  const defaults: IssueReceiptsValues = {
    concept: 'Cuota ordinaria',
    period: today.slice(0, 7),
    amount: '',
    dueDate: '',
  }
  const form = useForm<IssueReceiptsValues>({
    resolver: zodResolver(issueReceiptsSchema),
    defaultValues: defaults,
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await issue.mutateAsync({
        concept: values.concept,
        periodStart: `${values.period}-01`,
        amountCents: parseEurosToCents(values.amount) ?? 0,
        dueDate: values.dueDate,
      })
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormField label="Concepto" error={errors.concept?.message}>
        <Input {...form.register('concept')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mes" error={errors.period?.message}>
          <Input type="month" {...form.register('period')} />
        </FormField>
        <FormField label="Importe por vivienda" error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="85,00 €" {...form.register('amount')} />
        </FormField>
      </div>
      <FormField label="Vencimiento" error={errors.dueDate?.message}>
        <Input type="date" {...form.register('dueDate')} />
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
          Emitir recibos
        </Button>
      </DialogFooter>
    </form>
  )
}

// Los formularios viven dentro del contenido del diálogo (se desmonta al cerrarse): cada apertura
// empieza limpia sin necesidad de efectos.
function IssueDialog({
  open,
  onOpenChange,
  communityId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  communityId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">Emitir recibos</DialogTitle>
          <DialogDescription>
            Se crea un recibo para cada vivienda activa. Si una vivienda ya tiene ese concepto en
            ese mes, no se duplica.
          </DialogDescription>
        </DialogHeader>
        <IssueForm onOpenChange={onOpenChange} communityId={communityId} />
      </DialogContent>
    </Dialog>
  )
}

function DocumentDialog({
  open,
  onOpenChange,
  communityId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  communityId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">Publicar documento</DialogTitle>
          <DialogDescription>Lo verán todas las viviendas de la comunidad.</DialogDescription>
        </DialogHeader>
        <DocumentForm onOpenChange={onOpenChange} communityId={communityId} />
      </DialogContent>
    </Dialog>
  )
}

function ReceiptActions({ receipt, communityId }: { receipt: AdminReceipt; communityId: string }) {
  const setStatus = useSetReceiptStatus(communityId)
  const attach = useAttachReceiptFile(communityId)
  const fileInput = useRef<HTMLInputElement>(null)
  const options: { status: ReceiptStatus; label: string }[] = [
    { status: 'paid', label: 'Marcar como pagado' },
    { status: 'returned', label: 'Marcar como devuelto' },
    { status: 'pending', label: 'Marcar como pendiente' },
  ]
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) attach.mutate({ id: receipt.id, memberId: receipt.member_id, file })
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones del recibo de ${receipt.community_members?.dwelling_label}`}
          >
            {attach.isPending || setStatus.isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <MoreHorizontal aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {options
            .filter((o) => o.status !== receipt.status)
            .map((o) => (
              <DropdownMenuItem
                key={o.status}
                onSelect={() => setStatus.mutate({ id: receipt.id, status: o.status })}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <Upload aria-hidden /> {receipt.file_path ? 'Sustituir PDF' : 'Adjuntar PDF'}
          </DropdownMenuItem>
          {receipt.file_path && receipt.file_name && (
            <DropdownMenuItem
              onSelect={() =>
                void downloadFile(receipt.file_path as string, receipt.file_name as string)
              }
            >
              <FileText aria-hidden /> Descargar PDF
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function ReceiptsPanel({ communityId }: { communityId: string }) {
  const receipts = useAdminReceipts(communityId)
  const summary = useFinanceSummary(communityId)
  const [issuing, setIssuing] = useState(false)
  const [status, setStatus] = useState<'all' | 'pending' | 'overdue' | 'returned' | 'paid'>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (receipts.data ?? []).filter((r) => {
      const matchesStatus =
        status === 'all' || (status === 'overdue' ? isOverdue(r) : r.status === status)
      const text = `${r.community_members?.dwelling_label ?? ''} ${r.community_members?.full_name ?? ''} ${r.concept}`
      return matchesStatus && (!term || text.toLowerCase().includes(term))
    })
  }, [receipts.data, status, query])

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          tone="ink"
          label="Pendiente de cobro"
          value={formatEuros(summary.data?.pending_cents ?? 0)}
          detail={`${summary.data?.pending_count ?? 0} recibos`}
        />
        <Metric
          tone={(summary.data?.overdue_count ?? 0) > 0 ? 'attention' : 'default'}
          label="Vencidos sin pagar"
          value={summary.data?.overdue_count ?? 0}
        />
        <Metric label="Devueltos" value={summary.data?.returned_count ?? 0} />
        <Metric label="Cobrado" value={formatEuros(summary.data?.paid_cents ?? 0)} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,18rem)]">
          <FormField label="Estado">
            <NativeSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="overdue">Vencidos</option>
              <option value="returned">Devueltos</option>
              <option value="paid">Pagados</option>
            </NativeSelect>
          </FormField>
          <div className="relative self-end">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar por vivienda, nombre o concepto"
              placeholder="Vivienda, nombre o concepto"
              className="h-10 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => setIssuing(true)}>
          <Plus aria-hidden /> Emitir recibos
        </Button>
      </div>

      {receipts.isPending ? (
        <ListSkeleton />
      ) : receipts.isError ? (
        <ErrorState error={receipts.error} onRetry={() => void receipts.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No hay recibos con ese filtro" />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vivienda</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.community_members?.dwelling_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.community_members?.full_name}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal">{r.concept}</TableCell>
                    <TableCell>{capitalizeFirst(formatMonth(r.period_start))}</TableCell>
                    <TableCell className="tabular">{formatDate(r.due_date)}</TableCell>
                    <TableCell>
                      <ReceiptStatusBadge status={r.status} overdue={isOverdue(r)} />
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {formatEuros(r.amount_cents)}
                    </TableCell>
                    <TableCell>
                      <ReceiptActions receipt={r} communityId={communityId} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="space-y-3 md:hidden">
            {visible.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.community_members?.dwelling_label} · {r.concept}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {capitalizeFirst(formatMonth(r.period_start))}
                    </p>
                  </div>
                  <ReceiptActions receipt={r} communityId={communityId} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <ReceiptStatusBadge status={r.status} overdue={isOverdue(r)} />
                  <span className="tabular font-display text-lg">
                    {formatEuros(r.amount_cents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <IssueDialog open={issuing} onOpenChange={setIssuing} communityId={communityId} />
    </div>
  )
}

function DocumentForm({
  onOpenChange,
  communityId,
}: {
  onOpenChange: (o: boolean) => void
  communityId: string
}) {
  const create = useCreateDocument(communityId)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const defaults: DocumentFormValues = {
    kind: 'invoice',
    title: '',
    supplier: '',
    amount: '',
    documentDate: todayInMadrid(),
  }
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: defaults,
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    if (!file) {
      setFileError('Adjunta el PDF')
      return
    }
    try {
      await create.mutateAsync({
        file,
        input: {
          kind: values.kind,
          title: values.title,
          supplier: values.supplier || null,
          amountCents: values.amount ? parseEurosToCents(values.amount) : null,
          documentDate: values.documentDate,
        },
      })
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo" error={errors.kind?.message}>
          <NativeSelect {...form.register('kind')}>
            {(Object.keys(documentKindLabel) as DocumentKind[]).map((k) => (
              <option key={k} value={k}>
                {documentKindLabel[k]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Fecha" error={errors.documentDate?.message}>
          <Input type="date" {...form.register('documentDate')} />
        </FormField>
      </div>
      <FormField label="Título" error={errors.title?.message}>
        <Input
          placeholder="Por ejemplo: Limpieza de zonas comunes, octubre"
          {...form.register('title')}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Proveedor (opcional)" error={errors.supplier?.message}>
          <Input {...form.register('supplier')} />
        </FormField>
        <FormField label="Importe (opcional)" error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="1.250,00 €" {...form.register('amount')} />
        </FormField>
      </div>
      <FilePicker
        label="PDF"
        accept={['application/pdf']}
        file={file}
        onChange={(f) => {
          setFile(f)
          setFileError(null)
        }}
        hint="Máximo 10 MB."
      />
      {fileError && (
        <p role="alert" className="text-sm text-destructive">
          {fileError}
        </p>
      )}
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
          {isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : <FileUp aria-hidden />}
          Publicar
        </Button>
      </DialogFooter>
    </form>
  )
}

function DocumentsPanel({ communityId }: { communityId: string }) {
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<CommunityDocument | null>(null)
  const remove = useDeleteDocument(communityId)
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden /> Publicar documento
        </Button>
      </div>
      <DocumentsList communityId={communityId} onDelete={setDeleting} />
      <DocumentDialog open={creating} onOpenChange={setCreating} communityId={communityId} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar el documento?"
        description={<p>«{deleting?.title}» dejará de estar disponible para los vecinos.</p>}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          remove.mutateAsync({ id: deleting?.id ?? '', path: deleting?.file_path ?? '' })
        }
      />
    </>
  )
}

export function AdminFinancePage() {
  const { activeCommunity } = useAdmin()
  return (
    <>
      <PageHeader
        eyebrow="Economía"
        title="Recibos y documentos"
        description="Cada vivienda ve solo sus recibos. Las facturas y documentos de la comunidad los ven todos los vecinos."
      />
      <Tabs defaultValue="receipts">
        <TabsList className="mb-6">
          <TabsTrigger value="receipts">
            <ReceiptText aria-hidden /> Recibos
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText aria-hidden /> Documentos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="receipts">
          <ReceiptsPanel communityId={activeCommunity.id} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel communityId={activeCommunity.id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
