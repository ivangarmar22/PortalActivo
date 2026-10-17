import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/shared/Logo'
import { cn } from '@/lib/utils'

/**
 * «Volver» de las pantallas de acceso. Si se llegó desde una página pública que lo indica
 * (`state.backTo`), vuelve atrás en el historial; si no (enlace directo, tras cerrar sesión o
 * tras una redirección desde una zona privada), va a la portada para no rebotar en una guarda.
 */
function useBack(): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { backTo?: string } | null)?.backTo
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
  return () => {
    if (backTo && idx > 0) void navigate(-1)
    else void navigate(backTo ?? '/')
  }
}

function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group -ml-2.5 inline-flex min-h-11 items-center gap-2 rounded-full pr-4 pl-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-raised hover:text-ink-foreground',
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-full ring-1 ring-ink-border transition-colors group-hover:ring-brass-bright/60">
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
      </span>
      Volver
    </button>
  )
}

/**
 * Pantallas de acceso: panel de marca en tinta (escritorio) y formulario sobre papel.
 * En móvil y tableta el panel se reduce a una cabecera compacta.
 * `onBack` sustituye al «Volver» por defecto cuando la pantalla tiene pasos internos.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  aside,
  onBack,
  children,
}: {
  eyebrow: string
  title: ReactNode
  intro: ReactNode
  aside?: ReactNode
  onBack?: () => void
  children: ReactNode
}) {
  const back = useBack()
  const handleBack = onBack ?? back

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="ink-panel relative hidden flex-col justify-between overflow-hidden p-12 pt-8 lg:flex">
        <div className="flex flex-col items-start gap-10">
          <BackButton onClick={handleBack} />
          <Link to="/" className="w-fit rounded-lg" aria-label="PortalActivo, inicio">
            <Logo inverted />
          </Link>
        </div>
        <div className="max-w-md">
          <p className="mb-4 text-[0.6875rem] font-semibold tracking-[0.16em] text-brass-bright uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.08] font-medium text-ink-foreground">
            {title}
          </h1>
          <div className="mt-5 text-[1.0625rem] leading-relaxed text-ink-muted">{intro}</div>
        </div>
        <div className="text-sm text-ink-muted">{aside}</div>
      </aside>

      <main id="contenido" className="flex min-h-dvh flex-col bg-background lg:min-h-0">
        <div className="ink-panel px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-7 sm:px-8 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <BackButton onClick={handleBack} />
            <Link to="/" className="rounded-lg" aria-label="PortalActivo, inicio">
              <Logo inverted size="sm" />
            </Link>
          </div>
          <p className="mt-5 text-[0.6875rem] font-semibold tracking-[0.16em] text-brass-bright uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-[1.75rem] leading-tight font-medium text-ink-foreground sm:text-[2rem]">
            {title}
          </h1>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  )
}
