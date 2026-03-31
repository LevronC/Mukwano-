import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'

const TABS = ['overview', 'contributions', 'proposals', 'projects'] as const

export function CircleDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'overview'
  const queryClient = useQueryClient()

  const { data: circle } = useQuery({ queryKey: ['circle', id], queryFn: () => api.get<{ name?: string; status?: string; description?: string }>(`/circles/${id}`) })
  const { data: members } = useQuery({ queryKey: ['members', id], queryFn: () => api.get<Array<{ userId: string; role: string }>>(`/circles/${id}/members`) })
  const { data: contributions } = useQuery({ queryKey: ['contributions', id], queryFn: () => api.get<Array<{ id: string; amount: string; currency?: string; status: string }>>(`/circles/${id}/contributions`) })
  const { data: proposals } = useQuery({ queryKey: ['proposals', id], queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>(`/circles/${id}/proposals`) })
  const { data: projects } = useQuery({ queryKey: ['projects', id], queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>(`/circles/${id}/projects`) })
  const { data: treasury } = useQuery({ queryKey: ['treasury', id], queryFn: () => api.get<{ balanceLabel?: string; verifiedBalance?: string; currency?: string }>(`/circles/${id}/treasury`) })

  const myRole = members?.find((m) => m.userId === user?.id)?.role
  const isAdmin = myRole === 'creator' || myRole === 'admin'
  const { data: joinRequests } = useQuery({
    queryKey: ['join-requests', id],
    queryFn: () =>
      api.get<Array<{ userId: string; role: string; user?: { displayName?: string; email?: string } }>>(`/circles/${id}/join-requests`),
    enabled: !!id && !!isAdmin
  })

  const verifyContribution = useMutation({
    mutationFn: (contributionId: string) => api.patch(`/circles/${id}/contributions/${contributionId}/verify`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contributions', id] })
      await queryClient.invalidateQueries({ queryKey: ['treasury', id] })
      toast.success('Contribution verified')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const rejectContribution = useMutation({
    mutationFn: (contributionId: string) =>
      api.patch(`/circles/${id}/contributions/${contributionId}/reject`, { reason: 'Rejected by admin' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contributions', id] })
      toast.success('Contribution rejected')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const approveJoinRequest = useMutation({
    mutationFn: (userId: string) => api.patch(`/circles/${id}/join-requests/${userId}/approve`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['join-requests', id] })
      await queryClient.invalidateQueries({ queryKey: ['members', id] })
      toast.success('Join request approved')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const rejectJoinRequest = useMutation({
    mutationFn: (userId: string) => api.delete(`/circles/${id}/join-requests/${userId}/reject`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['join-requests', id] })
      toast.success('Join request rejected')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="mukwano-hero p-8 md:p-10">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip-demo">{myRole ?? 'member'}</span>
          </div>
          <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {circle?.name ?? 'Circle'}
          </h1>
          {treasury && (
            <p className="text-lg" style={{ color: '#84d6b9' }}>
              {treasury.balanceLabel ?? `${treasury.verifiedBalance ?? '0'} ${treasury.currency ?? 'USD'} verified`}
            </p>
          )}
          {circle?.description && (
            <p className="text-sm max-w-xl" style={{ color: '#a0f3d4' }}>{circle.description}</p>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-all"
            style={
              tab === t
                ? { background: '#ffffff', color: 'var(--mk-gold)', boxShadow: '0 2px 8px rgba(28,28,26,0.06)' }
                : { color: 'var(--mk-muted)' }
            }
            onClick={() => setParams({ tab: t })}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mukwano-card p-6">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font mb-2" style={{ color: 'var(--mk-muted)' }}>Status</p>
            <p className="text-xl font-semibold capitalize" style={{ color: 'var(--mk-white)' }}>{circle?.status ?? '–'}</p>
          </div>
          <div className="mukwano-card p-6">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font mb-2" style={{ color: 'var(--mk-muted)' }}>Members</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>{members?.length ?? 0}</p>
          </div>
          <div className="mukwano-card p-6 sm:col-span-2">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font mb-2" style={{ color: 'var(--mk-muted)' }}>Governance</p>
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>All balance mutations, vote counts, and permission checks are enforced server-side. No single member can override governance in the UI.</p>
          </div>
          {isAdmin && (
            <div className="mukwano-card p-6 sm:col-span-2">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font mb-3" style={{ color: 'var(--mk-muted)' }}>
                Pending Join Requests ({joinRequests?.length ?? 0})
              </p>
              {(joinRequests ?? []).length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {(joinRequests ?? []).map((request) => (
                    <div key={request.userId} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'var(--mk-navy2)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>{request.user?.displayName ?? 'User'}</p>
                        <p className="text-xs" style={{ color: 'var(--mk-muted)' }}>{request.user?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="mukwano-btn mukwano-btn-primary rounded-xl px-3 py-1.5 text-xs"
                          onClick={() => approveJoinRequest.mutate(request.userId)}
                          disabled={approveJoinRequest.isPending}
                        >
                          Approve
                        </button>
                        <button
                          className="mukwano-btn mukwano-btn-danger rounded-xl px-3 py-1.5 text-xs"
                          onClick={() => rejectJoinRequest.mutate(request.userId)}
                          disabled={rejectJoinRequest.isPending}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contributions */}
      {tab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Contributions</h2>
            <Link
              to={`/circles/${id}/contributions/new`}
              className="mukwano-btn mukwano-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              New
            </Link>
          </div>
          {(contributions ?? []).length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
              <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No contributions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(contributions ?? []).map((c) => (
                <div key={c.id} className="mukwano-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--mk-white)' }}>
                      {c.amount} {c.currency ?? 'USD'}
                    </p>
                    <span
                      className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                      style={
                        c.status === 'verified'
                          ? { background: '#c9eadb', color: '#2f4c42' }
                          : { background: '#ffdcbb', color: '#6b3f00' }
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                  {isAdmin && c.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        className="mukwano-btn mukwano-btn-primary rounded-xl px-4 py-2 text-xs"
                        onClick={() => verifyContribution.mutate(c.id)}
                        disabled={verifyContribution.isPending}
                      >
                        Verify
                      </button>
                      <button
                        className="mukwano-btn mukwano-btn-danger rounded-xl px-4 py-2 text-xs"
                        onClick={() => rejectContribution.mutate(c.id)}
                        disabled={rejectContribution.isPending}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proposals */}
      {tab === 'proposals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Proposals</h2>
            <Link
              to={`/circles/${id}/proposals/new`}
              className="mukwano-btn mukwano-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              New
            </Link>
          </div>
          {(proposals ?? []).length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
              <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No proposals yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(proposals ?? []).map((p) => (
                <Link
                  key={p.id}
                  to={`/circles/${id}/proposals/${p.id}`}
                  className="mukwano-card group flex items-center justify-between p-5 transition-all hover:-translate-y-0.5 hover:shadow-ambient"
                >
                  <div>
                    <p className="font-semibold group-hover:text-[var(--mk-gold)] transition-colors" style={{ color: 'var(--mk-white)' }}>{p.title}</p>
                    <p className="text-xs mt-0.5 label-font capitalize" style={{ color: 'var(--mk-muted)' }}>{p.status}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--mk-muted)' }}>chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Projects</h2>
          {(projects ?? []).length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
              <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No projects yet. Projects are created from approved proposals.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(projects ?? []).map((p) => (
                <Link
                  key={p.id}
                  to={`/circles/${id}/projects/${p.id}`}
                  className="mukwano-card group flex items-center justify-between p-5 transition-all hover:-translate-y-0.5 hover:shadow-ambient"
                >
                  <div>
                    <p className="font-semibold group-hover:text-[var(--mk-gold)] transition-colors" style={{ color: 'var(--mk-white)' }}>{p.title}</p>
                    <p className="text-xs mt-0.5 label-font capitalize" style={{ color: 'var(--mk-muted)' }}>{p.status}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--mk-muted)' }}>chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
