import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type { DashboardStats, MeetingResultRow, MeetingVoteRow } from '@/types/domain'

export const resultsRepository = {
  async getMeetingResults(meetingId: string): Promise<MeetingResultRow[]> {
    return unwrap(await supabase.rpc('get_meeting_results', { p_meeting_id: meetingId }))
  },

  /** Detalle nominal (solo administradores). */
  async getMeetingVotes(meetingId: string): Promise<MeetingVoteRow[]> {
    return unwrap(await supabase.rpc('admin_meeting_votes', { p_meeting_id: meetingId }))
  },

  async getDashboard(communityId: string): Promise<DashboardStats> {
    const data = unwrap(await supabase.rpc('admin_dashboard', { p_community_id: communityId }))
    return data as unknown as DashboardStats
  },
}
