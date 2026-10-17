import { AppError, toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/repositories/unwrap'
import type {
  Incident,
  IncidentCategory,
  IncidentResponsible,
  IncidentStatus,
  IncidentWithUpdates,
} from '@/types/domain'

export interface IncidentReportInput {
  title: string
  description: string
  location: string
  category: IncidentCategory
  photoPath: string | null
}

export interface IncidentUpdateInput {
  status: IncidentStatus
  responsibleType: IncidentResponsible | null
  responsibleName: string
  estimatedResolution: string | null
  message: string
}

export const incidentsRepository = {
  async listByCommunity(communityId: string): Promise<Incident[]> {
    return unwrap(
      await supabase
        .from('incidents')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false }),
    )
  },

  async get(incidentId: string): Promise<IncidentWithUpdates> {
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*, incident_updates(*)')
      .eq('id', incidentId)
      .maybeSingle()
    if (error) throw toAppError(error)
    if (!incident) throw new AppError('incident_not_found')
    return {
      ...incident,
      incident_updates: [...incident.incident_updates].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    }
  },

  async report(input: IncidentReportInput): Promise<string> {
    return unwrap(
      await supabase.rpc('member_report_incident', {
        p_title: input.title,
        p_description: input.description,
        p_location: input.location,
        p_category: input.category,
        ...(input.photoPath ? { p_photo_path: input.photoPath } : {}),
      }),
    )
  },

  async adminCreate(communityId: string, input: IncidentReportInput): Promise<string> {
    return unwrap(
      await supabase.rpc('admin_create_incident', {
        p_community_id: communityId,
        p_title: input.title,
        p_description: input.description,
        p_location: input.location,
        p_category: input.category,
        ...(input.photoPath ? { p_photo_path: input.photoPath } : {}),
      }),
    )
  },

  async adminUpdate(incidentId: string, input: IncidentUpdateInput): Promise<void> {
    unwrap(
      await supabase.rpc('admin_update_incident', {
        p_incident_id: incidentId,
        p_status: input.status,
        p_responsible_type: input.responsibleType as IncidentResponsible,
        p_responsible_name: input.responsibleName,
        p_estimated_resolution: input.estimatedResolution as string,
        p_message: input.message,
      }),
    )
  },
}
