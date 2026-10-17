import { supabase } from '@/lib/supabase'

/**
 * Avisa cuando cambian la reunión, sus preguntas o (si se pasan ids) sus votos.
 * Realtime respeta RLS: cada usuario solo recibe los cambios que puede leer.
 * Es una mejora de experiencia; la consulta periódica de TanStack Query actúa como respaldo.
 */
export function subscribeToMeeting(
  meetingId: string,
  onChange: () => void,
  questionIdsForVotes: string[] = [],
): () => void {
  const channel = supabase
    .channel(`meeting:${meetingId}:${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'questions', filter: `meeting_id=eq.${meetingId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `id=eq.${meetingId}` },
      onChange,
    )

  if (questionIdsForVotes.length > 0) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `question_id=in.(${questionIdsForVotes.join(',')})`,
      },
      onChange,
    )
  }

  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

/** Suscripción genérica a una tabla con filtro (p. ej. «community_id=eq.…»). */
export function subscribeToTable(table: string, filter: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`${table}:${filter}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
