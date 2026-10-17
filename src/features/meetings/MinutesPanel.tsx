import { FileDown, FileUp, Loader2, Save, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  downloadMinutesFile,
  useRemoveMinutesFile,
  useSaveMinutesText,
  useUploadMinutesFile,
} from '@/features/meetings/queries'
import { MINUTES_MAX_BYTES, MINUTES_MAX_CHARS } from '@/schemas/forms'
import type { Meeting } from '@/types/domain'

export function MinutesPanel({ meeting }: { meeting: Meeting }) {
  const readOnly = meeting.status === 'finished'
  const textareaId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState(meeting.minutes_content ?? '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const saveText = useSaveMinutesText(meeting.id)
  const uploadFile = useUploadMinutesFile(meeting)
  const removeFile = useRemoveMinutesFile(meeting)

  // Si el acta cambia en el servidor (p. ej. tras guardar), se sincroniza el editor.
  const [syncedContent, setSyncedContent] = useState(meeting.minutes_content)
  if (meeting.minutes_content !== syncedContent) {
    setSyncedContent(meeting.minutes_content)
    setContent(meeting.minutes_content ?? '')
  }
  const dirty = content !== (meeting.minutes_content ?? '')

  function onFileSelected(file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('El acta debe ser un archivo PDF')
      return
    }
    if (file.size > MINUTES_MAX_BYTES) {
      toast.error('El PDF supera el tamaño máximo de 10 MB')
      return
    }
    uploadFile.mutate(file)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Texto del acta</CardTitle>
          <CardDescription>
            Visible para los propietarios en cuanto la reunión se inicia.
            {readOnly && ' La reunión está finalizada: el acta es de solo lectura.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Label htmlFor={textareaId} className="sr-only">
            Texto del acta
          </Label>
          <Textarea
            id={textareaId}
            rows={16}
            value={content}
            readOnly={readOnly}
            maxLength={MINUTES_MAX_CHARS}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Asistentes, acuerdos, observaciones…"
            className="font-mono text-sm leading-relaxed"
          />
          {!readOnly && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => saveText.mutate(content)}
                disabled={!dirty || saveText.isPending}
              >
                {saveText.isPending ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Save aria-hidden />
                )}
                Guardar acta
              </Button>
              {dirty && <span className="text-sm text-muted-foreground">Cambios sin guardar</span>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento PDF</CardTitle>
          <CardDescription>
            Archivo privado; solo lo descargan la administración y los propietarios de la comunidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {meeting.minutes_file_name ? (
            <>
              <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm break-all">
                {meeting.minutes_file_name}
              </p>
              <Button variant="outline" onClick={() => void downloadMinutesFile(meeting)}>
                <FileDown aria-hidden /> Descargar
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hay ningún PDF adjunto.</p>
          )}
          {!readOnly && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  onFileSelected(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button onClick={() => fileInput.current?.click()} disabled={uploadFile.isPending}>
                {uploadFile.isPending ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <FileUp aria-hidden />
                )}
                {meeting.minutes_file_name ? 'Sustituir PDF' : 'Subir PDF'}
              </Button>
              {meeting.minutes_file_name && (
                <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
                  <Trash2 aria-hidden /> Quitar PDF
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Máximo 10 MB.</p>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="¿Quitar el PDF del acta?"
        description={<p>El archivo se eliminará del almacenamiento.</p>}
        confirmLabel="Quitar PDF"
        destructive
        onConfirm={() => removeFile.mutateAsync()}
      />
    </div>
  )
}
