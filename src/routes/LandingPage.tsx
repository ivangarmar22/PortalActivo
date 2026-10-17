import {
  ArrowRight,
  CalendarCheck2,
  KeyRound,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  Vote,
  Wrench,
} from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Logo } from '@/components/shared/Logo'
import { useAuth } from '@/features/auth/useAuth'

const features = [
  {
    icon: Wrench,
    title: 'Incidencias en tiempo real',
    text: 'Quién se encarga y en qué estado está cada avería.',
  },
  {
    icon: CalendarCheck2,
    title: 'Reservas de zonas comunes',
    text: 'Barbacoa, pádel o salón sin dobles reservas.',
  },
  {
    icon: Megaphone,
    title: 'Avisos y tablón',
    text: 'Comunicados oficiales y anuncios entre vecinos.',
  },
  {
    icon: ReceiptText,
    title: 'Recibos y cuentas',
    text: 'Tus recibos y las facturas de la comunidad.',
  },
  {
    icon: Vote,
    title: 'Juntas y votaciones',
    text: 'Vota cada punto desde el móvil mientras esté abierto.',
  },
]

export function LandingPage() {
  const { state } = useAuth()
  if (state.status === 'admin') return <Navigate to="/admin" replace />
  if (state.status === 'member') {
    return (
      <Navigate
        to={state.membership.access_scope === 'full' ? '/portal' : '/portal/votaciones'}
        replace
      />
    )
  }

  return (
    <div className="min-h-dvh">
      <section className="ink-panel">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:pb-24">
          <header className="flex items-center">
            <Logo inverted />
          </header>
          <div className="mt-14 max-w-3xl lg:mt-20">
            <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brass-bright uppercase">
              Portal de comunidades de propietarios
            </p>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.04] font-medium text-ink-foreground sm:text-[3.6rem]">
              La vida de tu comunidad, <em className="text-brass-bright">en un solo lugar</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              Incidencias, reservas, avisos, recibos y votaciones. Claro para los vecinos, ágil para
              la administración.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/acceso"
                state={{ backTo: '/' }}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brass-bright px-6 text-base font-semibold text-ink transition hover:bg-brass-bright/90"
              >
                <KeyRound aria-hidden className="size-4" /> Entrar como vecino
                <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/admin/login"
                state={{ backTo: '/' }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-ink-border bg-ink-raised px-6 text-base font-medium text-ink-foreground transition hover:bg-ink-raised/70"
              >
                <ShieldCheck aria-hidden className="size-4" /> Soy administrador
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main id="contenido" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brass-soft text-brass-ink ring-1 ring-brass/20">
                <Icon aria-hidden className="size-[1.15rem]" />
              </span>
              <h2 className="mt-4 font-display text-lg leading-snug font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
