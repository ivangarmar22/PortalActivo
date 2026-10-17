import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, LockKeyhole, Vote } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { FormField } from '@/components/shared/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import { AuthShell } from '@/layouts/AuthShell'
import { errorMessage } from '@/lib/errors'
import {
  memberActivateSchema,
  memberPasswordLoginSchema,
  memberVoteLoginSchema,
  type MemberActivateInput,
  type MemberActivateValues,
  type MemberPasswordLoginInput,
  type MemberPasswordLoginValues,
  type MemberVoteLoginValues,
} from '@/schemas/forms'
import { authService } from '@/services/authService'

const inputClass = 'h-11 text-base'

function SubmitError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
      {pending && <Loader2 aria-hidden className="animate-spin" />}
      {children}
    </Button>
  )
}

/** Acceso completo: DNI + contraseña. */
function PasswordForm({
  onDone,
  onFirstAccess,
}: {
  onDone: () => Promise<void>
  onFirstAccess: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<MemberPasswordLoginInput, unknown, MemberPasswordLoginValues>({
    resolver: zodResolver(memberPasswordLoginSchema),
    defaultValues: { dni: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await authService.memberPasswordSignIn(values.dni, values.password)
      await onDone()
    } catch (e) {
      setError(errorMessage(e))
      form.setValue('password', '')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <SubmitError message={error} />
      <FormField label="DNI o NIE" error={errors.dni?.message}>
        <Input
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClass} uppercase`}
          {...form.register('dni')}
        />
      </FormField>
      <FormField label="Contraseña" error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          {...form.register('password')}
        />
      </FormField>
      <SubmitButton pending={isSubmitting}>Entrar</SubmitButton>
      <div className="rounded-xl border border-dashed border-brass/40 bg-brass-soft/50 p-4 text-sm">
        <p className="font-medium">¿Es tu primer acceso?</p>
        <p className="mt-0.5 text-muted-foreground">
          Usa el PIN que te ha entregado la administración para crear tu contraseña.
        </p>
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto min-h-11 p-0 text-brass-ink has-[>svg]:px-0"
          onClick={onFirstAccess}
        >
          <KeyRound aria-hidden /> Crear mi contraseña
        </Button>
      </div>
    </form>
  )
}

/** Primer acceso: DNI + PIN y contraseña nueva. */
function ActivateForm({ onDone }: { onDone: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<MemberActivateInput, unknown, MemberActivateValues>({
    resolver: zodResolver(memberActivateSchema),
    defaultValues: { dni: '', pin: '', password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await authService.memberActivate(values.dni, values.pin, values.password)
      await onDone()
    } catch (e) {
      setError(errorMessage(e))
      form.setValue('pin', '')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div>
        <h2 className="font-display text-xl font-medium">Crea tu contraseña</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo la primera vez. Después entrarás con tu DNI y esta contraseña. La administración no
          la conoce.
        </p>
      </div>
      <SubmitError message={error} />
      <FormField label="DNI o NIE" error={errors.dni?.message}>
        <Input
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClass} uppercase`}
          {...form.register('dni')}
        />
      </FormField>
      <FormField label="PIN de la administración" error={errors.pin?.message}>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={`${inputClass} tracking-[0.4em]`}
          {...form.register('pin')}
        />
      </FormField>
      <FormField
        label="Contraseña nueva"
        hint="Mínimo 8 caracteres."
        error={errors.password?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...form.register('password')}
        />
      </FormField>
      <FormField label="Repite la contraseña" error={errors.confirm?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...form.register('confirm')}
        />
      </FormField>
      <SubmitButton pending={isSubmitting}>Crear contraseña y entrar</SubmitButton>
    </form>
  )
}

/** Solo votación: solo se valida el PIN; el resto solo tiene que estar relleno. */
function VoteForm({ onDone }: { onDone: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<MemberVoteLoginValues>({
    resolver: zodResolver(memberVoteLoginSchema),
    defaultValues: { fullName: '', dni: '', dwelling: '', pin: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await authService.memberVoteSignIn(values)
      await onDone()
    } catch (e) {
      setError(errorMessage(e))
      form.setValue('pin', '')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Acceso rápido para votar en la junta. Solo verás las votaciones.
      </p>
      <SubmitError message={error} />
      <FormField label="Nombre y apellidos" error={errors.fullName?.message}>
        <Input autoComplete="name" className={inputClass} {...form.register('fullName')} />
      </FormField>
      <FormField label="DNI o NIE" error={errors.dni?.message}>
        <Input
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClass} uppercase`}
          {...form.register('dni')}
        />
      </FormField>
      <FormField
        label="Piso o vivienda"
        hint="Por ejemplo: 3º B, Ático, Local 1"
        error={errors.dwelling?.message}
      >
        <Input autoComplete="off" className={inputClass} {...form.register('dwelling')} />
      </FormField>
      <FormField label="PIN de acceso" error={errors.pin?.message}>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={`${inputClass} tracking-[0.4em]`}
          {...form.register('pin')}
        />
      </FormField>
      <SubmitButton pending={isSubmitting}>Entrar a votar</SubmitButton>
    </form>
  )
}

export function ParticipantLoginPage() {
  const { state, refresh } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'full' | 'vote'>('full')
  const [activating, setActivating] = useState(false)

  if (state.status === 'member') {
    return (
      <Navigate
        to={state.membership.access_scope === 'full' ? '/portal' : '/portal/votaciones'}
        replace
      />
    )
  }

  const done = (target: string) => async () => {
    await refresh()
    void navigate(target, { replace: true })
  }

  return (
    <AuthShell
      eyebrow="Portal de vecinos"
      title={
        <>
          Tu comunidad, <em className="text-brass-bright not-italic lg:italic">al día</em>
        </>
      }
      intro="Sigue las incidencias en tiempo real, reserva las zonas comunes, consulta avisos y recibos y vota en las juntas."
      // En el paso «Crea tu contraseña», «Volver» regresa al formulario de acceso.
      onBack={activating ? () => setActivating(false) : undefined}
      aside={
        <span className="flex items-center gap-2">
          <LockKeyhole aria-hidden className="size-4" /> Tu DNI solo lo ve la administración de tu
          comunidad.
        </span>
      }
    >
      {state.status === 'admin' && (
        <Alert role="status" className="mb-4">
          <AlertDescription>
            Tienes abierta una sesión de administración en este navegador. Ciérrala antes de entrar
            como vecino.
          </AlertDescription>
        </Alert>
      )}
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as 'full' | 'vote')
          setActivating(false)
        }}
      >
        <TabsList className="mb-6 grid h-11 w-full grid-cols-2">
          <TabsTrigger value="full" className="h-full">
            <KeyRound aria-hidden /> Vecinos
          </TabsTrigger>
          <TabsTrigger value="vote" className="h-full">
            <Vote aria-hidden /> Solo votar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="full">
          {activating ? (
            <ActivateForm onDone={done('/portal')} />
          ) : (
            <PasswordForm onDone={done('/portal')} onFirstAccess={() => setActivating(true)} />
          )}
        </TabsContent>
        <TabsContent value="vote">
          <VoteForm onDone={done('/portal/votaciones')} />
        </TabsContent>
      </Tabs>
    </AuthShell>
  )
}
