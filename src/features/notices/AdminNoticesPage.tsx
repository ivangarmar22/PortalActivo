import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarClock,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FilePicker } from '@/components/shared/FilePicker'
import { FormField } from '@/components/shared/FormField'
import { NativeSelect } from '@/components/shared/NativeSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Pill } from '@/components/shared/StatusBadge'
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
import { useMembers } from '@/features/members/queries'
import { BoardPostCard } from '@/features/notices/BoardPostCard'
import { NoticeCard } from '@/features/notices/NoticeCard'
import {
  useBoard,
  useDeleteNotice,
  useModerateBoardPost,
  useNotices,
  useSaveNotice,
} from '@/features/notices/queries'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/format'
import { noticeCategoryLabel } from '@/lib/status'
import { noticeSchema, type NoticeFormValues } from '@/schemas/forms'
import type { BoardPost, NoticeCategory, NoticeWithReads } from '@/types/domain'

function visibility(notice: NoticeWithReads) {
  const now = Date.now()
  if (new Date(notice.published_at).getTime() > now)
    return <Pill tone="info" icon={CalendarClock} label="Programado" />
  if (notice.expires_at && new Date(notice.expires_at).getTime() <= now)
    return <Pill tone="closed" icon={EyeOff} label="Caducado" />
  return <Pill tone="open" icon={Eye} label="Publicado" />
}

function defaultsFor(notice?: NoticeWithReads): NoticeFormValues {
  return {
    title: notice?.title ?? '',
    body: notice?.body ?? '',
    category: notice?.category ?? 'general',
    isUrgent: notice?.is_urgent ?? false,
    isPinned: notice?.is_pinned ?? false,
    publishedAt: toDateTimeLocalValue(notice?.published_at ?? new Date().toISOString()),
    expiresAt: notice?.expires_at ? toDateTimeLocalValue(notice.expires_at) : '',
  }
}

