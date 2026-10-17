import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']
type Functions = Database['public']['Functions']

export type MeetingStatus = Enums['meeting_status']
export type QuestionStatus = Enums['question_status']

export type Community = Tables['communities']['Row']
export type Meeting = Tables['meetings']['Row']
type Question = Tables['questions']['Row']
type AnswerOption = Tables['answer_options']['Row']
type CommunityMember = Tables['community_members']['Row']

export type QuestionWithOptions = Question & { answer_options: AnswerOption[] }

export type MemberWithDni = CommunityMember & { member_private: { dni: string } | null }

// Los tipos generados no reflejan la nulabilidad de las columnas devueltas por funciones.
export type MeetingResultRow = Omit<
  Functions['get_meeting_results']['Returns'][number],
  'percentage' | 'question_opened_at' | 'question_closed_at'
> & {
  percentage: number | null
  question_opened_at: string | null
  question_closed_at: string | null
}
export type MeetingVoteRow = Functions['admin_meeting_votes']['Returns'][number]

/** full: DNI + contraseña (todo el portal) · vote: acceso de solo votación (solo PIN). */
type AccessScope = 'full' | 'vote'

export interface Membership {
  member_id: string
  community_id: string
  community_name: string
  community_logo_url: string | null
  dwelling_label: string
  full_name: string
  access_scope: AccessScope
}

// Módulos de comunidad
export type IncidentStatus = Enums['incident_status']
export type IncidentResponsible = Enums['incident_responsible']
export type IncidentCategory = Enums['incident_category']
export type Incident = Tables['incidents']['Row']
type IncidentUpdate = Tables['incident_updates']['Row']
export type IncidentWithUpdates = Incident & { incident_updates: IncidentUpdate[] }

type CommonSpace = Tables['common_spaces']['Row']
type SpaceSlot = Tables['space_slots']['Row']
export type SpaceWithSlots = CommonSpace & { space_slots: SpaceSlot[] }
type Reservation = Tables['reservations']['Row']
export type ReservationWithSpace = Reservation & { common_spaces: { name: string } | null }
export type AdminReservation = ReservationWithSpace & {
  community_members: { dwelling_label: string; full_name: string } | null
}
type AvailabilityState = 'free' | 'taken' | 'mine' | 'past' | 'closed'
export type AvailabilitySlot = Omit<
  Functions['get_space_availability']['Returns'][number],
  'state' | 'my_reservation_id'
> & { state: AvailabilityState; my_reservation_id: string | null }

export type NoticeCategory = Enums['notice_category']
export type Notice = Tables['notices']['Row']
export type NoticeWithReads = Notice & { notice_reads: { member_id: string }[] }
export type BoardPostStatus = Enums['board_post_status']
export type BoardCategory = Enums['board_category']
export type BoardPost = Tables['board_posts']['Row']

export type ReceiptStatus = Enums['receipt_status']
export type Receipt = Tables['receipts']['Row']
export type AdminReceipt = Receipt & {
  community_members: { dwelling_label: string; full_name: string } | null
}
export type DocumentKind = Enums['document_kind']
export type CommunityDocument = Tables['community_documents']['Row']

export interface FinanceSummary {
  pending_cents: number
  pending_count: number
  overdue_count: number
  returned_count: number
  paid_cents: number
}

export interface MemberAccessStatus {
  member_id: string
  has_password: boolean
  password_set_at: string | null
  locked_until: string | null
}

interface OptionResult {
  id: string
  label: string
  position: number
  votes: number
  /** Porcentaje sobre los votos emitidos en la pregunta; null si no hay votos. */
  percentage: number | null
  isLeading: boolean
}

export interface QuestionResult {
  id: string
  position: number
  title: string
  status: QuestionStatus
  openedAt: string | null
  closedAt: string | null
  totalVotes: number
  eligibleMembers: number
  /** Votos emitidos / viviendas activas del censo; null si el censo está vacío. */
  participation: number | null
  options: OptionResult[]
}

export interface DashboardParticipation {
  meeting_id: string
  title: string
  meeting_date: string
  status: MeetingStatus
  voters: number
  voted_questions: number
  eligible: number
}

export interface DashboardStats {
  meetings: { total: number; draft: number; in_progress: number; finished: number }
  questions: { draft: number; open: number; closed: number }
  votes_total: number
  members_active: number
  participation: DashboardParticipation[]
}
