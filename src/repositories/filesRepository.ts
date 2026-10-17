import { AppError, toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const BUCKET = 'community-files'

export type FileArea = 'notices' | 'documents' | 'incidents' | 'receipts'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_BYTES = 10 * 1024 * 1024

function extensionFor(file: File): string {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Archivos privados de la comunidad. La ruta empieza por la comunidad y el área
 * ({community}/{área}/…) porque las políticas de Storage deciden con ella quién puede leer o escribir.
 */
export const filesRepository = {
  async upload(
    communityId: string,
    area: FileArea,
    file: File,
    options: { memberId?: string } = {},
  ): Promise<string> {
    if (file.size > MAX_FILE_BYTES) throw new AppError('file_too_large')
    const folder = area === 'receipts' ? `${area}/${options.memberId}` : area
    const path = `${communityId}/${folder}/${crypto.randomUUID()}.${extensionFor(file)}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw toAppError(error)
    return path
  },

  async remove(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw toAppError(error)
  },

  /** Enlace temporal (5 min). Con `downloadName` fuerza la descarga con ese nombre. */
  async signedUrl(path: string, downloadName?: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 300, downloadName ? { download: downloadName } : undefined)
    if (error) throw toAppError(error)
    return data.signedUrl
  },
}
