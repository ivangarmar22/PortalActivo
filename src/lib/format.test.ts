import { describe, expect, it } from 'vitest'
import { formatEuros } from '@/lib/format'

// Intl usa un espacio duro antes del símbolo; se normaliza para comparar.
const plain = (value: string) => value.replace(/\s/g, ' ')

describe('formatEuros', () => {
  it('separa los miles con punto también en cifras de 4 dígitos', () => {
    expect(plain(formatEuros(184_000))).toBe('1.840,00 €')
    expect(plain(formatEuros(100_000))).toBe('1.000,00 €')
  })

  it('agrupa cifras mayores y conserva los céntimos', () => {
    expect(plain(formatEuros(1_234_567_89))).toBe('1.234.567,89 €')
  })

  it('no añade separador por debajo de mil', () => {
    expect(plain(formatEuros(6_500))).toBe('65,00 €')
  })

  it('muestra una raya si no hay importe', () => {
    expect(formatEuros(null)).toBe('—')
    expect(formatEuros(undefined)).toBe('—')
  })
})
