import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/layouts/PublicLayout'

export function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-sm font-medium text-primary">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold">Esta página no existe</h1>
        <p className="mt-2 text-muted-foreground">Comprueba la dirección o vuelve al inicio.</p>
        <Button asChild className="mt-6">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </PublicLayout>
  )
}
