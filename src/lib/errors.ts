export type AppErrorCode =
  | 'anonymous_session_required'
  | 'dwelling_taken'
  | 'forbidden'
  | 'invalid_credentials'
  | 'invalid_dni'
  | 'invalid_login'
  | 'invalid_option'
  | 'invalid_options'
  | 'invalid_order'
  | 'locked'
  | 'meeting_finished'
  | 'meeting_not_draft'
  | 'meeting_not_found'
  | 'meeting_not_in_progress'
  | 'network'
  | 'not_a_member'
  | 'not_admin'
  | 'question_locked'
  | 'question_needs_options'
  | 'question_not_closed'
  | 'question_not_draft'
  | 'question_not_found'
  | 'question_not_open'
  | 'session_expired'
  | 'unknown'
  // Acceso de vecinos
  | 'invalid_pin'
  | 'missing_fields'
  | 'invalid_activation'
  | 'already_activated'
  | 'weak_password'
  | 'wrong_password'
  | 'full_access_required'
  | 'vote_already_exists'
  // Incidencias
  | 'incident_not_found'
  | 'nothing_to_update'
  | 'invalid_file'
  | 'file_too_large'
  // Reservas
  | 'slot_taken'
  | 'slot_not_found'
  | 'slot_unavailable'
  | 'slot_in_past'
  | 'slot_too_far'
  | 'reservation_limit'
  | 'reservation_not_found'
  | 'reservation_not_active'
  | 'cancel_too_late'
  | 'invalid_slots'
  | 'space_not_found'
  | 'space_name_taken'
  // Avisos y tablón
  | 'notice_not_found'
  | 'too_many_pending_posts'
  | 'post_not_found'
  | 'invalid_moderation'
  // Recibos
  | 'invalid_amount'
  | 'member_not_in_community'

const messages: Record<AppErrorCode, string> = {
  invalid_pin: 'El PIN no es correcto. Revísalo o pídeselo a la administración.',
  missing_fields: 'Rellena todos los campos.',
  invalid_activation:
    'El DNI y el PIN no corresponden a ninguna vivienda. Revisa ambos datos o pide un PIN nuevo.',
  already_activated:
    'Esta vivienda ya tiene contraseña. Entra con tu DNI y tu contraseña, o pide un PIN nuevo a la administración para restablecerla.',
  weak_password: 'La contraseña debe tener entre 8 y 72 caracteres.',
  wrong_password: 'La contraseña actual no es correcta.',
  full_access_required: 'Esta sección necesita acceso completo con DNI y contraseña.',
  vote_already_exists: 'Esta vivienda ya ha votado en esta pregunta.',
  incident_not_found: 'La incidencia no existe o no tienes acceso.',
  nothing_to_update: 'No hay cambios que guardar.',
  invalid_file: 'El archivo no es válido.',
  file_too_large: 'El archivo supera el tamaño máximo permitido.',
  slot_taken: 'Otra vivienda acaba de reservar esa franja. Elige otra.',
  slot_not_found: 'La franja ya no existe. Recarga la página.',
  slot_unavailable: 'Esa franja no está disponible ese día.',
  slot_in_past: 'No se puede reservar una franja que ya ha empezado.',
  slot_too_far: 'Todavía no se puede reservar con tanta antelación.',
  reservation_limit:
    'Has alcanzado el máximo de reservas futuras para este espacio. Cancela alguna o espera a que pase.',
  reservation_not_found: 'La reserva no existe o no es tuya.',
  reservation_not_active: 'La reserva ya estaba cancelada.',
  cancel_too_late:
    'Ya no se puede cancelar: falta menos tiempo del mínimo exigido. Contacta con la administración.',
  invalid_slots: 'Añade al menos una franja horaria válida.',
  space_not_found: 'El espacio no existe.',
  space_name_taken: 'Ya existe un espacio con ese nombre.',
  notice_not_found: 'El aviso no existe o ya no está publicado.',
  too_many_pending_posts:
    'Tienes 3 publicaciones pendientes de revisión. Espera a que la administración las revise.',
  post_not_found: 'La publicación no existe o no se puede modificar.',
  invalid_moderation: 'Esa publicación ya no se puede moderar así.',
  invalid_amount: 'El importe debe ser mayor que cero.',
  member_not_in_community: 'La vivienda no pertenece a esta comunidad.',
  anonymous_session_required:
    'Cierra la sesión de administración antes de entrar como propietario.',
  dwelling_taken: 'Ya existe una vivienda con ese identificador en la comunidad.',
  forbidden: 'No tienes permiso para realizar esta acción.',
  invalid_credentials: 'DNI o contraseña incorrectos.',
  invalid_dni: 'El DNI o NIE no es válido.',
  invalid_login: 'Email o contraseña incorrectos.',
  invalid_option: 'La opción seleccionada no pertenece a esta pregunta.',
  invalid_options: 'Indica entre 2 y 10 opciones distintas.',
  invalid_order: 'El orden enviado no coincide con las preguntas de la reunión. Recarga la página.',
  locked:
    'Demasiados intentos fallidos. Espera 15 minutos o pide un PIN nuevo a la administración.',
  meeting_finished: 'La reunión está finalizada y es de solo lectura.',
  meeting_not_draft: 'Solo se pueden eliminar reuniones en preparación.',
  meeting_not_found: 'La reunión no existe o no tienes acceso.',
  meeting_not_in_progress: 'La reunión tiene que estar en curso para hacer esto.',
  network: 'No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  not_a_member: 'Tu sesión no está vinculada a esta comunidad. Vuelve a identificarte.',
  not_admin: 'Esta cuenta no administra ninguna comunidad.',
  question_locked: 'La pregunta ya se ha abierto y no se puede modificar.',
  question_needs_options: 'La pregunta necesita al menos dos opciones para abrirse.',
  question_not_closed: 'Solo se pueden reabrir preguntas cerradas.',
  question_not_draft:
    'Solo se pueden abrir preguntas en borrador. Para una cerrada, usa «Reabrir».',
  question_not_found: 'La pregunta no existe o no tienes acceso.',
  question_not_open:
    'La votación de esta pregunta está cerrada. No se ha registrado ningún cambio.',
  session_expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  unknown: 'Se ha producido un error inesperado. Inténtalo de nuevo.',
}

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, cause?: unknown) {
    super(messages[code], { cause })
    this.name = 'AppError'
    this.code = code
  }
}

const knownCodes = new Set<string>(Object.keys(messages))

function isKnownCode(value: string): value is AppErrorCode {
  return knownCodes.has(value)
}

interface ErrorLike {
  code?: unknown
  message?: unknown
}

/** Convierte errores de PostgREST, Auth o red en un AppError con mensaje en español. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  const { code, message } = (error ?? {}) as ErrorLike
  const text = typeof message === 'string' ? message.trim() : ''

  if (isKnownCode(text)) return new AppError(text, error)
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(text)) {
    return new AppError('network', error)
  }
  if (code === 'PGRST301' || code === 'PGRST303' || /jwt expired/i.test(text)) {
    return new AppError('session_expired', error)
  }
  if (code === '42501') return new AppError('forbidden', error)

  return new AppError('unknown', error)
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message
}
