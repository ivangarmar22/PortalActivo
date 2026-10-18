import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, ListRestart, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import type { QuestionInput } from '@/repositories/questionsRepository'
import { DEFAULT_OPTIONS, questionSchema, type QuestionFormValues } from '@/schemas/forms'
import type { QuestionWithOptions } from '@/types/domain'

function defaultsFor(question?: QuestionWithOptions): QuestionFormValues {
  return {
    title: question?.title ?? '',
    description: question?.description ?? '',
    options: (question ? question.answer_options.map((o) => o.label) : DEFAULT_OPTIONS).map(
      (label) => ({ label }),
    ),
  }
}

export function QuestionEditorDialog({
  open,
  onOpenChange,
  question,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: QuestionWithOptions
  onSubmit: (input: QuestionInput) => Promise<unknown>
}) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaultsFor(question),
  })
  const options = useFieldArray({ control: form.control, name: 'options' })

  useEffect(() => {
    if (open) form.reset(defaultsFor(question))
  }, [open, question, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        options: values.options.map((o) => o.label.trim()).filter(Boolean),
      })
      onOpenChange(false)
    } catch {
      // Notificado por la mutación.
    }
  })

  const { errors, isSubmitting } = form.formState
  const optionsError = errors.options?.message ?? errors.options?.root?.message

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Editar punto del orden del día' : 'Nuevo punto del orden del día'}
          </DialogTitle>
          <DialogDescription>
            Respuesta de selección única. Cuando la pregunta se abra ya no se podrá modificar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField label="Pregunta o punto a votar" error={errors.title?.message}>
            <Input {...form.register('title')} />
          </FormField>
          <FormField label="Descripción (opcional)" error={errors.description?.message}>
            <Textarea
              rows={3}
              placeholder="Contexto, importes, documentación…"
              {...form.register('description')}
            />
          </FormField>

          <fieldset className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label asChild>
                <legend>Opciones de respuesta</legend>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => options.replace(DEFAULT_OPTIONS.map((label) => ({ label })))}
              >
                <ListRestart aria-hidden /> A favor / En contra / Abstención
              </Button>
            </div>
            <ol className="grid gap-2">
              {options.fields.map((field, index) => (
                <li key={field.id} className="flex items-start gap-2">
                  <span className="tabular mt-2 w-5 shrink-0 text-right text-sm text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div className="grid flex-1 gap-1">
                    <Input
                      aria-label={`Opción ${index + 1}`}
                      aria-invalid={errors.options?.[index]?.label ? true : undefined}
                      {...form.register(`options.${index}.label`)}
                    />
                    {errors.options?.[index]?.label && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.options[index].label.message}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Subir opción ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => options.move(index, index - 1)}
                    >
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Bajar opción ${index + 1}`}
                      disabled={index === options.fields.length - 1}
                      onClick={() => options.move(index, index + 1)}
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar opción ${index + 1}`}
                      disabled={options.fields.length <= 2}
                      onClick={() => options.remove(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            {optionsError && (
              <p role="alert" className="text-sm text-destructive">
                {optionsError}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              disabled={options.fields.length >= 10}
              onClick={() => options.append({ label: '' })}
            >
              <Plus aria-hidden /> Añadir opción
            </Button>
          </fieldset>

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
              {question ? 'Guardar cambios' : 'Añadir punto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
