import { describe, expect, it } from 'vitest'
import { isValidDni, maskDni, normalizeDni } from '@/schemas/dni'

describe('isValidDni', () => {
  it.each(['10000001S', '10000007K', 'X1000001F', '10000001-s', ' x1000001f '])(
    'acepta %s',
    (value) => {
      expect(isValidDni(value)).toBe(true)
    },
  )

  it.each(['10000001A', '1234567', 'ABCDEFGHI', 'W1000001F', ''])('rechaza %s', (value) => {
    expect(isValidDni(value)).toBe(false)
  })
})

describe('normalizeDni / maskDni', () => {
  it('normaliza a mayúsculas sin separadores', () => {
    expect(normalizeDni(' 10000001-s ')).toBe('10000001S')
  })

  it('enmascara todo salvo los 3 últimos dígitos y la letra', () => {
    expect(maskDni('10000001S')).toBe('•••••001S')
  })
})
