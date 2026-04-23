import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isoCodeToFlagEmoji } from '@/lib/onboarding-display'

/** Optional step: you are the only member in your U.S. state on Mukwano — browse wider circles, then continue. */
export function OnboardingExploreSoloPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-4 text-[var(--mk-muted)]">Loading...</div>
  }
  if (user && (user.residenceCountry !== 'United States' || !user.residenceRegion)) {
    return <Navigate to="/onboarding/complete" replace />
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-16 pb-36">
        <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-gold)' }}>
          Almost there
        </p>
        <h1
          className="mb-2 text-3xl font-semibold"
          style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Explore other circles
        </h1>
        <p className="mb-2 text-base" style={{ color: 'var(--mk-muted)' }}>
          You are the only Mukwano member in{' '}
          <span className="font-semibold" style={{ color: 'var(--mk-white)' }}>
            {user?.residenceRegion}
            {user?.residenceRegion ? ', ' : ''}
            <span className="inline-flex items-center gap-1">
              {isoCodeToFlagEmoji('US')}
              United States
            </span>
          </span>{' '}
          so far. Take a look at nearby or thematic circles, find a niche you care about, then come back to finish
          setup.
        </p>
        <p className="mb-10 text-sm" style={{ color: 'var(--mk-muted)' }}>
          Browsing is optional — you can go straight to the welcome screen whenever you are ready.
        </p>

        <div className="space-y-3">
          <Link
            to="/explore"
            className="mukwano-btn-primary block w-full rounded-xl px-6 py-3 text-center font-semibold"
          >
            Open Explore
          </Link>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 w-full px-6 py-5 glass-nav"
        style={{ background: 'rgba(6,13,31,0.92)', borderTop: '1px solid rgba(240,165,0,0.12)' }}
      >
        <div className="mx-auto flex max-w-2xl justify-end">
          <button
            className="mukwano-btn-primary rounded-xl px-8 py-3 font-semibold"
            type="button"
            onClick={() => navigate('/onboarding/complete')}
          >
            Continue to welcome
          </button>
        </div>
      </div>
    </div>
  )
}
