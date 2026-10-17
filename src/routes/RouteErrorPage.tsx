import { Link, useRouteError } from 'react-router'
import { ErrorState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'

export function RouteErrorPage() {
  const error = useRouteError()
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState error={error} onRetry={() => window.location.reload()} />
      <div className="mt-4 text-center">
        <Button asChild variant="link">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
