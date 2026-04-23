import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function VerifyEmailRequiredPage() {
  const resend = useMutation({
    mutationFn: () => api.post('/auth/resend-verification', {}),
    onSuccess: () => toast.success('Verification email sent. Please check your inbox.'),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mukwano-card p-8 md:p-10 space-y-5">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>
          Verify your email to continue
        </h1>
        <p style={{ color: 'var(--mk-muted)' }}>
          Email verification must be completed before onboarding. After verification, you can continue setting up your profile.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="mukwano-btn-primary rounded-xl px-5 py-3 font-semibold"
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
          >
            {resend.isPending ? 'Sending…' : 'Resend verification email'}
          </button>
          <Link
            to="/dashboard"
            className="rounded-xl px-5 py-3 font-semibold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
          >
            Refresh status
          </Link>
        </div>
      </div>
    </div>
  )
}
