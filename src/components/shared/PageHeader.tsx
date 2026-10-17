import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Cabecera de página con antetítulo, título, descripción y acciones. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-7', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="eyebrow mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div>
          )}
          <h1 className="font-display text-[1.75rem] leading-[1.15] font-medium break-words sm:text-[2rem]">
            {title}
          </h1>
          {description && <div className="mt-2 max-w-2xl text-muted-foreground">{description}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
        )}
      </div>
      <div className="hairline mt-5" aria-hidden />
    </header>
  )
}

/** Sección con titular pequeño y acción opcional. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  const headingId = id ? `${id}-titulo` : undefined
  return (
    <section aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <div className="mb-3 flex min-h-11 items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-xl leading-tight font-medium">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

/** Cifra destacada con etiqueta. */
export function Metric({
  label,
  value,
  detail,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'default' | 'attention' | 'ink'
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-4 sm:p-5',
        tone === 'ink' ? 'ink-panel shadow-raised' : 'border border-border/80 bg-card shadow-card',
        tone === 'attention' && 'border-brass/40 bg-brass-soft/60',
        className,
      )}
    >
      <p className={cn('text-sm', tone === 'ink' ? 'text-ink-muted' : 'text-muted-foreground')}>
        {label}
      </p>
      <p className="font-display mt-1 text-[2.25rem] leading-none font-medium tracking-tight">
        {value}
      </p>
      {detail && (
        <p
          className={cn(
            'mt-2 text-xs',
            tone === 'ink' ? 'text-ink-muted' : 'text-muted-foreground',
          )}
        >
          {detail}
        </p>
      )}
    </div>
  )
}
