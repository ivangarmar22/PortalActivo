import { FileUp, Paperclip, X } from 'lucide-react'
import { useId, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MAX_FILE_BYTES } from '@/repositories/filesRepository'

/** Selector de archivo accesible con validación de tipo y tamaño en el cliente (el servidor también valida). */
export function FilePicker({
  label,
  accept,
  file,
  onChange,
  hint,
}: {
  label: string
  accept: string[]
  file: File | null
  onChange: (file: File | null) => void
  hint?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)

  function pick(selected: File | undefined) {
    if (!selected) return
    if (!accept.includes(selected.type)) {
      toast.error('Ese tipo de archivo no está permitido')
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast.error('El archivo supera los 10 MB')
      return
    }
    onChange(selected)
  }

  return (
    <div className="grid gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept.join(',')}
        className="sr-only"
        aria-labelledby={`${id}-label`}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <Paperclip aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Quitar archivo"
            onClick={() => onChange(null)}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="justify-start"
          onClick={() => input.current?.click()}
        >
          <FileUp aria-hidden /> Elegir archivo
        </Button>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
