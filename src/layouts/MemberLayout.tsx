import {
  CalendarCheck2,
  Ellipsis,
  Home,
  LogOut,
  Megaphone,
  ReceiptText,
  UserRound,
  Vote,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { CommunityEmblem, Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth, useMember } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

interface Item {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Etiqueta corta para la barra de secciones en tableta, donde no caben las largas. */
  short?: string
}

const primary: Item[] = [
  { to: '/portal', label: 'Inicio', icon: Home, end: true },
  { to: '/portal/votaciones', label: 'Votaciones', icon: Vote },
  { to: '/portal/incidencias', label: 'Incidencias', icon: Wrench },
  { to: '/portal/reservas', label: 'Reservas', icon: CalendarCheck2 },
]
const secondary: Item[] = [
  { to: '/portal/avisos', label: 'Avisos y tablón', short: 'Avisos', icon: Megaphone },
  { to: '/portal/recibos', label: 'Recibos y documentos', short: 'Recibos', icon: ReceiptText },
  { to: '/portal/cuenta', label: 'Mi cuenta', icon: UserRound },
]

export function MemberLayout() {
  const { membership } = useMember()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const full = membership.access_scope === 'full'
  const inSecondary = secondary.some((item) => location.pathname.startsWith(item.to))

  async function handleSignOut() {
    await signOut()
    void navigate('/acceso')
  }

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col',
        full && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0',
      )}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to={full ? '/portal' : '/portal/votaciones'}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
          >
            <CommunityEmblem
              name={membership.community_name}
              logoUrl={membership.community_logo_url}
              className="size-10 rounded-xl"
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-[1.05rem] leading-tight font-medium">
                {membership.community_name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Vivienda {membership.dwelling_label}
                {!full && ' · Acceso para votar'}
              </span>
            </span>
          </Link>

          {full ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                'hidden md:inline-flex',
                location.pathname.startsWith('/portal/cuenta') &&
                  'bg-ink text-ink-foreground hover:bg-ink hover:text-ink-foreground',
              )}
              aria-label="Mi cuenta"
            >
              <Link
                to="/portal/cuenta"
                aria-current={location.pathname.startsWith('/portal/cuenta') ? 'page' : undefined}
              >
                <UserRound aria-hidden />
              </Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={cn(full && 'hidden md:inline-flex')}
          >
            <LogOut aria-hidden />
            <span className="max-sm:sr-only">Salir</span>
          </Button>
        </div>
        {full && (
          <nav aria-label="Secciones" className="hidden border-t border-border/70 md:block">
            <div className="no-scrollbar mx-auto flex max-w-5xl scroll-px-6 gap-1 overflow-x-auto px-6 py-2">
              {[...primary, ...secondary.slice(0, 2)].map(
                ({ to, label, short, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-ink text-ink-foreground'
                          : 'text-muted-foreground hover:bg-sunken hover:text-foreground',
                      )
                    }
                  >
                    <Icon aria-hidden className="size-4" />
                    <span className="lg:hidden">{short ?? label}</span>
                    <span className="max-lg:hidden">{label}</span>
                  </NavLink>
                ),
              )}
            </div>
          </nav>
        )}
      </header>

      {!full && (
        <div className="border-b border-brass/25 bg-brass-soft/70">
          <p className="mx-auto max-w-5xl px-4 py-2.5 text-sm text-brass-ink sm:px-6">
            Has entrado solo para votar. Para ver incidencias, reservas, avisos y recibos,{' '}
            <Link
              to="/acceso"
              onClick={() => void signOut()}
              className="font-medium underline underline-offset-4"
            >
              entra con tu DNI y contraseña
            </Link>
            .
          </p>
        </div>
      )}

      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mx-auto hidden w-full max-w-5xl items-center justify-between px-6 pb-8 text-xs text-muted-foreground md:flex">
        <Logo size="sm" />
        <span>Portal de la comunidad · {membership.community_name}</span>
      </footer>

      {full && (
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-border bg-ink pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {primary.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
                      isActive ? 'text-brass-bright' : 'text-ink-muted hover:text-ink-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                          isActive && 'bg-ink-raised',
                        )}
                      >
                        <Icon aria-hidden className="size-[1.15rem]" />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  'flex h-[4.25rem] w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium',
                  inSecondary ? 'text-brass-bright' : 'text-ink-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full',
                    inSecondary && 'bg-ink-raised',
                  )}
                >
                  <Ellipsis aria-hidden className="size-[1.15rem]" />
                </span>
                Más
              </button>
            </li>
          </ul>
        </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-xl font-medium">Más secciones</SheetTitle>
            <SheetDescription>Vivienda {membership.dwelling_label}</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-1 gap-1 px-4">
            {secondary.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3.5 font-medium',
                      isActive ? 'bg-sunken' : 'hover:bg-sunken',
                    )
                  }
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brass-soft text-brass-ink">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 font-medium text-destructive hover:bg-status-danger-bg/60"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-status-danger-bg">
                  <LogOut aria-hidden className="size-4" />
                </span>
                Cerrar sesión
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  )
}
