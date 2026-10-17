import { AlertTriangle, ChevronDown, Paperclip, Pin } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRelative } from '@/lib/format'
import { noticeCategoryLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import { downloadFile } from '@/services/fileService'
import type { Notice } from '@/types/domain'

/** Aviso desplegable. `unread` muestra el punto de no leído; `onOpen` se llama al desplegarlo. */
export function NoticeCard({
  notice,
  unread = false,
  onOpen,
  meta,
  actions,
  defaultOpen = false,
}: {
  notice: Notice
  unread?: boolean
  onOpen?: () => void
  meta?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = `aviso-${notice.id}`

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card shadow-card',
        notice.is_urgent ? 'border-status-danger/30' : 'border-border/80',
      )}
    >
      {notice.is_urgent && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-status-danger" />
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setOpen((v) => !v)
          if (!open) onOpen?.()
        }}
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
            {notice.is_urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-danger-bg px-2 py-0.5 font-semibold text-status-danger">
                <AlertTriangle aria-hidden className="size-3.5" /> Urgente
              </span>
            )}
            {notice.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-0.5 font-medium text-brass-ink">
                <Pin aria-hidden className="size-3.5" /> Fijado
              </span>
            )}
            <span className="eyebrow">{noticeCategoryLabel[notice.category]}</span>
            <span className="text-muted-foreground">· {formatRelative(notice.published_at)}</span>
          </div>
          <h3 className="flex items-center gap-2 font-display text-lg leading-snug font-medium">
            {unread && (
              <span
                className="size-2 shrink-0 rounded-full bg-brass"
                aria-label="No leído"
                role="img"
              />
            )}
            {notice.title}
          </h3>
          {!open && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notice.body}</p>
          )}
        </div>
        <ChevronDown
          aria-hidden
          className={cn(
            'mt-1 size-5 shrink-0 text-muted-foreground transition',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div id={bodyId} className="border-t px-4 pt-4 pb-5 sm:px-5">
          <p className="leading-relaxed whitespace-pre-line">{notice.body}</p>
          {notice.attachment_path && notice.attachment_name && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                void downloadFile(
                  notice.attachment_path as string,
                  notice.attachment_name as string,
                )
              }
            >
              <Paperclip aria-hidden /> {notice.attachment_name}
            </Button>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Publicado el {formatDateTime(notice.published_at)}
            {notice.expires_at && ` · Visible hasta el ${formatDateTime(notice.expires_at)}`}
          </p>
          {meta}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </article>
  )
}
