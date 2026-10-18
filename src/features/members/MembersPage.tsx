import {
  Ban,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/States'
import { Pill } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdmin } from '@/features/auth/useAuth'
import { MemberFormDialog } from '@/features/members/MemberFormDialog'
import {
  useCreateMember,
  useMemberAccess,
  useMembers,
  useResetMemberPin,
  useUpdateMember,
} from '@/features/members/queries'
import { maskDni } from '@/schemas/dni'
import type { MemberAccessStatus, MemberWithDni } from '@/types/domain'

interface PinReveal {
  dwelling: string
  name: string
  pin: string
}

function AccessBadge({
  active,
  access,
}: {
  active: boolean
  access: MemberAccessStatus | undefined
}) {
  if (!active) return <Pill tone="closed" icon={Ban} label="Inactiva" />
  if (access?.locked_until) return <Pill tone="danger" icon={Lock} label="Bloqueada" />
  if (access?.has_password) return <Pill tone="open" icon={ShieldCheck} label="Cuenta creada" />
  return <Pill tone="draft" icon={KeyRound} label="Solo PIN" />
}

export function MembersPage() {
  const { activeCommunity } = useAdmin()
  const members = useMembers(activeCommunity.id)
  const createMember = useCreateMember(activeCommunity.id)
  const updateMember = useUpdateMember(activeCommunity.id)
  const resetPin = useResetMemberPin(activeCommunity.id)
  const access = useMemberAccess(activeCommunity.id)
  const accessOf = (id: string) => access.data?.find((a) => a.member_id === id)

  const [showDni, setShowDni] = useState(false)
  const [editing, setEditing] = useState<MemberWithDni | 'new' | null>(null)
  const [resetting, setResetting] = useState<MemberWithDni | null>(null)
  const [reveal, setReveal] = useState<PinReveal | null>(null)

  const dniText = (m: MemberWithDni) => {
    const dni = m.member_private?.dni ?? ''
    return showDni ? dni : maskDni(dni)
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Vecinos"
        description="Una fila por vivienda (un voto por vivienda). El PIN se entrega en mano: sirve para votar y para que el vecino cree su contraseña la primera vez."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowDni((v) => !v)} aria-pressed={showDni}>
              {showDni ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {showDni ? 'Ocultar DNI' : 'Mostrar DNI'}
            </Button>
            <Button onClick={() => setEditing('new')}>
              <UserPlus aria-hidden /> Añadir vivienda
            </Button>
          </>
        }
      />

      {members.isPending ? (
        <ListSkeleton />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      ) : members.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="El censo está vacío"
          description="Añade las viviendas para que sus propietarios puedan acceder."
          action={
            <Button onClick={() => setEditing('new')}>
              <UserPlus aria-hidden /> Añadir vivienda
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Vivienda</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead className="w-36">DNI / NIE</TableHead>
                  <TableHead className="w-36">Acceso</TableHead>
                  <TableHead className="w-56 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((m) => (
                  <TableRow
                    key={m.id}
                    className={m.is_active ? undefined : 'text-muted-foreground'}
                  >
                    <TableCell className="font-medium">{m.dwelling_label}</TableCell>
                    <TableCell className="whitespace-normal">{m.full_name}</TableCell>
                    <TableCell className="tabular font-mono text-sm">{dniText(m)}</TableCell>
                    <TableCell>
                      <AccessBadge active={m.is_active} access={accessOf(m.id)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                        <Pencil aria-hidden /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setResetting(m)}>
                        <KeyRound aria-hidden /> Nuevo PIN
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {members.data.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{m.dwelling_label}</p>
                    <p className="text-sm break-words">{m.full_name}</p>
                    <p className="font-mono text-sm text-muted-foreground">{dniText(m)}</p>
                  </div>
                  <AccessBadge active={m.is_active} access={accessOf(m.id)} />
                </div>
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                    <Pencil aria-hidden /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResetting(m)}>
                    <KeyRound aria-hidden /> Nuevo PIN
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <MemberFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        member={editing === 'new' || editing === null ? undefined : editing}
        onSubmit={async (values) => {
          const input = {
            dwellingLabel: values.dwellingLabel,
            fullName: values.fullName,
            dni: values.dni,
          }
          if (editing === 'new' || editing === null) {
            const { pin } = await createMember.mutateAsync(input)
            setReveal({ dwelling: values.dwellingLabel, name: values.fullName, pin })
          } else {
            await updateMember.mutateAsync({
              memberId: editing.id,
              input: { ...input, isActive: values.isActive },
            })
          }
        }}
      />

      <ConfirmDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title="¿Generar un PIN nuevo?"
        description={
          <>
            <p>El PIN actual de la vivienda {resetting?.dwelling_label} dejará de funcionar.</p>
            <p>
              También se borra su contraseña: el vecino tendrá que crearla de nuevo con el PIN. Se
              cierran sus sesiones abiertas y se desbloquea si estaba bloqueada.
            </p>
          </>
        }
        confirmLabel="Generar PIN"
        onConfirm={async () => {
          if (!resetting) return
          const pin = await resetPin.mutateAsync(resetting.id)
          setReveal({ dwelling: resetting.dwelling_label, name: resetting.full_name, pin })
        }}
      />

      <Dialog open={reveal !== null} onOpenChange={(open) => !open && setReveal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>PIN de acceso</DialogTitle>
            <DialogDescription>
              Vivienda {reveal?.dwelling} · {reveal?.name}. Anótalo y entrégalo en mano: no se
              volverá a mostrar.
            </DialogDescription>
          </DialogHeader>
          <p
            className="tabular rounded-xl bg-primary-soft py-5 text-center font-mono text-4xl font-semibold tracking-[0.3em] text-accent-foreground"
            aria-live="polite"
          >
            {reveal?.pin}
          </p>
          <DialogFooter>
            <Button onClick={() => setReveal(null)}>Hecho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
