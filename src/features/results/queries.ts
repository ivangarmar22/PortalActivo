import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { resultsRepository } from '@/repositories/resultsRepository'
import { buildQuestionResults } from '@/services/resultsService'

export function useMeetingResults(meetingId: string, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.results(meetingId),
    queryFn: async () => buildQuestionResults(await resultsRepository.getMeetingResults(meetingId)),
    refetchInterval: options.refetchInterval,
  })
}

export function useMeetingVotes(meetingId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.meetingVotes(meetingId),
    queryFn: () => resultsRepository.getMeetingVotes(meetingId),
    enabled,
  })
}

export function useDashboard(communityId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(communityId),
    queryFn: () => resultsRepository.getDashboard(communityId),
    refetchInterval: 30_000,
  })
}