// Formulario montado dentro del diálogo: cada apertura empieza con el estado limpio.
function NoticeForm({
  onOpenChange,
  notice,
  communityId,
}: {
  onOpenChange: (open: boolean) => void
  notice?: NoticeWithReads
  communityId: string
}) {
  const save = useSaveNotice(communityId)
  const [file, setFile] = useState<File | null>(null)
  const [keepAttachment, setKeepAttachment] = useState(true)
  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: defaultsFor(notice),
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    const existing =
      notice?.attachment_path && notice.attachment_name && keepAttachment
        ? { path: notice.attachment_path, name: notice.attachment_name }
        : null
    try {
      await save.mutateAsync({
        noticeId: notice?.id,
        file,
        previousPath: notice?.attachment_path ?? null,
        input: {
          title: values.title,
          body: values.body,
          category: values.category,
          isUrgent: values.isUrgent,
          isPinned: values.isPinned,
          publishedAt: fromDateTimeLocalValue(values.publishedAt),
          expiresAt: values.expiresAt ? fromDateTimeLocalValue(values.expiresAt) : null,
          attachment: existing,
        },
      })
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormField label="Título" error={errors.title?.message}>
        <Input {...form.register('title')} />
      </FormField>
      <FormField label="Texto" error={errors.body?.message}>
        <Textarea rows={6} {...form.register('body')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Categoría" error={errors.category?.message}>
          <NativeSelect {...form.register('category')}>
            {(Object.keys(noticeCategoryLabel) as NoticeCategory[]).map((c) => (
              <option key={c} value={c}>
                {noticeCategoryLabel[c]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Publicar el" error={errors.publishedAt?.message}>
          <Input type="datetime-local" {...form.register('publishedAt')} />
        </FormField>
        <FormField label="Visible hasta (opcional)" error={errors.expiresAt?.message}>
          <Input type="datetime-local" {...form.register('expiresAt')} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['isUrgent', 'isPinned'] as const).map((name) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
                <Label htmlFor={`notice-${name}`}>
                  {name === 'isUrgent' ? 'Urgente' : 'Fijado arriba'}
                </Label>
                <Switch
                  id={`notice-${name}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        ))}
      </div>
      {notice?.attachment_name && keepAttachment && !file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="truncate">Adjunto: {notice.attachment_name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setKeepAttachment(false)}>
            <X aria-hidden /> Quitar
          </Button>
        </div>
      ) : (
        <FilePicker
          label="Adjunto (opcional)"
          accept={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
          file={file}
          onChange={setFile}
          hint="PDF o imagen, máximo 10 MB."
        />
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
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {notice ? 'Guardar cambios' : 'Publicar aviso'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function NoticeDialog({
  open,
  onOpenChange,
  notice,
  communityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  notice?: NoticeWithReads
  communityId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">
            {notice ? 'Editar aviso' : 'Nuevo aviso'}
          </DialogTitle>
          <DialogDescription>
            Lo verán todas las viviendas con acceso completo desde la fecha de publicación.
          </DialogDescription>
        </DialogHeader>
        <NoticeForm onOpenChange={onOpenChange} notice={notice} communityId={communityId} />
      </DialogContent>
    </Dialog>
  )
}

function NoticesPanel({ communityId }: { communityId: string }) {
  const notices = useNotices(communityId)
  const members = useMembers(communityId)
  const remove = useDeleteNotice(communityId)
  const [editing, setEditing] = useState<NoticeWithReads | 'new' | null>(null)
  const [deleting, setDeleting] = useState<NoticeWithReads | null>(null)
  const activeMembers = (members.data ?? []).filter((m) => m.is_active).length

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden /> Nuevo aviso
        </Button>
      </div>
      {notices.isPending ? (
        <ListSkeleton />
      ) : notices.isError ? (
        <ErrorState error={notices.error} onRetry={() => void notices.refetch()} />
      ) : notices.data.length === 0 ? (
        <EmptyState icon={Megaphone} title="Todavía no has publicado avisos" />
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {notices.data.map((notice) => (
            <li key={notice.id}>
              <NoticeCard
                notice={notice}
                meta={
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    {visibility(notice)}
                    <span className="text-muted-foreground">
                      Leído por {notice.notice_reads.length} de {activeMembers} viviendas
                    </span>
                  </div>
                }
                actions={
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(notice)}>
                      <Pencil aria-hidden /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(notice)}>
                      <Trash2 aria-hidden /> Eliminar
                    </Button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <NoticeDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        notice={editing === 'new' || editing === null ? undefined : editing}
        communityId={communityId}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar el aviso?"
        description={<p>«{deleting?.title}» dejará de verse y se borrará su adjunto.</p>}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() =>
          remove.mutateAsync({
            id: deleting?.id ?? '',
            attachmentPath: deleting?.attachment_path ?? null,
          })
        }
      />
    </>
  )
}

function ModerationPanel({ communityId }: { communityId: string }) {
  const board = useBoard(communityId)
  const moderate = useModerateBoardPost(communityId)
  const [rejecting, setRejecting] = useState<BoardPost | null>(null)
  const [note, setNote] = useState('')

  if (board.isPending) return <ListSkeleton />
  if (board.isError) return <ErrorState error={board.error} onRetry={() => void board.refetch()} />

  const pending = board.data.filter((p) => p.status === 'pending')
  const published = board.data.filter((p) => p.status === 'approved')

  return (
    <div className="space-y-8">
      <section aria-labelledby="pendientes">
        <h2
          id="pendientes"
          className="mb-3 flex items-center gap-2 font-display text-xl font-medium"
        >
          <Clock3 aria-hidden className="size-5 text-status-draft" /> Pendientes de revisión
          <span className="tabular text-base text-muted-foreground">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card/60 px-4 py-5 text-sm text-muted-foreground">
            No hay publicaciones esperando revisión.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pending.map((post) => (
              <li key={post.id}>
                <BoardPostCard
                  post={post}
                  actions={
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          moderate.mutate({ id: post.id, decision: 'approved', note: '' })
                        }
                      >
                        <Check aria-hidden /> Aprobar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNote('')
                          setRejecting(post)
                        }}
                      >
                        <X aria-hidden /> Rechazar
                      </Button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="publicadas">
        <h2 id="publicadas" className="mb-3 font-display text-xl font-medium">
          Publicadas{' '}
          <span className="tabular text-base text-muted-foreground">({published.length})</span>
        </h2>
        {published.length === 0 ? (
          <EmptyState icon={StickyNote} title="El tablón está vacío" />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {published.map((post) => (
              <li key={post.id}>
                <BoardPostCard
                  post={post}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        moderate.mutate({ id: post.id, decision: 'withdrawn', note: '' })
                      }
                    >
                      <Undo2 aria-hidden /> Retirar
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar publicación</DialogTitle>
            <DialogDescription>
              La vivienda {rejecting?.author_dwelling} verá el motivo.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Motivo">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por ejemplo: incluye datos personales de terceros"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={moderate.isPending}
              onClick={async () => {
                if (!rejecting) return
                try {
                  await moderate.mutateAsync({ id: rejecting.id, decision: 'rejected', note })
                  setRejecting(null)
                } catch {
                  // Notificado por la mutación.
                }
              }}
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AdminNoticesPage() {
  const { activeCommunity } = useAdmin()
  const board = useBoard(activeCommunity.id)
  const pending = (board.data ?? []).filter((p) => p.status === 'pending').length
  return (
    <>
      <PageHeader
        eyebrow="Comunicación"
        title="Avisos y tablón"
        description="Publica avisos oficiales y revisa lo que los vecinos quieren compartir en el tablón."
      />
      <Tabs defaultValue="notices">
        <TabsList className="mb-6">
          <TabsTrigger value="notices">
            <Megaphone aria-hidden /> Avisos
          </TabsTrigger>
          <TabsTrigger value="board">
            <StickyNote aria-hidden /> Tablón
            {pending > 0 && (
              <span className="tabular rounded-full bg-brass px-1.5 text-xs font-semibold text-white">
                {pending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notices">
          <NoticesPanel communityId={activeCommunity.id} />
        </TabsContent>
        <TabsContent value="board">
          <ModerationPanel communityId={activeCommunity.id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
