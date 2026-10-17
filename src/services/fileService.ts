import { toast } from 'sonner'
import { errorMessage } from '@/lib/errors'
import { filesRepository } from '@/repositories/filesRepository'

/** Descarga un archivo privado con un enlace firmado de 5 minutos; los errores se notifican. */
export async function downloadFile(path: string, name: string) {
  try {
    window.location.assign(await filesRepository.signedUrl(path, name))
  } catch (error) {
    toast.error(errorMessage(error))
  }
}
