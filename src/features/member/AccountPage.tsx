import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { CommunityEmblem } from '@/components/shared/Logo'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth, useMember } from '@/features/auth/useAuth'
import { errorMessage } from '@/lib/errors'
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/forms'
import { authService } from '@/services/authService'

export function AccountPage() {
  const { membership } = useMember()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: '', password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await authService.memberChangePassword(values.current, values.password)
      form.reset()
      toast.success('Contraseña cambiada')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title={membership.full_name}
        description={`Vivienda ${membership.dwelling_label}`}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          onSubmit={submit}
          noValidate
          className="grid content-start gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6"
        >
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-medium">
              <KeyRound aria-hidden className="size-5 text-brass-ink" /> Cambiar contraseña
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Si la olvidas, pide un PIN nuevo a la administración y créala de nuevo.
            </p>
          </div>
          <FormField label="Contraseña actual" error={errors.current?.message}>
            <Input type="password" autoComplete="current-password" {...form.register('current')} />
          </FormField>
          <FormField
            label="Contraseña nueva"
            hint="Mínimo 8 caracteres."
            error={errors.password?.message}
          >
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </FormField>
          <FormField label="Repite la contraseña nueva" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
          </FormField>
          <Button type="submit" className="justify-self-start" disabled={isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
            Guardar contraseña
          </Button>
        </form>

        <aside className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-card">
            <CommunityEmblem
              name={membership.community_name}
              logoUrl={membership.community_logo_url}
            />
            <div>
              <p className="eyebrow">Comunidad</p>
              <p className="font-display text-lg leading-tight">{membership.community_name}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await signOut()
              void navigate('/acceso')
            }}
          >
            <LogOut aria-hidden /> Cerrar sesión
          </Button>
        </aside>
      </div>
    </>
  )
}
