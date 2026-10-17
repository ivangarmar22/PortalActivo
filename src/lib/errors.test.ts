import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from '@/lib/errors'

describe('toAppError', () => {
  it('traduce los códigos de negocio que lanza PostgreSQL', () => {
    const error = toAppError({ code: 'P0001', message: 'question_not_open' })
    expect(error.code).toBe('question_not_open')
    expect(error.message).toMatch(/cerrada/)
  })

  it('trata los permisos denegados como forbidden', () => {
    expect(
      toAppError({ code: '42501', message: 'permission denied for table meetings' }).code,
    ).toBe('forbidden')
  })

  it('detecta errores de red', () => {
    expect(toAppError(new TypeError('Failed to fetch')).code).toBe('network')
  })

  it('detecta la sesión caducada', () => {
    expect(toAppError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('session_expired')
  })

  it('no muestra mensajes técnicos desconocidos', () => {
    const error = toAppError({ code: 'XX000', message: 'internal detail' })
    expect(error.code).toBe('unknown')
    expect(error.message).not.toContain('internal detail')
  })

  it('devuelve el mismo AppError si ya lo es', () => {
    const original = new AppError('locked')
    expect(toAppError(original)).toBe(original)
  })
})
