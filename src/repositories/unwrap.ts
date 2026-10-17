import { toAppError } from '@/lib/errors'

interface SupabaseResult<T> {
  data: T | null
  error: unknown
}

/** Devuelve los datos o lanza un AppError con mensaje en español.
 *  supabase-js garantiza data cuando no hay error (salvo en .maybeSingle(): usar unwrapMaybe). */
export function unwrap<T>(result: SupabaseResult<T>): T {
  if (result.error) throw toAppError(result.error)
  return result.data as T
}

/** Para consultas .maybeSingle(): devuelve null si no hay fila. */
export function unwrapMaybe<T>(result: SupabaseResult<T>): T | null {
  if (result.error) throw toAppError(result.error)
  return result.data
}

/** Exige que haya fila; si no, lanza el error indicado. */
export function unwrapRequired<T>(result: SupabaseResult<T>, notFound: () => Error): T {
  const data = unwrapMaybe(result)
  if (data === null) throw notFound()
  return data
}
