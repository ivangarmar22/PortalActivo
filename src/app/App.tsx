import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from '@/app/router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppError, toAppError } from '@/lib/errors'

const NON_RETRYABLE = new Set([
  'forbidden',
  'meeting_not_found',
  'question_not_found',
  'session_expired',
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const appError = error instanceof AppError ? error : toAppError(error)
        return !NON_RETRYABLE.has(appError.code) && failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
