import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts'
import { formatMoney } from '@/lib/utils'

const mukwanoLogo = '/assets/mukwano-logo.png'

const NAV_ITEMS = [
  { tab: 'pending', label: 'Verifications', icon: 'verified_user' },
  { tab: 'analytics', label: 'Analytics', icon: 'insights' },
  { tab: 'circles', label: 'Circles', icon: 'groups' },
  { tab: 'proposals', label: 'Proposals', icon: 'gavel' },
  { tab: 'members', label: 'Members', icon: 'group' },
  { tab: 'support', label: 'Support', icon: 'flag' },
  { tab: 'ledger', label: 'Ledger', icon: 'account_balance_wallet' },
  { tab: 'activity', label: 'Activity', icon: 'analytics' },
]

function formatActivityType(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    .join(' ')
}

function summarizeMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .slice(0, 3)

  if (entries.length === 0) return 'No metadata'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' • ')
}

export function AdminPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'pending'

  const pending = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () =>
      api.get<
        Array<{ id: string; amount: string; currency: string; user: { displayName: string; email: string }; circle: { id: string; name: string } }>
      >('/admin/contributions/pending')
  })
  const members = useQuery({
    queryKey: ['admin-members'],
    queryFn: () =>
      api.get<
        Array<{
          id: string
          displayName: string
          email: string
          isGlobalAdmin: boolean
          platformRole?: string
          country?: string | null
          sector?: string | null
        }>
      >('/admin/members')
  })
  const circles = useQuery({
    queryKey: ['admin-circles'],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; status: string; country?: string | null; sector?: string | null }>>('/admin/circles')
  })
  const proposalsAdmin = useQuery({
    queryKey: ['admin-proposals'],
    queryFn: () =>
      api.get<Array<{ id: string; circleId: string; title: string; status: string; createdAt: string }>>('/admin/proposals')
  })
  const ledger = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: () =>
      api.get<Array<{ id: string; type: string; amount: string; currency: string; recordedAt: string; circle: { name: string } }>>('/admin/ledger')
  })
  const activity = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () =>
      api.get<
        Array<{
          id: string
          action: string
          subjectUserId?: string | null
          createdAt: string
          metadata: Record<string, unknown>
        }>
      >('/admin/activity')
  })
  const metrics = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () =>
      api.get<{ pendingVerifications: number; totalContributed: number; escrowBalance: number; activeCircles: number; activeProjects: number; currency: string }>('/admin/metrics')
  })

  const userGrowth = useQuery({
    queryKey: ['admin-analytics-user-growth'],
    queryFn: () => api.get<{ series: Array<{ period: string; count: number }> }>('/admin/analytics/user-growth?months=12'),
    enabled: tab === 'analytics'
  })
  const contribSeries = useQuery({
    queryKey: ['admin-analytics-contributions'],
    queryFn: () =>
      api.get<{ series: Array<{ period: string; amount: number }>; currency: string }>(
        '/admin/analytics/contributions-timeseries?months=12'
      ),
    enabled: tab === 'analytics'
  })
  const proposalsSummary = useQuery({
    queryKey: ['admin-analytics-proposals'],
    queryFn: () =>
      api.get<{
        byStatus: Array<{ status: string; count: number }>
        passed: number
        failed: number
        successRatePercent: number | null
      }>('/admin/analytics/proposals-summary'),
    enabled: tab === 'analytics'
  })
  const treasuryTrends = useQuery({
    queryKey: ['admin-analytics-treasury'],
    queryFn: () =>
      api.get<{ series: Array<{ period: string; netAmount: number }>; currency: string }>(
        '/admin/analytics/treasury-trends?months=12'
      ),
    enabled: tab === 'analytics'
  })

  const supportFlags = useQuery({
    queryKey: ['admin-support-flags'],
    queryFn: () =>
      api.get<
        Array<{
          id: string
          status: string
          reason: string
          createdAt: string
          reporter: { displayName: string; email: string }
          subjectUser: { id: string; displayName: string; email: string } | null
        }>
      >('/admin/support/flags'),
    enabled: tab === 'support'
  })

  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contributions/${id}/verify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] })
      qc.invalidateQueries({ queryKey: ['admin-ledger'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      qc.invalidateQueries({ queryKey: ['circles'] })
      qc.invalidateQueries({ queryKey: ['circles-explore'] })
      toast.success('Contribution verified')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const reject = useMutation({
    mutationFn: (payload: { id: string; reason: string }) =>
      api.patch(`/admin/contributions/${payload.id}/reject`, { reason: payload.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      qc.invalidateQueries({ queryKey: ['circles'] })
      qc.invalidateQueries({ queryKey: ['circles-explore'] })
      toast.success('Contribution rejected')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })
  const disableCircle = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/circles/${id}/disable`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-circles'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      toast.success('Circle disabled')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })
  const deleteCircle = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/circles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-circles'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      toast.success('Circle deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })
  const disableProposal = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/proposals/${id}/disable`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-proposals'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      toast.success('Proposal disabled')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })
  const updateSupportFlag = useMutation({
    mutationFn: (payload: { id: string; status: 'open' | 'triaged' | 'closed' }) =>
      api.patch(`/admin/support/flags/${payload.id}`, { status: payload.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-flags'] })
      toast.success('Flag updated')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const createSupportFlag = useMutation({
    mutationFn: (payload: { subjectUserId?: string; reason: string }) =>
      api.post('/support/flags', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-flags'] })
      toast.success('Flag submitted')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const deleteProposal = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/proposals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-proposals'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      toast.success('Proposal deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const isGlobalAdmin = Boolean(user?.isGlobalAdmin || user?.platformRole === 'GLOBAL_ADMIN')
  if (!isGlobalAdmin) return <Navigate replace to="/dashboard" />

  function generateReport() {
    const ts = new Date().toISOString().slice(0, 10)

    const sections: string[] = [
      `Mukwano Admin Report — ${ts}`,
      '',
      '=== METRICS ===',
      `Pending Verifications,${metrics.data?.pendingVerifications ?? 0}`,
      `Active Circles,${metrics.data?.activeCircles ?? 0}`,
      `Active Projects,${metrics.data?.activeProjects ?? 0}`,
      `Total Contributed (${metrics.data?.currency ?? 'USD'}),${metrics.data?.totalContributed ?? 0}`,
      `Escrow Balance (${metrics.data?.currency ?? 'USD'}),${metrics.data?.escrowBalance ?? 0}`,
      '',
      '=== PENDING CONTRIBUTIONS ===',
      'Member,Email,Circle,Amount,Currency',
      ...(pending.data ?? []).map((c) =>
        [c.user?.displayName ?? '', c.user?.email ?? '', c.circle?.name ?? '', c.amount, c.currency].join(',')
      ),
      '',
      '=== LEDGER ===',
      'Circle,Type,Amount,Currency,Date',
      ...(ledger.data ?? []).map((e) =>
        [e.circle?.name ?? '', e.type, e.amount, e.currency, new Date(e.recordedAt).toLocaleString()].join(',')
      ),
      '',
      '=== MEMBERS ===',
      'Name,Email,Country,Role',
      ...(members.data ?? []).map((m) =>
        [
          m.displayName,
          m.email,
          m.country ?? '',
          m.platformRole === 'GLOBAL_ADMIN' || m.isGlobalAdmin ? 'Global Admin' : 'Member'
        ].join(',')
      ),
      '',
      '=== ACTIVITY ===',
      'Type,Summary,Date',
      ...(activity.data ?? []).map((a) =>
        [
          formatActivityType(a.action),
          summarizeMetadata(a.metadata),
          new Date(a.createdAt).toLocaleString()
        ].join(',')
      ),
    ]

    const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mukwano-report-${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const isLoading =
    pending.isLoading ||
    circles.isLoading ||
    proposalsAdmin.isLoading ||
    members.isLoading ||
    ledger.isLoading ||
    activity.isLoading ||
    metrics.isLoading ||
    (tab === 'analytics' &&
      (userGrowth.isLoading || contribSeries.isLoading || proposalsSummary.isLoading || treasuryTrends.isLoading)) ||
    (tab === 'support' && supportFlags.isLoading)
  const error =
    pending.error ??
    circles.error ??
    proposalsAdmin.error ??
    members.error ??
    ledger.error ??
    activity.error ??
    metrics.error ??
    (tab === 'analytics'
      ? userGrowth.error ?? contribSeries.error ?? proposalsSummary.error ?? treasuryTrends.error
      : null) ??
    (tab === 'support' ? supportFlags.error : null)

  return (
    <div className="flex gap-0 -mx-6 min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 py-8 px-4 sticky top-20 h-[calc(100vh-5rem)]"
        style={{ background: 'var(--mk-navy2)' }}
      >
        <div className="mb-8 px-2">
          <img src={mukwanoLogo} alt="Mukwano logo" className="h-14 w-auto mb-2" />
          <h1 className="text-base font-semibold" style={{ color: 'var(--mk-gold)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Admin</h1>
          <p className="text-xs mt-0.5 label-font" style={{ color: 'var(--mk-muted)' }}>Governance Panel</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ tab: t, label, icon }) => (
            <button
              key={t}
              onClick={() => setParams({ tab: t })}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-left transition-all"
              style={
                tab === t
                  ? { background: '#ffffff', color: 'var(--mk-gold)', fontWeight: 600, boxShadow: '0 2px 8px rgba(28,28,26,0.06)' }
                  : { color: 'var(--mk-muted)' }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(190,201,195,0.2)' }}>
          <button
            className="w-full mukwano-btn-primary flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm"
            onClick={generateReport}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
            Generate Report
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        {/* Mobile tabs */}
        <div className="flex gap-1 rounded-2xl p-1 mb-8 md:hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {NAV_ITEMS.map(({ tab: t, label }) => (
            <button
              key={t}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              style={
                tab === t
                  ? { background: '#ffffff', color: 'var(--mk-gold)', boxShadow: '0 2px 8px rgba(28,28,26,0.06)' }
                  : { color: 'var(--mk-muted)' }
              }
              onClick={() => setParams({ tab: t })}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--mk-navy2)' }}>
            <p style={{ color: 'var(--mk-muted)' }}>Loading admin data...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#ffe9e7' }}>
            <p className="font-medium" style={{ color: '#7a1f1f' }}>{getErrorMessage(error)}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="mukwano-card p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Pending</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: '#6b3f00' }}>{metrics.data?.pendingVerifications ?? 0}</p>
          </div>
          <div className="mukwano-card p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Active Circles</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--mk-white)' }}>{metrics.data?.activeCircles ?? 0}</p>
          </div>
          <div className="mukwano-card p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Active Projects</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--mk-white)' }}>{metrics.data?.activeProjects ?? 0}</p>
          </div>
          <div className="mukwano-card p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Escrow Balance</p>
            <p className="mt-2 text-2xl font-bold truncate" style={{ color: 'var(--mk-gold)' }}>
              {formatMoney(metrics.data?.escrowBalance ?? 0, metrics.data?.currency ?? 'USD')}
            </p>
            <p className="mt-1 text-[0.625rem] label-font" style={{ color: 'var(--mk-muted)' }}>Contributions minus disbursements</p>
          </div>
          <div className="mukwano-card p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Total Contributed</p>
            <p className="mt-2 text-2xl font-bold truncate" style={{ color: 'var(--mk-white)' }}>
              {formatMoney(metrics.data?.totalContributed ?? 0, metrics.data?.currency ?? 'USD')}
            </p>
            <p className="mt-1 text-[0.625rem] label-font" style={{ color: 'var(--mk-muted)' }}>Gross verified, all time</p>
          </div>
        </section>

        {/* Pending verifications table */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Platform analytics</h2>
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              Aggregated from the database on the server — suitable for operational dashboards.
            </p>
            <AdminAnalyticsCharts
              userGrowth={userGrowth.data}
              contributions={contribSeries.data}
              proposals={proposalsSummary.data}
              treasury={treasuryTrends.data}
            />
          </div>
        )}

        {tab === 'pending' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Payment Verification</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--mk-muted)' }}>
                {pending.data?.length ?? 0} pending contribution{pending.data?.length !== 1 ? 's' : ''} awaiting review
              </p>
            </div>

            {(pending.data ?? []).length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
                <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: '#84d6b9' }}>check_circle</span>
                <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>All contributions verified.</p>
              </div>
            ) : (
              <div className="mukwano-card overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--mk-navy2)' }}>
                  <div className="grid grid-cols-4 gap-4 w-full text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
                    <span>User</span>
                    <span>Circle</span>
                    <span>Amount</span>
                    <span>Action</span>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  {(pending.data ?? []).map((entry) => (
                    <div key={entry.id} className="px-5 py-4 grid grid-cols-4 gap-4 items-center">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--mk-white)' }}>{entry.user?.displayName ?? 'User'}</p>
                        <p className="text-xs label-font" style={{ color: 'var(--mk-muted)' }}>{entry.user?.email}</p>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>{entry.circle?.name}</p>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--mk-gold)' }}>
                          {entry.amount} {entry.currency}
                        </p>
                        <span className="chip-demo mt-0.5 inline-block" style={{ background: '#ffdcbb', color: '#6b3f00' }}>
                          pending
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="mukwano-btn mukwano-btn-primary rounded-xl px-4 py-2 text-xs"
                          onClick={() => verify.mutate(entry.id)}
                          disabled={verify.isPending || reject.isPending}
                        >
                          Verify
                        </button>
                        <button
                          className="rounded-xl px-4 py-2 text-xs font-semibold"
                          style={{ background: '#ffe9e7', color: '#7a1f1f' }}
                          onClick={() => {
                            const reason = window.prompt('Reason for rejection')
                            if (reason?.trim()) reject.mutate({ id: entry.id, reason })
                          }}
                          disabled={verify.isPending || reject.isPending}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Members</h2>
            <div className="mukwano-card overflow-hidden">
              <div className="px-5 py-3" style={{ background: 'var(--mk-navy2)' }}>
                <div
                  className="grid grid-cols-5 gap-4 w-full text-[0.6875rem] font-bold uppercase tracking-widest label-font min-w-0"
                  style={{ color: 'var(--mk-muted)' }}
                >
                  <span className="min-w-0">Name</span>
                  <span className="min-w-0">Email</span>
                  <span className="min-w-0">Country</span>
                  <span className="min-w-0">Role</span>
                  <span className="min-w-0">Support</span>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                {(members.data ?? []).length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="font-medium text-sm" style={{ color: 'var(--mk-muted)' }}>No members yet.</p>
                  </div>
                ) : (
                  (members.data ?? []).map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-5 gap-4 items-start px-5 py-4 text-sm min-w-0"
                    >
                      <div className="min-w-0 font-medium" style={{ color: 'var(--mk-white)' }}>
                        {member.displayName}
                      </div>
                      <div
                        className="min-w-0 break-all text-xs leading-relaxed"
                        style={{ color: 'var(--mk-muted)' }}
                        title={member.email}
                      >
                        {member.email}
                      </div>
                      <div className="min-w-0">{member.country ?? '-'}</div>
                      <div className="min-w-0">
                        {member.platformRole === 'GLOBAL_ADMIN' || member.isGlobalAdmin ? 'Global Admin' : 'User'}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                          style={{ background: 'rgba(240,165,0,0.15)', color: 'var(--mk-gold)' }}
                          onClick={() => {
                            const reason = window.prompt('Describe the issue (sent to admin queue)')
                            if (reason?.trim()) {
                              createSupportFlag.mutate({ subjectUserId: member.id, reason: reason.trim() })
                            }
                          }}
                        >
                          Flag
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'support' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Support flags</h2>
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              User-submitted reports. Update status as you triage.
            </p>
            <div className="mukwano-card overflow-hidden">
              {(supportFlags.data ?? []).length === 0 ? (
                <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--mk-muted)' }}>
                  No open flags.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  {(supportFlags.data ?? []).map((f) => (
                    <div key={f.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--mk-white)' }}>{f.reason}</p>
                        <p className="mt-1 text-xs label-font" style={{ color: 'var(--mk-muted)' }}>
                          From {f.reporter.displayName} ·{' '}
                          {f.subjectUser ? `About ${f.subjectUser.displayName}` : 'General'}
                        </p>
                        <p className="text-xs label-font mt-0.5" style={{ color: 'var(--mk-muted)' }}>
                          {new Date(f.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['open', 'triaged', 'closed'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={f.status === s || updateSupportFlag.isPending}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize disabled:opacity-40"
                            style={{
                              background: f.status === s ? 'rgba(240,165,0,0.25)' : 'rgba(255,255,255,0.06)',
                              color: 'var(--mk-white)'
                            }}
                            onClick={() => updateSupportFlag.mutate({ id: f.id, status: s })}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'circles' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Circles</h2>
            <div className="mukwano-card overflow-hidden">
              {(circles.data ?? []).slice(0, 100).map((entry) => (
                <div key={entry.id} className="grid grid-cols-5 gap-4 border-b px-5 py-4 text-sm items-center" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  <div className="font-medium" style={{ color: 'var(--mk-white)' }}>{entry.name}</div>
                  <div>{entry.country ?? '-'}</div>
                  <div>{entry.sector ?? '-'}</div>
                  <div className="capitalize">{entry.status}</div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{ background: '#ffdcbb', color: '#6b3f00' }}
                      onClick={() => disableCircle.mutate(entry.id)}
                    >
                      Disable
                    </button>
                    <button
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{ background: '#ffe9e7', color: '#7a1f1f' }}
                      onClick={() => {
                        if (window.confirm('Delete this circle permanently?')) deleteCircle.mutate(entry.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'proposals' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Proposals</h2>
            <div className="mukwano-card overflow-hidden">
              {(proposalsAdmin.data ?? []).slice(0, 100).map((entry) => (
                <div key={entry.id} className="grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm items-center" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  <div className="font-medium" style={{ color: 'var(--mk-white)' }}>{entry.title}</div>
                  <div className="capitalize">{entry.status}</div>
                  <div>{new Date(entry.createdAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{ background: '#ffdcbb', color: '#6b3f00' }}
                      onClick={() => disableProposal.mutate(entry.id)}
                    >
                      Disable
                    </button>
                    <button
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      style={{ background: '#ffe9e7', color: '#7a1f1f' }}
                      onClick={() => {
                        if (window.confirm('Delete this proposal permanently?')) deleteProposal.mutate(entry.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Ledger</h2>
            <div className="mukwano-card overflow-hidden">
              {(ledger.data ?? []).slice(0, 100).map((entry) => (
                <div key={entry.id} className="grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  <div>{entry.circle?.name}</div>
                  <div>{entry.type}</div>
                  <div>{entry.amount} {entry.currency}</div>
                  <div>{new Date(entry.recordedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)' }}>Activity</h2>
            <div className="mukwano-card overflow-hidden">
              {(activity.data ?? []).slice(0, 100).map((item) => (
                <div key={item.id} className="grid grid-cols-3 gap-4 border-b px-5 py-4 text-sm" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
                  <div className="font-medium" style={{ color: 'var(--mk-white)' }}>{formatActivityType(item.action)}</div>
                  <div className="truncate" title={JSON.stringify(item.metadata)}>
                    {summarizeMetadata(item.metadata)}
                    {item.subjectUserId ? ` · subject: ${item.subjectUserId.slice(0, 8)}…` : ''}
                  </div>
                  <div>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
