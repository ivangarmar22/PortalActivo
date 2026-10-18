import {
  CalendarCheck2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ReceiptText,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { CommunityEmblem } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAdminCounters } from '@/features/admin/queries'
import { useAdmin, useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

function useNavGroups(communityId: string): { label: string; items: NavItem[] }[] {
  const counters = useAdminCounters(communityId)
  return [
    {
      label: 'General',
      items: [{ to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true }],
    },
    {
      label: 'Gobierno',
      items: [{ to: '/admin/reuniones', label: 'Juntas y votaciones', icon: CalendarDays }],
    },
    {
      label: 'Vida en comunidad',
      items: [
        {
          to: '/admin/incidencias',
          label: 'Incidencias',
          icon: Wrench,
          badge: counters.data?.newIncidents,
        },
        { to: '/admin/reservas', label: 'Reservas', icon: CalendarCheck2 },
        {
          to: '/admin/avisos',
          label: 'Avisos y tablón',
          icon: Megaphone,
          badge: counters.data?.pendingPosts,
        },
      ],
    },
    {
      label: 'Economía',
      items: [{ to: '/admin/economia', label: 'Recibos y documentos', icon: ReceiptText }],
    },
    {
      label: 'Administración',
      items: [{ to: '/admin/censo', label: 'Vecinos', icon: Users }],
    },
  ]
}

function SidebarContent({
  onNavigate,
  closeButton,
}: {
  onNavigate?: () => void
  /** En el menú de móvil, el botón de cerrar va en la fila de la comunidad, centrado. */
  closeButton?: ReactNode
}) {
  const admin = useAdmin()
  const { signOut, setActiveCommunity } = useAuth()
  const navigate = useNavigate()
  const groups = useNavGroups(admin.activeCommunity.id)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  // En pantallas bajas el menú se desplaza: la sección activa siempre queda a la vista.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [location.pathname])

  return (
    <div className="ink-panel flex h-full flex-col">
      <div className="mx-3 mt-5 mb-5 rounded-2xl border border-ink-border bg-ink-raised/70 p-3">
        <div className="flex items-center gap-3">
          <CommunityEmblem
            name={admin.activeCommunity.name}
            logoUrl={admin.activeCommunity.logo_url}
            tone="dark"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-brass-bright uppercase">
              Comunidad
            </p>
            <p className="line-clamp-2 font-display text-[1.05rem] leading-tight text-ink-foreground">
              {admin.activeCommunity.name}
            </p>
          </div>
          {closeButton}
        </div>
        {admin.communities.length > 1 && (
          <Select
            value={admin.activeCommunity.id}
            onValueChange={(id) => {
              setActiveCommunity(id)
              void navigate('/admin')
              onNavigate?.()
            }}
          >
            <SelectTrigger
              aria-label="Cambiar de comunidad"
              className="mt-3 w-full border-ink-border bg-ink text-ink-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {admin.communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <nav
        ref={navRef}
        aria-label="Administración"
        className="flex-1 space-y-4 overflow-y-auto px-3 pt-1 pb-4 [mask-image:linear-gradient(to_bottom,black,black_calc(100%-20px),transparent)]"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-muted/80 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex min-h-9 items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors pointer-coarse:min-h-11',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-bright',
                        isActive
                          ? 'bg-ink-raised text-ink-foreground shadow-[inset_0_0_0_1px_var(--ink-border)]'
                          : 'text-ink-foreground/75 hover:bg-ink-raised/60 hover:text-ink-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            'absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-brass-bright transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <Icon
                          aria-hidden
                          className={cn('size-4', isActive && 'text-brass-bright')}
                        />
                        <span className="flex-1">{label}</span>
                        {badge ? (
                          <span className="tabular min-w-5 rounded-full bg-brass-bright px-1.5 text-center text-xs font-semibold text-ink">
                            {badge}
                            <span className="sr-only"> pendientes</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-ink-border py-3.5 pr-2.5 pl-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass-bright font-display text-base font-semibold text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
        >
          {admin.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium text-ink-foreground">
            {admin.displayName}
          </p>
          <p className="truncate text-xs text-ink-muted" title={admin.email}>
            {admin.email}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              className="shrink-0 text-ink-muted hover:bg-ink-raised hover:text-ink-foreground"
              onClick={async () => {
                await signOut()
                void navigate('/admin/login')
              }}
            >
              <LogOut aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            Cerrar sesión
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const admin = useAdmin()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <CommunityEmblem
            name={admin.activeCommunity.name}
            logoUrl={admin.activeCommunity.logo_url}
            className="size-9 rounded-lg"
          />
          <div className="min-w-0">
            <p className="eyebrow leading-none">Administración</p>
            <p className="truncate font-display text-base leading-tight">
              {admin.activeCommunity.name}
            </p>
          </div>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Abrir menú">
              <Menu aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-76 border-0 p-0">
            <SheetTitle className="sr-only">Menú de administración</SheetTitle>
            <SheetDescription className="sr-only">{admin.activeCommunity.name}</SheetDescription>
            <SidebarContent
              onNavigate={() => setMenuOpen(false)}
              closeButton={
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cerrar menú"
                    className="-mr-1 shrink-0 self-center text-ink-muted hover:bg-ink hover:text-ink-foreground"
                  >
                    <X aria-hidden />
                  </Button>
                </SheetClose>
              }
            />
          </SheetContent>
        </Sheet>
      </header>

      <main id="contenido" className="min-w-0 px-4 py-6 sm:px-6 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
