import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ControlProps {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Etiqueta + control + ayuda + error, enlazados con id/aria-describedby para lectores de pantalla.
 * El control (input, textarea…) se pasa como único hijo.
 */
export function FormField({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode
  error?: string | undefined
  hint?: ReactNode
  children: ReactElement<ControlProps>
  className?: string
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })
    : children

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
