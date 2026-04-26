import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { flagEmojiForCountryName } from '@/lib/onboarding-display'

export const PENDING_INVITE_KEY = 'mukwano_pending_invite'

const mukwanoLogo = '/assets/mukwano-logo.png'

type CirclePreview = {
  id: string
  name: string
  description?: string | null
  country?: string | null
  goalAmount: string
  currency: string
  memberCount: number
  inviteCode?: string | null
}

export function JoinByCodePage() {
  const { code = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: circle, isLoading, error } = useQuery({
    queryKey: ['invite-preview', code],
    queryFn: () => api.get<CirclePreview>(`/circles/join/${code}`),
    enabled: !!code,
    retry: false
  })

  // Persist the invite code so the post-onboarding page can redirect back here
  useEffect(() => {
    if (!user && code) {
      localStorage.setItem(PENDING_INVITE_KEY, code)
    }
  }, [user, code])

  const join = useMutation({
    mutationFn: () => api.post(`/circles/join/${code}`, {}),
    onSuccess: () => {
      toast.success(`Welcome to ${circle?.name ?? 'the circle'}!`)
      navigate(`/circles/${circle?.id}`)
    },
    onError: (e) => {
      const msg = getErrorMessage(e)
      if (msg.includes('ALREADY_MEMBER')) {
        toast.info('You are already a member — taking you there.')
        navigate(`/circles/${circle?.id}`)
      } else {
        toast.error(msg)
      }
    }
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--mk-navy, #060d1f)' }}>
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(6,13,31,0.88)', borderColor: 'rgba(240,165,0,0.12)' }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to={user ? '/dashboard' : '/'}>
            <img src={mukwanoLogo} alt="Mukwano" className="h-10 w-auto rounded-xl bg-white/95 p-1" />
          </Link>
          {!user && (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium" style={{ color: 'var(--mk-muted)' }}>Sign in</Link>
              <Link to="/signup" className="mukwano-btn-primary rounded-xl px-5 py-2 text-sm font-semibold">Join Mukwano</Link>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-md px-6 py-16 flex-1">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--mk-gold)', borderTopColor: 'transparent' }} />
            <p className="mt-4 text-sm" style={{ color: 'var(--mk-muted)' }}>Loading invite…</p>
          </div>
        ) : error ? (
          <div className="mukwano-card p-8 text-center space-y-4">
            <span className="material-symbols-outlined text-5xl" style={{ color: '#f87171' }}>link_off</span>
            <p className="text-lg font-semibold" style={{ color: 'var(--mk-white)' }}>Invite not found</p>
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              This link may have expired or been regenerated. Ask a circle admin for a new link.
            </p>
            <Link to="/explore" className="mukwano-btn-primary inline-block rounded-xl px-6 py-2.5 text-sm font-semibold">
              Browse circles
            </Link>
          </div>
        ) : circle ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--mk-gold)' }}>
                You've been invited
              </p>
              <h1 className="text-3xl font-semibold font-display" style={{ color: 'var(--mk-white)' }}>
                {circle.name}
              </h1>
              {circle.country && (
                <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                  {flagEmojiForCountryName(circle.country)} {circle.country}
                </p>
              )}
            </div>

            <div className="mukwano-card p-6 space-y-4">
              {circle.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-offwhite)' }}>
                  {circle.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--mk-navy2)' }}>
                  <p className="text-2xl font-bold" style={{ color: 'var(--mk-gold)' }}>{circle.memberCount}</p>
                  <p className="text-xs mt-1 uppercase tracking-wider font-bold" style={{ color: 'var(--mk-muted)' }}>Members</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--mk-navy2)' }}>
                  <p className="text-2xl font-bold" style={{ color: 'var(--mk-gold)' }}>
                    {parseFloat(circle.goalAmount).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1 uppercase tracking-wider font-bold" style={{ color: 'var(--mk-muted)' }}>Goal ({circle.currency})</p>
                </div>
              </div>
            </div>

            {user ? (
              <button
                className="mukwano-btn-primary w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold"
                onClick={() => join.mutate()}
                disabled={join.isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
                {join.isPending ? 'Joining…' : 'Join this Circle'}
              </button>
            ) : (
              <div className="space-y-3">
                <Link
                  to={`/signup?next=/join/${code}`}
                  className="mukwano-btn-primary w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
                  Create an account to join
                </Link>
                <p className="text-center text-sm" style={{ color: 'var(--mk-muted)' }}>
                  Already a member?{' '}
                  <Link to={`/login?next=/join/${code}`} className="font-semibold" style={{ color: 'var(--mk-gold)' }}>
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
