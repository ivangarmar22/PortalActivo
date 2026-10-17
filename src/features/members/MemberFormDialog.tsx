import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { memberSchema, type MemberFormInput, type MemberFormValues } from '@/schemas/forms'
import type { MemberWithDni } from '@/types/domain'

function defaultsFor(member?: MemberWithDni): MemberFormInput {
  return {
    dwellingLabel: member?.dwelling_label ?? '',
    fullName: member?.full_name ?? '',
    dni: member?.member_private?.dni ?? '',
    isActive: member?.is_active ?? true,
  }
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: MemberWithDni
  onSubmit: (values: MemberFormValues) => Promise<unknown>
}) {
  const form = useForm<MemberFormInput, unknown, MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: defaultsFor(member),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFor(member))
  }, [open, member, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? 'Editar vivienda' : 'Añadir vivienda'}</DialogTitle>
          <DialogDescription>
            {member
              ? 'Los datos se usan para reconocer al propietario al acceder.'
              : 'Al guardar se generará un PIN de acceso que solo se mostrará una vez.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField
            label="Vivienda"
            hint="Piso y puerta: 3º B, Ático, Local 1…"
            error={errors.dwellingLabel?.message}
          >
            <Input {...form.register('dwellingLabel')} />
          </FormField>
          <FormField label="Nombre y apellidos del propietario" error={errors.fullName?.message}>
            <Input {...form.register('fullName')} />
          </FormField>
          <FormField
            label="DNI o NIE"
            hint="Solo visible para la administración."
            error={errors.dni?.message}
          >
            <Input autoComplete="off" className="uppercase" {...form.register('dni')} />
          </FormField>
          {member && (
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="member-active">Vivienda activa</Label>
                    <p className="text-xs text-muted-foreground">
                      Si se desactiva, no podrá votar, se cierran sus sesiones y deja de contar en
                      la participación.
                    </p>
                  </div>
                  <Switch
                    id="member-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
              {member ? 'Guardar cambios' : 'Añadir y generar PIN'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
