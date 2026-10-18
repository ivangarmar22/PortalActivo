import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/hooks/queryKeys'
import { errorMessage } from '@/lib/errors'
import { membersRepository, type MemberInput } from '@/repositories/membersRepository'

export function useMembers(communityId: string) {
  return useQuery({
    queryKey: queryKeys.members(communityId),
    queryFn: () => membersRepository.listByCommunity(communityId),
  })
}

export function useVotingMembers(communityId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.votingMembers(communityId),
    queryFn: () => membersRepository.listActiveForVoting(communityId),
    enabled,
  })
}

export function useMemberAccess(communityId: string) {
  return useQuery({
    queryKey: queryKeys.memberAccess(communityId),
    queryFn: () => membersRepository.accessStatus(communityId),
  })
}

function useInvalidateMembers(communityId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.members(communityId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.memberAccess(communityId) })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['results'] })
  }
}

const onError = (error: unknown) => {
  toast.error(errorMessage(error))
}

export function useCreateMember(communityId: string) {
  const invalidate = useInvalidateMembers(communityId)
  return useMutation({
    mutationFn: (input: MemberInput) => membersRepository.create(communityId, input),
    onSuccess: invalidate,
    onError,
  })
}

export function useUpdateMember(communityId: string) {
  const invalidate = useInvalidateMembers(communityId)
  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string
      input: MemberInput & { isActive: boolean }
    }) => membersRepository.update(memberId, input),
    onSuccess: () => {
      invalidate()
      toast.success('Vivienda actualizada')
    },
    onError,
  })
}

export function useResetMemberPin(communityId: string) {
  const invalidate = useInvalidateMembers(communityId)
  return useMutation({
    mutationFn: (memberId: string) => membersRepository.resetPin(memberId),
    onSuccess: invalidate,
    onError,
  })
}
