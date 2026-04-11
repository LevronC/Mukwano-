import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { useAuth } from '@/contexts/AuthContext'

const DISMISS_KEY = 'mukwano_verify_banner_dismissed'

export function VerifyEmailBanner() {
  const { user, refreshUser } = useAuth()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  const resend = useMutation({
    mutationFn: () => api.post('/auth/resend-verification', {}),
    onSuccess: async () => {
      toast.success('Verification email sent')
      await refreshUser()
    },
    onError: (err) => toast.error(getErrorMessage(err))
  })

  if (!user || user.emailVerified !== false || dismissed) return null

  return (
    <div
      className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'rgba(240, 165, 0, 0.14)', borderBottom: '1px solid rgba(240, 165, 0, 0.25)' }}
      role="status"
    >
      <p className="text-sm" style={{ color: 'var(--mk-white)', fontFamily: "'Inter', sans-serif" }}>
        Please verify your email address. Check your inbox for a link from Mukwano, or resend the verification email.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--mk-gold)', color: '#0a1228' }}
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
        >
          {resend.isPending ? 'Sending…' : 'Resend email'}
        </button>
        <button
          type="button"
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--mk-muted)' }}
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, '1')
            } catch {
              /* private mode */
            }
            setDismissed(true)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
