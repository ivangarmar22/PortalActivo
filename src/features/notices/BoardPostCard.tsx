import type { ReactNode } from 'react'
import { BoardStatusBadge } from '@/components/shared/StatusBadge'
import { formatRelative } from '@/lib/format'
import { boardCategoryLabel } from '@/lib/status'
import type { BoardPost } from '@/types/domain'

export function BoardPostCard({
  post,
  showStatus = false,
  actions,
}: {
  post: BoardPost
  showStatus?: boolean
  actions?: ReactNode
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">{boardCategoryLabel[post.category]}</span>
        {showStatus && <BoardStatusBadge status={post.status} />}
      </div>
      <h3 className="font-display text-lg leading-snug font-medium">{post.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed whitespace-pre-line">{post.body}</p>
      {post.moderation_note && post.status !== 'approved' && (
        <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs">
          <span className="font-medium">Nota de la administración:</span> {post.moderation_note}
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Vivienda {post.author_dwelling} · {formatRelative(post.created_at)}
      </p>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  )
}
