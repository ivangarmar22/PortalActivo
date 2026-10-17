import { AppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { unwrap, unwrapRequired } from '@/repositories/unwrap'
import type { Meeting } from '@/types/domain'

export interface MeetingInput {
  title: string
  description: string | null
  meetingDate: string
}

export const meetingsRepository = {
  async listByCommunity(communityId: string): Promise<Meeting[]> {
    return unwrap(
      await supabase
        .from('meetings')
        .select('*')
        .eq('community_id', communityId)
        .order('meeting_date', { ascending: false }),
    )
  },

  async get(meetingId: string): Promise<Meeting> {
    return unwrapRequired(
      await supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle(),
      () => new AppError('meeting_not_found'),
    )
  },

  async create(communityId: string, input: MeetingInput): Promise<Meeting> {
    return unwrap(
      await supabase
        .from('meetings')
        .insert({
          community_id: communityId,
          title: input.title,
          description: input.description,
          meeting_date: input.meetingDate,
        })
        .select('*')
        .single(),
    )
  },

  async update(meetingId: string, input: MeetingInput): Promise<void> {
    unwrap(
      await supabase
        .from('meetings')
        .update({
          title: input.title,
          description: input.description,
          meeting_date: input.meetingDate,
        })
        .eq('id', meetingId),
    )
  },

  async remove(meetingId: string): Promise<void> {
    unwrap(await supabase.from('meetings').delete().eq('id', meetingId))
  },

  async updateMinutesText(meetingId: string, content: string | null): Promise<void> {
    unwrap(await supabase.from('meetings').update({ minutes_content: content }).eq('id', meetingId))
  },

  async setMinutesFile(
    meetingId: string,
    file: { path: string; name: string } | null,
  ): Promise<void> {
    unwrap(
      await supabase
        .from('meetings')
        .update({ minutes_file_path: file?.path ?? null, minutes_file_name: file?.name ?? null })
        .eq('id', meetingId),
    )
  },

  async start(meetingId: string): Promise<void> {
    unwrap(await supabase.rpc('start_meeting', { p_meeting_id: meetingId }))
  },

  /** Devuelve cuántas preguntas abiertas se han cerrado al finalizar. */
  async finish(meetingId: string): Promise<number> {
    return unwrap(await supabase.rpc('finish_meeting', { p_meeting_id: meetingId }))
  },
}
