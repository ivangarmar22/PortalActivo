import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

async function count(
  promise: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  const { count: value, error } = await promise
  if (error) throw toAppError(error)
  return value ?? 0
}

/** Contadores para las insignias de la navegación (solo cabeceras, sin descargar filas). */
export const countersRepository = {
  async admin(communityId: string) {
    const [openIncidents, newIncidents, pendingPosts] = await Promise.all([
      count(
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .in('status', ['reported', 'in_review', 'in_progress']),
      ),
      count(
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'reported'),
      ),
      count(
        supabase
          .from('board_posts')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'pending'),
      ),
    ])
    return { openIncidents, newIncidents, pendingPosts }
  },
}
