import { Link } from 'react-router-dom'

export function OnboardingCompletePage() {
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
        <Link
          to="/onboarding/sector"
          className="block text-center text-sm font-medium pt-2"
          style={{ color: 'var(--mk-muted)' }}
        >
          Change preferences
        </Link>
      </div>
    </div>
  )
}
