const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function normalizeDni(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

/** DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) con letra de control válida.
 *  Misma regla que private.is_valid_dni en la base de datos. */
export function isValidDni(value: string): boolean {
  const normalized = normalizeDni(value)
  if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(normalized)) return false
  const digits = Number(
    normalized.slice(0, 8).replace('X', '0').replace('Y', '1').replace('Z', '2'),
  )
  return CONTROL_LETTERS[digits % 23] === normalized.slice(-1)
}

/** Muestra solo los 3 últimos dígitos y la letra: ****567X. */
export function maskDni(value: string): string {
  const normalized = normalizeDni(value)
  return normalized.length > 4
    ? `${'•'.repeat(normalized.length - 4)}${normalized.slice(-4)}`
    : normalized
}
