import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

const NAV_ITEMS = [
  { tab: 'pending', label: 'Verifications', icon: 'verified_user' },
  { tab: 'members', label: 'Members', icon: 'group' },
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
      api.get<Array<{ id: string; displayName: string; email: string; isGlobalAdmin: boolean; country?: string | null; sector?: string | null }>>('/admin/members')
  })
  const ledger = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: () =>
      api.get<Array<{ id: string; type: string; amount: string; currency: string; recordedAt: string; circle: { name: string } }>>('/admin/ledger')
  })
  const activity = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () =>
      api.get<Array<{ id: string; type: string; createdAt: string; metadata: Record<string, unknown> }>>('/admin/activity')
  })
  const metrics = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () =>
      api.get<{ pendingVerifications: number; totalContributed: number; activeCircles: number; activeProjects: number; currency: string }>('/admin/metrics')
  })

  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contributions/${id}/verify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] })
      qc.invalidateQueries({ queryKey: ['admin-ledger'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
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
      toast.success('Contribution rejected')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  if (!user?.isGlobalAdmin) return <Navigate replace to="/dashboard" />

  const isLoading = pending.isLoading || members.isLoading || ledger.isLoading || activity.isLoading || metrics.isLoading
  const error = pending.error ?? members.error ?? ledger.error ?? activity.error ?? metrics.error

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
          <button className="w-full mukwano-btn-primary flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm">
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
        <section className="mb-8 grid gap-4 md:grid-cols-4">
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
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Verified Total</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--mk-gold)' }}>
              {metrics.data?.totalContributed ?? 0} {metrics.data?.currency ?? 'USD'}
            </p>
          </div>
        </section>

        {/* Pending verifications table */}
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
                  className="grid grid-cols-4 gap-4 w-full text-[0.6875rem] font-bold uppercase tracking-widest label-font min-w-0"
                  style={{ color: 'var(--mk-muted)' }}
                >
                  <span className="min-w-0">Name</span>
                  <span className="min-w-0">Email</span>
                  <span className="min-w-0">Country</span>
                  <span className="min-w-0">Role</span>
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
                      className="grid grid-cols-4 gap-4 items-start px-5 py-4 text-sm min-w-0"
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
                      <div className="min-w-0">{member.isGlobalAdmin ? 'Global Admin' : 'Member'}</div>
                    </div>
                  ))
                )}
              </div>
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
                  <div className="font-medium" style={{ color: 'var(--mk-white)' }}>{formatActivityType(item.type)}</div>
                  <div className="truncate" title={JSON.stringify(item.metadata)}>
                    {summarizeMetadata(item.metadata)}
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
