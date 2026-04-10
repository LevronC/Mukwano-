import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { AUTH_REDIRECT_ERROR_MESSAGE } from '@/api/client'

export interface Notification {
  id: string
  event: string
  body: string
  read: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

const POLL_INTERVAL_MS = 30_000

export function useNotifications(enabled: boolean) {
  const queryClient = useQueryClient()

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationsResponse>('/notifications'),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === AUTH_REDIRECT_ERROR_MESSAGE) return false
      return failureCount < 2
    }
  })

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all')
    queryClient.setQueryData<NotificationsResponse>(['notifications'], (prev) => {
      if (!prev) return prev
      return {
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0
      }
    })
  }, [queryClient])

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    markAllRead
  }
}
