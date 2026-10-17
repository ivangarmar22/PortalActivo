import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Megaphone, PenLine, StickyNote, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField } from '@/components/shared/FormField'
import { NativeSelect } from '@/components/shared/NativeSelect'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useMember } from '@/features/auth/useAuth'
import { BoardPostCard } from '@/features/notices/BoardPostCard'
import { NoticeCard } from '@/features/notices/NoticeCard'
import {
  useBoard,
  useCreateBoardPost,
  useMarkNoticeRead,
  useNotices,
  useWithdrawBoardPost,
} from '@/features/notices/queries'
import { boardCategoryLabel } from '@/lib/status'
import { boardPostSchema, type BoardPostValues } from '@/schemas/forms'
import type { BoardCategory } from '@/types/domain'

function NoticesList() {
  const { membership } = useMember()
  const notices = useNotices(membership.community_id)
  const markRead = useMarkNoticeRead(membership.community_id)

  if (notices.isPending) return <ListSkeleton />
  if (notices.isError)
    return <ErrorState error={notices.error} onRetry={() => void notices.refetch()} />
  if (notices.data.length === 0)
    return <EmptyState icon={Megaphone} title="No hay avisos publicados" />

  return (
    <ul className="grid grid-cols-1 gap-3">
      {notices.data.map((notice) => {
        const unread = !notice.notice_reads.some((r) => r.member_id === membership.member_id)
        return (
          <li key={notice.id}>
            <NoticeCard
              notice={notice}
              unread={unread}
              onOpen={() => unread && markRead.mutate(notice.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}

function NewPostDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { membership } = useMember()
  const create = useCreateBoardPost(membership.community_id)
  const form = useForm<BoardPostValues>({
    resolver: zodResolver(boardPostSchema),
    defaultValues: { title: '', body: '', category: 'announcement' },
  })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (open) form.reset({ title: '', body: '', category: 'announcement' })
  }, [open, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values)
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">
            Publicar en el tablón
          </DialogTitle>
          <DialogDescription>
            La administración la revisará antes de publicarla. Aparecerá firmada con tu vivienda; no
            incluyas datos personales de otras personas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField label="Tipo" error={errors.category?.message}>
            <NativeSelect {...form.register('category')}>
              {(Object.keys(boardCategoryLabel) as BoardCategory[]).map((c) => (
                <option key={c} value={c}>
                  {boardCategoryLabel[c]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Título" error={errors.title?.message}>
            <Input {...form.register('title')} />
          </FormField>
          <FormField label="Texto" error={errors.body?.message}>
            <Textarea rows={5} {...form.register('body')} />
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
              Enviar a revisión
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Board() {
  const { membership } = useMember()
  const board = useBoard(membership.community_id)
  const withdraw = useWithdrawBoardPost(membership.community_id)
  const [writing, setWriting] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  const mine = (board.data ?? []).filter(
    (p) => p.member_id === membership.member_id && p.status !== 'withdrawn',
  )
  const published = (board.data ?? []).filter((p) => p.status === 'approved')

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-brass/30 bg-brass-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Objetos perdidos, compraventa, recomendaciones… Las publicaciones se ven cuando la
          administración las aprueba.
        </p>
        <Button onClick={() => setWriting(true)} className="shrink-0">
          <PenLine aria-hidden /> Nueva publicación
        </Button>
      </div>

      {board.isPending ? (
        <ListSkeleton />
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      ) : (
        <>
          {mine.some((p) => p.status !== 'approved') && (
            <section aria-labelledby="mis-publicaciones">
              <h2 id="mis-publicaciones" className="eyebrow mb-3">
                Mis publicaciones en revisión
              </h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mine
                  .filter((p) => p.status !== 'approved')
                  .map((post) => (
                    <li key={post.id}>
                      <BoardPostCard
                        post={post}
                        showStatus
                        actions={
                          post.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWithdrawing(post.id)}
                            >
                              <Undo2 aria-hidden /> Retirar
                            </Button>
                          )
                        }
                      />
                    </li>
                  ))}
              </ul>
            </section>
          )}
          {published.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title="El tablón está vacío"
              description="Sé el primero en publicar algo útil para tus vecinos."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {published.map((post) => (
                <li key={post.id}>
                  <BoardPostCard
                    post={post}
                    actions={
                      post.member_id === membership.member_id && (
                        <Button variant="ghost" size="sm" onClick={() => setWithdrawing(post.id)}>
                          <Undo2 aria-hidden /> Retirar mi publicación
                        </Button>
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <NewPostDialog open={writing} onOpenChange={setWriting} />
      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => !open && setWithdrawing(null)}
        title="¿Retirar la publicación?"
        description={<p>Dejará de verse en el tablón.</p>}
        confirmLabel="Retirar"
        onConfirm={() => withdraw.mutateAsync(withdrawing ?? '')}
      />
    </div>
  )
}

export function MemberNoticesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Comunicación"
        title="Avisos y tablón"
        description="Los avisos oficiales de la administración y el tablón de los vecinos."
      />
      <Tabs defaultValue="notices">
        <TabsList className="mb-6">
          <TabsTrigger value="notices">
            <Megaphone aria-hidden /> Avisos
          </TabsTrigger>
          <TabsTrigger value="board">
            <StickyNote aria-hidden /> Tablón vecinal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notices">
          <NoticesList />
        </TabsContent>
        <TabsContent value="board">
          <Board />
        </TabsContent>
      </Tabs>
    </>
  )
}
