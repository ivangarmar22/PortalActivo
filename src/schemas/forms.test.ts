import { describe, expect, it } from 'vitest'
import {
  memberActivateSchema,
  memberVoteLoginSchema,
  parseEurosToCents,
  questionSchema,
} from '@/schemas/forms'

describe('questionSchema', () => {
  const base = { title: 'Aprobación de cuentas', description: '' }

  it('exige al menos dos opciones no vacías', () => {
    const result = questionSchema.safeParse({
      ...base,
      options: [{ label: 'Sí' }, { label: '  ' }],
    })
    expect(result.success).toBe(false)
  })

  it('rechaza opciones repetidas sin distinguir mayúsculas', () => {
    const result = questionSchema.safeParse({
      ...base,
      options: [{ label: 'A favor' }, { label: 'a favor ' }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['options', 1, 'label'])
  })

  it('acepta una pregunta válida', () => {
    expect(
      questionSchema.safeParse({ ...base, options: [{ label: 'Sí' }, { label: 'No' }] }).success,
    ).toBe(true)
  })
})

describe('memberVoteLoginSchema (solo votación)', () => {
  it('solo exige que nombre, DNI y vivienda estén rellenos (no valida el formato del DNI)', () => {
    const result = memberVoteLoginSchema.safeParse({
      fullName: 'Ana',
      dni: 'cualquiera',
      dwelling: '1A',
      pin: '111111',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza campos vacíos', () => {
    const result = memberVoteLoginSchema.safeParse({
      fullName: ' ',
      dni: '',
      dwelling: '1A',
      pin: '111111',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un PIN que no tiene 6 dígitos', () => {
    const result = memberVoteLoginSchema.safeParse({
      fullName: 'Ana',
      dni: 'x',
      dwelling: '1A',
      pin: '12a456',
    })
    expect(result.success).toBe(false)
  })
})

describe('memberActivateSchema (primer acceso)', () => {
  const base = { dni: '10000001-s', pin: '111111', password: 'Clave2026!', confirm: 'Clave2026!' }

  it('normaliza el DNI y acepta una contraseña de 8 caracteres o más', () => {
    expect(memberActivateSchema.parse(base).dni).toBe('10000001S')
  })

  it('exige que las contraseñas coincidan', () => {
    const result = memberActivateSchema.safeParse({ ...base, confirm: 'otra' })
    expect(result.error?.issues[0]?.path).toEqual(['confirm'])
  })

  it('rechaza contraseñas cortas', () => {
    expect(
      memberActivateSchema.safeParse({ ...base, password: 'corta', confirm: 'corta' }).success,
    ).toBe(false)
  })
})

describe('parseEurosToCents', () => {
  it.each([
    ['85', 8500],
    ['85,5', 8550],
    ['1.234,56 €', 123456],
    [' 0,99 ', 99],
  ])('«%s» → %i céntimos', (value, cents) => {
    expect(parseEurosToCents(value)).toBe(cents)
  })

  it.each(['', 'abc', '1,234', '-5'])('rechaza «%s»', (value) => {
    expect(parseEurosToCents(value)).toBeNull()
  })
})
