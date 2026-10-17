import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/shared/Logo'

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_60%)]">
      <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <Link to="/" className="inline-block rounded-md" aria-label="PortalActivo, inicio">
          <Logo />
        </Link>
      </header>
      <main
        id="contenido"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12 sm:px-6"
      >
        {children}
      </main>
    </div>
  )
}
