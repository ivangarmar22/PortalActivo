import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type {
  DashboardStats,
  ManualVoteAudit,
  MeetingResultRow,
  MeetingVoteRow,
} from '@/types/domain'

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function parseManualHistory(value: unknown): ManualVoteAudit[] {
  if (!isUnknownArray(value)) {
    throw new Error('El historial de votos presenciales no es válido.')
  }
  return value.map((entry) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('option_label' in entry) ||
      typeof entry.option_label !== 'string' ||
      !('changed_by_name' in entry) ||
      typeof entry.changed_by_name !== 'string' ||
      !('changed_at' in entry) ||
      typeof entry.changed_at !== 'string'
    ) {
      throw new Error('El historial de votos presenciales contiene datos no válidos.')
    }
    return {
      option_label: entry.option_label,
      changed_by_name: entry.changed_by_name,
      changed_at: entry.changed_at,
    }
  })
}

export const resultsRepository = {
  async getMeetingResults(meetingId: string): Promise<MeetingResultRow[]> {
    return unwrap(await supabase.rpc('get_meeting_results', { p_meeting_id: meetingId }))
  },

  /** Detalle nominal (solo administradores). */
  async getMeetingVotes(meetingId: string): Promise<MeetingVoteRow[]> {
    const rows = unwrap(await supabase.rpc('admin_meeting_votes', { p_meeting_id: meetingId }))
    return rows.map((row) => ({ ...row, manual_history: parseManualHistory(row.manual_history) }))
  },

  async getDashboard(communityId: string): Promise<DashboardStats> {
    const data = unwrap(await supabase.rpc('admin_dashboard', { p_community_id: communityId }))
    return data as unknown as DashboardStats
  },
}
