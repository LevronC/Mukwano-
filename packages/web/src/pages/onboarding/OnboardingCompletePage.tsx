import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PENDING_INVITE_KEY } from '@/pages/circles/JoinByCodePage'

export function OnboardingCompletePage() {
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null)

  useEffect(() => {
    const code = localStorage.getItem(PENDING_INVITE_KEY)
    if (code) {
      setPendingInviteCode(code)
      localStorage.removeItem(PENDING_INVITE_KEY)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'transparent' }}>
      <div className="mukwano-card w-full max-w-2xl space-y-8 p-8 md:p-10">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(240,165,0,0.15)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--mk-gold)' }}>check</span>
          </div>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            You are all set.
          </h1>
          <p className="mx-auto max-w-lg text-base" style={{ color: 'var(--mk-muted)' }}>
            Your onboarding preferences are saved. Explore circles and start contributing to projects with governance enforced on the server.
          </p>
        </div>

        {pendingInviteCode ? (
          <div className="space-y-3">
            <div
              className="rounded-xl px-4 py-3 text-center text-sm"
              style={{ background: 'rgba(240,165,0,0.10)', border: '1px solid rgba(240,165,0,0.25)', color: 'var(--mk-gold)' }}
            >
              <span className="material-symbols-outlined align-middle mr-1.5" style={{ fontSize: '16px' }}>mail</span>
              You were invited to join a circle — click below to complete.
            </div>
            <Link
              to={`/join/${pendingInviteCode}`}
              className="mukwano-btn-primary block rounded-xl px-6 py-3 text-center font-semibold"
            >
              Join your circle
            </Link>
            <Link
              to="/dashboard"
              className="block rounded-xl px-6 py-3 text-center font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
            >
              Go to dashboard instead
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/dashboard"
              className="mukwano-btn-primary rounded-xl px-6 py-3 text-center font-semibold"
            >
              Go to dashboard
            </Link>
            <Link
              to="/explore"
              className="rounded-xl px-6 py-3 text-center font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
            >
              Explore circles
            </Link>
          </div>
        )}

        <Link
          to="/profile"
          className="block text-center text-sm font-medium pt-2"
          style={{ color: 'var(--mk-muted)' }}
        >
          Update country or sector in profile
        </Link>
      </div>
    </div>
  )
}
