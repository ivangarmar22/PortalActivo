import { todayInMadrid } from '@/lib/format'
import type { Receipt } from '@/types/domain'

/** Un recibo está vencido si sigue pendiente después de su fecha de vencimiento (hora de Madrid). */
export function isOverdue(
  receipt: Pick<Receipt, 'status' | 'due_date'>,
  today = todayInMadrid(),
): boolean {
  return receipt.status === 'pending' && receipt.due_date < today
}
