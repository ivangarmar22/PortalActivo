import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const BUCKET = 'minutes'

export const minutesRepository = {
  /** Sube el PDF a {meetingId}/{uuid}.pdf (bucket privado) y devuelve la ruta. */
  async upload(meetingId: string, file: File): Promise<string> {
    const path = `${meetingId}/${crypto.randomUUID()}.pdf`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: 'application/pdf', upsert: false })
    if (error) throw toAppError(error)
    return path
  },

  async remove(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw toAppError(error)
  },

  /** Enlace temporal (5 min) para descargar el acta; las políticas de Storage deciden quién puede. */
  async getDownloadUrl(path: string, fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 300, { download: fileName })
    if (error) throw toAppError(error)
    return data.signedUrl
  },
}
