import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Marca de PortalActivo: un portal de latón con la casilla del voto dentro. */
function LogoMark({ className, title }: { className?: string; title?: string }) {
  // Identificadores únicos por instancia: varios logos en la misma página no comparten degradados.
  const id = `logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const ref = (name: string) => `url(#${id}-${name})`
  const opening = 'M19.5 52V30.5a12.5 12.5 0 0 1 25 0V52Z'

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-9 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#174548" />
          <stop offset="1" stopColor="#0a2123" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3de9a" />
          <stop offset=".5" stopColor="#cdac55" />
          <stop offset="1" stopColor="#94732a" />
        </linearGradient>
        <linearGradient id={`${id}-reveal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6a22" />
          <stop offset="1" stopColor="#5d4513" />
        </linearGradient>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081b1d" />
          <stop offset="1" stopColor="#123a3d" />
        </linearGradient>
        <linearGradient id={`${id}-check`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbefc8" />
          <stop offset="1" stopColor="#e6c76e" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#020c0d" floodOpacity=".5" />
        </filter>
        <clipPath id={`${id}-opening`}>
          <path d={opening} />
        </clipPath>
      </defs>
      {/* Azulejo de tinta con un filo de luz arriba */}
      <rect width="64" height="64" rx="15" fill={ref('tile')} />
      <rect
        x=".6"
        y=".6"
        width="62.8"
        height="62.8"
        rx="14.4"
        fill="none"
        stroke={ref('rim')}
        strokeWidth="1.2"
      />
      {/* Marco de latón */}
      <path d="M13 52V31a19 19 0 0 1 38 0v21Z" fill={ref('frame')} filter={ref('shadow')} />
      {/* Grosor del marco (derrame) y fondo del hueco, desplazado hacia dentro */}
      <path d={opening} fill={ref('reveal')} />
      <g clipPath={ref('opening')}>
        <path d="M22.3 61V33.6a12.5 12.5 0 0 1 25 0V61Z" fill={ref('depth')} />
      </g>
      {/* Casilla del voto, iluminada */}
      <path
        d="m26.6 40.6 4.3 4.3 8.2-9"
        fill="none"
        stroke={ref('check')}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({
  className,
  inverted = false,
  size = 'md',
}: {
  className?: string
  inverted?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'sm' ? 'size-8' : 'size-9'} />
      <span
        className={cn(
          'leading-none font-semibold tracking-tight',
          size === 'sm' ? 'text-base' : 'text-[1.125rem]',
          inverted ? 'text-ink-foreground' : 'text-foreground',
        )}
      >
        Portal
        <span
          className={cn(
            'font-display font-medium italic',
            inverted ? 'text-brass-bright' : 'text-brass-ink',
          )}
        >
          Activo
        </span>
      </span>
    </span>
  )
}

/** Escudo de la comunidad (logo propio si lo tiene; si no, sus iniciales). */
export function CommunityEmblem({
  name,
  logoUrl,
  className,
  tone = 'light',
}: {
  name: string
  logoUrl?: string | null
  className?: string
  tone?: 'light' | 'dark'
}) {
  const initials = name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
        tone === 'dark'
          ? 'bg-ink-raised ring-1 ring-ink-border'
          : 'bg-card shadow-card ring-1 ring-border',
        className,
      )}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={`Logo de ${name}`} className="size-[78%] object-contain" />
      ) : (
        <span className="font-display text-sm font-semibold text-brass-ink">{initials}</span>
      )}
    </span>
  )
}
