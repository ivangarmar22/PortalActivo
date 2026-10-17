import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { FormField } from '@/components/shared/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/useAuth'
import { AuthShell } from '@/layouts/AuthShell'
import { errorMessage } from '@/lib/errors'
import { adminLoginSchema, type AdminLoginValues } from '@/schemas/forms'
import { authService } from '@/services/authService'

export function AdminLoginPage() {
  const { state, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (state.status === 'admin') return <Navigate to="/admin" replace />

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await authService.adminSignIn(values.email, values.password)
      await refresh()
      const from = (location.state as { from?: string } | null)?.from
      void navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
    } catch (error) {
      setSubmitError(errorMessage(error))
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <AuthShell
      eyebrow="Administración"
      title="Gestiona tu comunidad con criterio"
      intro="Juntas y votaciones, incidencias, reservas, avisos y recibos en un mismo panel, con permisos comprobados en el servidor."
    >
      <div>
        <h2 className="font-display text-2xl font-medium">Acceso de administración</h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Entra con tu email y tu contraseña.
        </p>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {submitError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <FormField label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="username"
              className="h-11 text-base"
              {...form.register('email')}
            />
          </FormField>
          <FormField label="Contraseña" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              className="h-11 text-base"
              {...form.register('password')}
            />
          </FormField>
          <Button type="submit" size="lg" className="h-12 text-base" disabled={isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
            Entrar
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
