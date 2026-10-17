import { Loader2 } from 'lucide-react'

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Loader2 aria-hidden className="size-6 animate-spin text-primary" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
