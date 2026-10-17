import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/errors'

/**
 * Mutación estándar: invalida las consultas indicadas (también si falla, porque el estado del
 * servidor puede haber cambiado) y muestra un aviso de éxito o el error en español.
 */
export function useNotifyingMutation<TVariables, TResult>({
  mutationFn,
  invalidate,
  success,
}: {
  mutationFn: (variables: TVariables) => Promise<TResult>
  invalidate: QueryKey[]
  success?: string | ((result: TResult, variables: TVariables) => string | null)
}) {
  const queryClient = useQueryClient()
  const refresh = () => {
    for (const key of invalidate) void queryClient.invalidateQueries({ queryKey: key })
  }
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      refresh()
      const message = typeof success === 'function' ? success(result, variables) : success
      if (message) toast.success(message)
    },
    onError: (error) => {
      refresh()
      toast.error(errorMessage(error))
    },
  })
}
