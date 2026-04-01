import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { getLocalTimeGreeting } from '@/lib/time-greeting'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      api.get<{
        circles: Array<{ id: string; name: string; role: string; status: string }>
        pendingContributions: number
        unvotedProposals: number
        recentActivity: unknown[]
      }>('/dashboard')
  })

  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  if (isLoading) {
    return (
      <div className="mukwano-card rounded-2xl p-8 text-center">
        <p style={{ color: 'var(--mk-muted)' }}>Loading your dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-8 text-center">
        <p className="font-medium" style={{ color: '#fecaca' }}>
          {getErrorMessage(error)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="mukwano-hero p-8 md:p-12">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="chip-escrow flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>
                  group
                </span>
                {data?.circles?.length ?? 0} active circles
              </span>
            </div>
            <h1
              className="font-display text-4xl font-semibold tracking-tight md:text-5xl"
              style={{ color: '#ffffff' }}
            >
              {getLocalTimeGreeting()}, {firstName}.
            </h1>
            <p className="text-lg max-w-md" style={{ color: 'var(--mk-muted)' }}>
              Your circles have raised funds for community impact this month.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link
              to="/circles/new"
              className="mukwano-btn-primary mukwano-cursor-hover flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                add_circle
              </span>
              New Contribution
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="mukwano-card p-6">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
            Active Circles
          </p>
          <p className="mt-3 text-4xl font-bold" style={{ color: 'var(--mk-white)' }}>
            {data?.circles?.length ?? 0}
          </p>
        </div>
        <div className="mukwano-card p-6">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
            Pending Contributions
          </p>
          <p className="mt-3 text-4xl font-bold" style={{ color: 'var(--mk-gold)' }}>
            {data?.pendingContributions ?? 0}
          </p>
        </div>
        <div className="mukwano-card p-6">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
            Unvoted Proposals
          </p>
          <p className="mt-3 text-4xl font-bold" style={{ color: 'var(--mk-gold2)' }}>
            {data?.unvotedProposals ?? 0}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-display" style={{ color: 'var(--mk-white)' }}>
            Your Circles
          </h2>
          <Link
            to="/circles"
            className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--mk-gold)', fontFamily: "'Inter', sans-serif" }}
          >
            View all
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </Link>
        </div>
        <div className="space-y-3">
          {(data?.circles ?? []).length === 0 ? (
            <div className="mukwano-card rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined mb-3 block text-4xl" style={{ color: 'var(--mk-muted)' }}>
                group_work
              </span>
              <p className="font-medium" style={{ color: 'var(--mk-white)' }}>
                No circles yet
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--mk-muted)' }}>
                Create or join a circle to start contributing.
              </p>
              <Link
                to="/circles/new"
                className="mukwano-btn mukwano-btn-primary mukwano-cursor-hover mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Create a Circle
              </Link>
            </div>
          ) : (
            (data?.circles ?? []).map((circle) => (
              <Link
                key={circle.id}
                to={`/circles/${circle.id}`}
                className="group mukwano-card flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(240,165,0,0.35)]"
              >
                <div>
                  <p className="font-semibold transition-colors group-hover:text-[var(--mk-gold)]" style={{ color: 'var(--mk-white)' }}>
                    {circle.name}
                  </p>
                  <p className="mt-0.5 text-xs label-font" style={{ color: 'var(--mk-muted)' }}>
                    Role: {circle.role}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                    style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--mk-gold2)' }}
                  >
                    {circle.status}
                  </span>
                  <span
                    className="material-symbols-outlined transition-transform group-hover:translate-x-0.5"
                    style={{ fontSize: '18px', color: 'var(--mk-muted)' }}
                  >
                    chevron_right
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
