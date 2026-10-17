import type {
  BoardCategory,
  BoardPostStatus,
  DocumentKind,
  IncidentCategory,
  IncidentResponsible,
  IncidentStatus,
  MeetingStatus,
  NoticeCategory,
  QuestionStatus,
  ReceiptStatus,
} from '@/types/domain'

export const meetingStatusLabel: Record<MeetingStatus, string> = {
  draft: 'En preparación',
  in_progress: 'En curso',
  finished: 'Finalizada',
}

export const questionStatusLabel: Record<QuestionStatus, string> = {
  draft: 'Borrador',
  open: 'Abierta',
  closed: 'Cerrada',
}

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  reported: 'Recibida',
  in_review: 'En revisión',
  in_progress: 'En proceso',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
}

export const incidentStatusOrder: IncidentStatus[] = [
  'reported',
  'in_review',
  'in_progress',
  'resolved',
  'dismissed',
]

export const incidentResponsibleLabel: Record<IncidentResponsible, string> = {
  administration: 'Administración',
  developer: 'Promotora',
  company: 'Empresa externa',
  insurance: 'Seguro',
}

export const incidentCategoryLabel: Record<IncidentCategory, string> = {
  electricity: 'Electricidad e iluminación',
  plumbing: 'Agua y fontanería',
  elevator: 'Ascensores',
  cleaning: 'Limpieza',
  gardening: 'Jardinería',
  security: 'Accesos y seguridad',
  structure: 'Estructura y fachadas',
  other: 'Otros',
}

export const noticeCategoryLabel: Record<NoticeCategory, string> = {
  general: 'General',
  works: 'Obras',
  maintenance: 'Mantenimiento',
  meeting: 'Juntas',
  security: 'Seguridad',
  cleaning: 'Limpieza',
  other: 'Otros',
}

export const boardCategoryLabel: Record<BoardCategory, string> = {
  announcement: 'Anuncio',
  lost_found: 'Objetos perdidos',
  buy_sell: 'Compraventa',
  recommendation: 'Recomendación',
  other: 'Otros',
}

export const boardStatusLabel: Record<BoardPostStatus, string> = {
  pending: 'Pendiente de revisión',
  approved: 'Publicada',
  rejected: 'No publicada',
  withdrawn: 'Retirada',
}

export const receiptStatusLabel: Record<ReceiptStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  returned: 'Devuelto',
}

export const documentKindLabel: Record<DocumentKind, string> = {
  invoice: 'Factura',
  budget: 'Presupuesto',
  accounts: 'Cuentas',
  contract: 'Contrato',
  insurance: 'Seguro',
  other: 'Otro',
}
