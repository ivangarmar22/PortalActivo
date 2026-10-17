import { z } from 'zod'
import { isValidDni, normalizeDni } from '@/schemas/dni'

const requiredText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label}: mínimo ${min} caracteres`)
    .max(max, `${label}: máximo ${max} caracteres`)

const dni = z
  .string()
  .trim()
  .min(1, 'Introduce el DNI o NIE')
  .refine(isValidDni, 'El DNI o NIE no es válido (revisa la letra)')
  .transform(normalizeDni)

// Acceso
export const adminLoginSchema = z.object({
  email: z.email('Introduce un email válido'),
  password: z.string().min(1, 'Introduce la contraseña'),
})
export type AdminLoginValues = z.infer<typeof adminLoginSchema>

const pin = z.string().regex(/^[0-9]{6}$/, 'El PIN tiene 6 dígitos')
const required = (label: string) => z.string().trim().min(1, `Rellena «${label}»`)
const password = z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres')

/** Solo votación: el servidor solo valida el PIN; el resto solo tiene que estar relleno. */
export const memberVoteLoginSchema = z.object({
  fullName: required('Nombre y apellidos'),
  dni: required('DNI o NIE'),
  dwelling: required('Piso o vivienda'),
  pin,
})
export type MemberVoteLoginValues = z.infer<typeof memberVoteLoginSchema>

/** Acceso completo con DNI y contraseña. */
export const memberPasswordLoginSchema = z.object({
  dni,
  password: z.string().min(1, 'Introduce tu contraseña'),
})
export type MemberPasswordLoginInput = z.input<typeof memberPasswordLoginSchema>
export type MemberPasswordLoginValues = z.output<typeof memberPasswordLoginSchema>

/** Primer acceso: DNI + PIN de la administración y contraseña nueva. */
export const memberActivateSchema = z
  .object({ dni, pin, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })
export type MemberActivateInput = z.input<typeof memberActivateSchema>
export type MemberActivateValues = z.output<typeof memberActivateSchema>

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Introduce tu contraseña actual'),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

// Incidencias
const incidentCategories = [
  'electricity',
  'plumbing',
  'elevator',
  'cleaning',
  'gardening',
  'security',
  'structure',
  'other',
] as const

export const incidentReportSchema = z.object({
  title: requiredText(3, 140, 'Título'),
  description: z.string().trim().max(4000, 'Máximo 4000 caracteres'),
  location: z.string().trim().max(120, 'Máximo 120 caracteres'),
  category: z.enum(incidentCategories, { message: 'Elige una categoría' }),
})
export type IncidentReportValues = z.infer<typeof incidentReportSchema>

export const incidentUpdateSchema = z.object({
  status: z.enum(['reported', 'in_review', 'in_progress', 'resolved', 'dismissed']),
  responsibleType: z.enum(['none', 'administration', 'developer', 'company', 'insurance']),
  responsibleName: z.string().trim().max(120, 'Máximo 120 caracteres'),
  estimatedResolution: z.string(),
  message: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
})
export type IncidentUpdateValues = z.infer<typeof incidentUpdateSchema>

// Avisos y tablón
export const noticeSchema = z
  .object({
    title: requiredText(3, 160, 'Título'),
    body: requiredText(1, 8000, 'Texto'),
    category: z.enum([
      'general',
      'works',
      'maintenance',
      'meeting',
      'security',
      'cleaning',
      'other',
    ]),
    isUrgent: z.boolean(),
    isPinned: z.boolean(),
    publishedAt: z.string().min(1, 'Indica cuándo se publica'),
    expiresAt: z.string(),
  })
  .refine((v) => !v.expiresAt || new Date(v.expiresAt) > new Date(v.publishedAt), {
    path: ['expiresAt'],
    message: 'La caducidad tiene que ser posterior a la publicación',
  })
export type NoticeFormValues = z.infer<typeof noticeSchema>

export const boardPostSchema = z.object({
  title: requiredText(3, 120, 'Título'),
  body: requiredText(3, 2000, 'Texto'),
  category: z.enum(['announcement', 'lost_found', 'buy_sell', 'recommendation', 'other']),
})
export type BoardPostValues = z.infer<typeof boardPostSchema>

// Recibos y documentos
/** «85», «85,5» o «1.234,56» → céntimos. */
export function parseEurosToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s|€/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

const euros = z
  .string()
  .trim()
  .refine((v) => (parseEurosToCents(v) ?? 0) > 0, 'Importe no válido (por ejemplo 85,00)')

export const issueReceiptsSchema = z.object({
  concept: requiredText(3, 160, 'Concepto'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Elige el mes'),
  amount: euros,
  dueDate: z.string().min(1, 'Indica el vencimiento'),
})
export type IssueReceiptsValues = z.infer<typeof issueReceiptsSchema>

export const documentSchema = z.object({
  kind: z.enum(['invoice', 'budget', 'accounts', 'contract', 'insurance', 'other']),
  title: requiredText(3, 160, 'Título'),
  supplier: z.string().trim().max(120, 'Máximo 120 caracteres'),
  amount: z
    .string()
    .trim()
    .refine((v) => v === '' || parseEurosToCents(v) !== null, 'Importe no válido'),
  documentDate: z.string().min(1, 'Indica la fecha'),
})
export type DocumentFormValues = z.infer<typeof documentSchema>

// Zonas comunes
export const spaceSchema = z.object({
  name: requiredText(2, 80, 'Nombre'),
  description: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
  rules: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
  maxFuture: z.coerce.number().int().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
  cancelHours: z.coerce.number().int().min(0, 'Mínimo 0').max(168, 'Máximo 168'),
  windowDays: z.coerce.number().int().min(1, 'Mínimo 1').max(180, 'Máximo 180'),
  isActive: z.boolean(),
  slots: z
    .array(
      z
        .object({
          id: z.string().optional(),
          label: requiredText(1, 40, 'Nombre de la franja'),
          start: z.string().regex(/^\d{2}:\d{2}$/, 'Hora no válida'),
          end: z.string().regex(/^\d{2}:\d{2}$/, 'Hora no válida'),
          weekdays: z.array(z.number().int().min(1).max(7)).min(1, 'Elige al menos un día'),
        })
        .refine((s) => s.start !== s.end, {
          path: ['end'],
          message: 'Inicio y fin no pueden coincidir',
        }),
    )
    .min(1, 'Añade al menos una franja'),
})
export type SpaceFormInput = z.input<typeof spaceSchema>
export type SpaceFormValues = z.output<typeof spaceSchema>

// Reuniones
export const meetingSchema = z.object({
  title: requiredText(3, 160, 'Título'),
  description: z.string().trim().max(4000, 'Descripción: máximo 4000 caracteres'),
  meetingDate: z
    .string()
    .min(1, 'Indica la fecha y hora')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha no válida'),
})
export type MeetingFormValues = z.infer<typeof meetingSchema>

/** Igual que la restricción de `meetings.minutes_content`. */
export const MINUTES_MAX_CHARS = 100_000

export const MINUTES_MAX_BYTES = 10 * 1024 * 1024

// Preguntas
export const questionSchema = z
  .object({
    title: requiredText(3, 300, 'Título'),
    description: z.string().trim().max(4000, 'Descripción: máximo 4000 caracteres'),
    options: z
      .array(z.object({ label: z.string().trim().max(200, 'Opción: máximo 200 caracteres') }))
      .max(10, 'Máximo 10 opciones'),
  })
  .superRefine((value, ctx) => {
    const labels = value.options.map((o) => o.label.trim()).filter(Boolean)
    if (labels.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Añade al menos dos opciones' })
    }
    const seen = new Set<string>()
    value.options.forEach((option, index) => {
      const key = option.label.trim().toLowerCase()
      if (!key) return
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', index, 'label'],
          message: 'Opción repetida',
        })
      }
      seen.add(key)
    })
  })
export type QuestionFormValues = z.infer<typeof questionSchema>

export const DEFAULT_OPTIONS = ['A favor', 'En contra', 'Abstención']

// Censo
export const memberSchema = z.object({
  dwellingLabel: requiredText(1, 40, 'Vivienda'),
  fullName: requiredText(2, 120, 'Nombre y apellidos'),
  dni,
  isActive: z.boolean(),
})
export type MemberFormInput = z.input<typeof memberSchema>
export type MemberFormValues = z.output<typeof memberSchema>
