export const queryKeys = {
  dashboard: (communityId: string) => ['dashboard', communityId] as const,
  meetings: (communityId: string) => ['meetings', communityId] as const,
  meeting: (meetingId: string) => ['meeting', meetingId] as const,
  questions: (meetingId: string) => ['questions', meetingId] as const,
  results: (meetingId: string) => ['results', meetingId] as const,
  meetingVotes: (meetingId: string) => ['meetingVotes', meetingId] as const,
  myVotes: (meetingId: string) => ['myVotes', meetingId] as const,
  members: (communityId: string) => ['members', communityId] as const,
  votingMembers: (communityId: string) => ['votingMembers', communityId] as const,
  memberAccess: (communityId: string) => ['memberAccess', communityId] as const,
  adminCounters: (communityId: string) => ['adminCounters', communityId] as const,

  incidents: (communityId: string) => ['incidents', communityId] as const,
  incident: (incidentId: string) => ['incident', incidentId] as const,
  spaces: (communityId: string) => ['spaces', communityId] as const,
  availability: (spaceId: string, from: string) => ['availability', spaceId, from] as const,
  myReservations: () => ['myReservations'] as const,
  adminReservations: (communityId: string) => ['adminReservations', communityId] as const,
  notices: (communityId: string) => ['notices', communityId] as const,
  board: (communityId: string) => ['board', communityId] as const,
  myReceipts: () => ['myReceipts'] as const,
  adminReceipts: (communityId: string) => ['adminReceipts', communityId] as const,
  financeSummary: (communityId: string) => ['financeSummary', communityId] as const,
  documents: (communityId: string) => ['documents', communityId] as const,
}

/** Todo lo que depende del estado de una reunión (para invalidar tras una operación). */
export function meetingScopedKeys(meetingId: string) {
  return [
    queryKeys.meeting(meetingId),
    queryKeys.questions(meetingId),
    queryKeys.results(meetingId),
    queryKeys.meetingVotes(meetingId),
    queryKeys.myVotes(meetingId),
  ]
}
