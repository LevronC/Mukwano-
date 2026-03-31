import type { ApiError } from '@/api/types'

export function getErrorMessage(error: unknown): string {
  const apiError = error as ApiError
  return apiError?.error?.message ?? 'Something went wrong'
}

export function getErrorField(error: unknown): string | null {
  const apiError = error as ApiError
  return apiError?.error?.field ?? null
}
