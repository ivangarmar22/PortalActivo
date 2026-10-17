import {
  Ban,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  Inbox,
  Lock,
  PencilLine,
  PlayCircle,
  RotateCcw,
  Undo2,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  boardStatusLabel,
  incidentStatusLabel,
  meetingStatusLabel,
  questionStatusLabel,
  receiptStatusLabel,
} from '@/lib/status'
import { cn } from '@/lib/utils'
import type {
  BoardPostStatus,
  IncidentStatus,
  MeetingStatus,
  QuestionStatus,
  ReceiptStatus,
} from '@/types/domain'

export type PillTone = 'draft' | 'open' | 'closed' | 'progress' | 'info' | 'danger'

const toneClass: Record<PillTone, string> = {
  draft: 'bg-status-draft-bg text-status-draft',
  open: 'bg-status-open-bg text-status-open',
  closed: 'bg-status-closed-bg text-status-closed',
  progress: 'bg-status-progress-bg text-status-progress',
  info: 'bg-status-info-bg text-status-info',
  danger: 'bg-status-danger-bg text-status-danger',
}

/** Estado con icono + texto + color: nunca se distingue solo por el color. */
export function Pill({
  tone,
  icon: Icon,
  label,
  size = 'sm',
  className,
}: {
  tone: PillTone
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-current/10 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        toneClass[tone],
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      {label}
    </span>
  )
}

const questionStyles: Record<QuestionStatus, [PillTone, LucideIcon]> = {
  draft: ['draft', PencilLine],
  open: ['open', CircleDot],
  closed: ['closed', Lock],
}

const meetingStyles: Record<MeetingStatus, [PillTone, LucideIcon]> = {
  draft: ['draft', PencilLine],
  in_progress: ['progress', PlayCircle],
  finished: ['closed', CheckCircle2],
}

const incidentStyles: Record<IncidentStatus, [PillTone, LucideIcon]> = {
  reported: ['draft', Inbox],
  in_review: ['info', Eye],
  in_progress: ['progress', Wrench],
  resolved: ['open', CheckCircle2],
  dismissed: ['closed', Ban],
}

const receiptStyles: Record<ReceiptStatus, [PillTone, LucideIcon]> = {
  pending: ['draft', Clock3],
  paid: ['open', CheckCircle2],
  returned: ['danger', RotateCcw],
}

const boardStyles: Record<BoardPostStatus, [PillTone, LucideIcon]> = {
  pending: ['draft', Clock3],
  approved: ['open', CheckCircle2],
  rejected: ['danger', XCircle],
  withdrawn: ['closed', Undo2],
}

type Size = { size?: 'sm' | 'md' }

export function QuestionStatusBadge({ status, size }: { status: QuestionStatus } & Size) {
  const [tone, icon] = questionStyles[status]
  return <Pill tone={tone} icon={icon} label={questionStatusLabel[status]} size={size} />
}

export function MeetingStatusBadge({ status, size }: { status: MeetingStatus } & Size) {
  const [tone, icon] = meetingStyles[status]
  return <Pill tone={tone} icon={icon} label={meetingStatusLabel[status]} size={size} />
}

export function IncidentStatusBadge({ status, size }: { status: IncidentStatus } & Size) {
  const [tone, icon] = incidentStyles[status]
  return <Pill tone={tone} icon={icon} label={incidentStatusLabel[status]} size={size} />
}

export function ReceiptStatusBadge({
  status,
  overdue = false,
  size,
}: { status: ReceiptStatus; overdue?: boolean } & Size) {
  if (status === 'pending' && overdue) {
    return <Pill tone="danger" icon={Clock3} label="Vencido" size={size} />
  }
  const [tone, icon] = receiptStyles[status]
  return <Pill tone={tone} icon={icon} label={receiptStatusLabel[status]} size={size} />
}

export function BoardStatusBadge({ status, size }: { status: BoardPostStatus } & Size) {
  const [tone, icon] = boardStyles[status]
  return <Pill tone={tone} icon={icon} label={boardStatusLabel[status]} size={size} />
}
