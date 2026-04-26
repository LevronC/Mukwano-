import { useQuery, useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { getLocalTimeGreeting } from '@/lib/time-greeting'
import { Progress } from '@/components/ui/progress'
import { DashboardCurrencyConverter } from '@/components/dashboard/DashboardCurrencyConverter'

type ActivityItem = {
  id: string
  circleId: string
  actorId: string | null
  type: string
  createdAt: string
  metadata: Record<string, unknown>
}

type DashboardData = {
  circles: Array<{ id: string; name: string; role: string; status: string; goalAmount: number; currency: string }>
  pendingContributions: number
  unvotedProposals: number
  recentActivity: ActivityItem[]
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function activityIcon(type: string): { icon: string; color: string } {
  switch (type) {
    case 'CONTRIBUTION_SUBMITTED': return { icon: 'payments', color: 'var(--mk-gold)' }
    case 'CONTRIBUTION_VERIFIED': return { icon: 'verified', color: '#4ade80' }
    case 'PROPOSAL_CREATED': return { icon: 'ballot', color: 'var(--mk-gold)' }
    case 'PROPOSAL_CLOSED_PASSED': return { icon: 'check_circle', color: '#4ade80' }
    case 'PROPOSAL_CLOSED_FAILED': return { icon: 'cancel', color: '#f87171' }
    case 'PROPOSAL_CANCELLED': return { icon: 'block', color: 'var(--mk-muted)' }
    case 'VOTE_CAST': return { icon: 'how_to_vote', color: 'var(--mk-gold2)' }
    case 'PROJECT_CREATED': return { icon: 'construction', color: 'var(--mk-gold)' }
    case 'PROJECT_COMPLETE': return { icon: 'task_alt', color: '#4ade80' }
    case 'PROJECT_UPDATE_POSTED': return { icon: 'update', color: 'var(--mk-gold2)' }
    default: return { icon: 'info', color: 'var(--mk-muted)' }
  }
}

function formatActivityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  const circles = data?.circles ?? []

  const treasuryQueries = useQueries({
    queries: circles.map((circle) => ({
      queryKey: ['treasury', circle.id],
      queryFn: () => api.get<{ balance: string; currency: string }>(`/circles/${circle.id}/treasury`),
      enabled: circles.length > 0,
    })),
  })

  const treasuryMap = new Map<string, number>()
  circles.forEach((circle, idx) => {
    const result = treasuryQueries[idx]
    if (result?.data) {
      treasuryMap.set(circle.id, parseFloat(result.data.balance))
    }
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

  const recentActivity = (data?.recentActivity ?? []).slice(0, 10)

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
                {circles.length} active circles
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
              to={circles.length === 1 ? `/circles/${circles[0].id}/contributions/new` : '/circles'}
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
            {circles.length}
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
          {circles.length === 0 ? (
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
            circles.map((circle) => {
              const balance = treasuryMap.get(circle.id) ?? 0
              const goalAmount = Number(circle.goalAmount) || 0
              const progressValue = goalAmount > 0 ? (balance / goalAmount) * 100 : 0
              const currency = circle.currency ?? 'USD'
              const fmt = (n: number) =>
                n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              const progressLabel = `${currency} ${fmt(balance)} / ${currency} ${fmt(goalAmount)} goal`

              return (
                <Link
                  key={circle.id}
                  to={`/circles/${circle.id}`}
                  className="group mukwano-card flex flex-col rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(240,165,0,0.35)]"
                >
                  <div className="flex items-center justify-between">
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
                  </div>
                  <div className="mt-3">
                    <Progress value={progressValue} label={progressLabel} percentage={true} />
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </section>

      <DashboardCurrencyConverter />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-display" style={{ color: 'var(--mk-white)' }}>
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div className="mukwano-card rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined mb-3 block text-4xl" style={{ color: 'var(--mk-muted)' }}>
              info
            </span>
            <p className="font-medium" style={{ color: 'var(--mk-white)' }}>
              No recent activity yet
            </p>
          </div>
        ) : (
          <div className="mukwano-card rounded-2xl overflow-hidden">
            {recentActivity.map((item, idx) => {
              const { icon, color } = activityIcon(item.type)
              const isLast = idx === recentActivity.length - 1
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={
                    isLast
                      ? undefined
                      : { borderBottom: '1px solid rgba(190,201,195,0.10)' }
                  }
                >
                  <span
                    className="material-symbols-outlined shrink-0"
                    style={{ fontSize: '20px', color, fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--mk-white)' }}>
                    {formatActivityType(item.type)}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--mk-muted)' }}>
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
