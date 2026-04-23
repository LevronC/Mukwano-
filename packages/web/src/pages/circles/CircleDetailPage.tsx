import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { flagEmojiForCountryName } from '@/lib/onboarding-display'

const TABS = ['overview', 'contributions', 'proposals', 'projects'] as const

type CircleOverview = {
  name?: string
  status?: string
  description?: string
  country?: string | null
  sector?: string | null
  membershipRole?: string | null
  coverImageUrl?: string | null
} & Record<string, unknown>

type CircleMember = {
  userId: string
  role: string
  user?: {
    displayName?: string
    email?: string
  }
}

function CircleMetaChips({ country, sector }: { country?: string | null; sector?: string | null }) {
  if (!country && !sector) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {country ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(240,165,0,0.25)] px-3 py-1 text-xs font-medium"
          style={{ color: 'var(--mk-offwhite)' }}
        >
          <span aria-hidden>{flagEmojiForCountryName(country)}</span>
          {country}
        </span>
      ) : null}
      {sector ? (
        <span
          className="inline-flex items-center rounded-full border border-[rgba(240,165,0,0.25)] px-3 py-1 text-xs font-medium"
          style={{ color: 'var(--mk-offwhite)' }}
        >
          {sector}
        </span>
      ) : null}
    </div>
  )
}

export function CircleDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'overview'
  const queryClient = useQueryClient()

  const { data: circle, error: circleError } = useQuery({
    queryKey: ['circle', id],
    queryFn: () => api.get<CircleOverview>(`/circles/${id}`),
    enabled: !!id
  })

  const membershipRole = circle?.membershipRole ?? null
  const coverSrc =
    circle && typeof circle.coverImageUrl === 'string' && circle.coverImageUrl.trim().length > 0
      ? circle.coverImageUrl.trim()
      : null
  const isMember = membershipRole !== null && membershipRole !== 'pending' && membershipRole !== 'rejected'
  const isPending = membershipRole === 'pending'
  const isAdmin = membershipRole === 'creator' || membershipRole === 'admin'
  const canPromoteToAdmin = membershipRole === 'creator'

  const { data: members } = useQuery({
    queryKey: ['members', id],
    queryFn: () => api.get<CircleMember[]>(`/circles/${id}/members`),
    enabled: !!id
  })

  const { data: contributions } = useQuery({
    queryKey: ['contributions', id],
    queryFn: () => api.get<Array<{ id: string; amount: string; currency?: string; status: string }>>(`/circles/${id}/contributions`),
    enabled: !!id && isMember
  })

  const { data: proposals } = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>(`/circles/${id}/proposals`),
    enabled: !!id && isMember
  })

  const { data: projects } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>(`/circles/${id}/projects`),
    enabled: !!id && isMember
  })

  const { data: treasury } = useQuery({
    queryKey: ['treasury', id],
    queryFn: () => api.get<{ balanceLabel?: string; verifiedBalance?: string; currency?: string }>(`/circles/${id}/treasury`),
    enabled: !!id && isMember
  })

  const { data: joinRequests } = useQuery({
    queryKey: ['join-requests', id],
    queryFn: () =>
      api.get<Array<{ userId: string; role: string; user?: { displayName?: string; email?: string } }>>(`/circles/${id}/join-requests`),
    enabled: !!id && !!isAdmin
  })

  const requestJoin = useMutation({
    mutationFn: () => api.post(`/circles/${id}/join-request`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['circle', id] })
      await queryClient.invalidateQueries({ queryKey: ['my-circle-requests'] })
      toast.success('Join request sent. Awaiting committee approval.')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const verifyContribution = useMutation({
    mutationFn: (contributionId: string) => api.patch(`/circles/${id}/contributions/${contributionId}/verify`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contributions', id] })
      await queryClient.invalidateQueries({ queryKey: ['treasury', id] })
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
      await queryClient.invalidateQueries({ queryKey: ['circles-explore'] })
      toast.success('Contribution verified')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const rejectContribution = useMutation({
    mutationFn: (contributionId: string) =>
      api.patch(`/circles/${id}/contributions/${contributionId}/reject`, { reason: 'Rejected by admin' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contributions', id] })
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
      await queryClient.invalidateQueries({ queryKey: ['circles-explore'] })
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

  const promoteToAdmin = useMutation({
    mutationFn: (userId: string) => api.patch(`/circles/${id}/members/${userId}/role`, { role: 'admin' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['members', id] })
      toast.success('Member promoted to admin')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  if (circleError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <span className="material-symbols-outlined text-5xl" style={{ color: 'var(--mk-muted)' }}>error</span>
        <p className="text-lg font-medium" style={{ color: 'var(--mk-white)' }}>Failed to load circle</p>
        <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>{getErrorMessage(circleError)}</p>
        <Link to="/explore" className="mukwano-btn mukwano-btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">
          Back to Explore
        </Link>
      </div>
    )
  }

  // Non-member view: show circle info + join button
  if (!isMember && !isPending) {
    return (
      <div className="space-y-8">
        {coverSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.12)]">
            <img src={coverSrc} alt="" className="h-44 w-full object-cover md:h-52" />
          </div>
        ) : null}
        <section className="mukwano-hero p-8 md:p-10">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="chip-demo">Not a member</span>
            </div>
            <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {circle?.name ?? 'Circle'}
            </h1>
            {circle?.description && (
              <p className="text-sm max-w-xl" style={{ color: '#a0f3d4' }}>{circle.description}</p>
            )}
            <CircleMetaChips country={circle?.country} sector={circle?.sector} />
            <p className="text-sm mt-2" style={{ color: 'var(--mk-muted)' }}>
              {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? '' : 's'}
            </p>
            <div className="mt-4">
              <button
                className="mukwano-btn mukwano-btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold"
                onClick={() => requestJoin.mutate()}
                disabled={requestJoin.isPending}
              >
                {requestJoin.isPending ? 'Sending request...' : 'Request to Join'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Members</h2>
          {(members ?? []).length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
              <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No members yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(members ?? []).map((m) => (
                <div key={m.userId} className="mukwano-card flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--mk-white)' }}>{m.user?.displayName ?? 'Member'}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--mk-muted)' }}>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // Pending member view
  if (isPending) {
    return (
      <div className="space-y-8">
        {coverSrc ? (
          <div className="overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.12)]">
            <img src={coverSrc} alt="" className="h-44 w-full object-cover md:h-52" />
          </div>
        ) : null}
        <section className="mukwano-hero p-8 md:p-10">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font" style={{ background: '#ffdcbb', color: '#6b3f00' }}>
                Pending Approval
              </span>
            </div>
            <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {circle?.name ?? 'Circle'}
            </h1>
            {circle?.description && (
              <p className="text-sm max-w-xl" style={{ color: '#a0f3d4' }}>{circle.description}</p>
            )}
            <CircleMetaChips country={circle?.country} sector={circle?.sector} />
            <p className="text-sm mt-2" style={{ color: 'var(--mk-muted)' }}>
              Your request to join this circle is awaiting committee approval.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Members</h2>
          {(members ?? []).length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
              <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No members yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(members ?? []).map((m) => (
                <div key={m.userId} className="mukwano-card flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--mk-white)' }}>{m.user?.displayName ?? 'Member'}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--mk-muted)' }}>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // Full member view (existing UI)
  return (
    <div className="space-y-8">
      {coverSrc ? (
        <div className="overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.12)]">
          <img src={coverSrc} alt="" className="h-44 w-full object-cover md:h-52" />
        </div>
      ) : null}
      {/* Hero */}
      <section className="mukwano-hero p-8 md:p-10">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip-demo">{membershipRole ?? 'member'}</span>
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
          <CircleMetaChips country={circle?.country} sector={circle?.sector} />
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
          {canPromoteToAdmin && (
            <div className="mukwano-card p-6 sm:col-span-2">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font mb-3" style={{ color: 'var(--mk-muted)' }}>
                Promote to Admin
              </p>
              <div className="space-y-2">
                {(members ?? [])
                  .filter((member) => member.role !== 'creator' && member.role !== 'admin')
                  .map((member) => (
                    <div key={member.userId} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'var(--mk-navy2)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>{member.user?.displayName ?? 'Member'}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--mk-muted)' }}>{member.role}</p>
                      </div>
                      <button
                        className="mukwano-btn mukwano-btn-primary rounded-xl px-3 py-1.5 text-xs"
                        onClick={() => promoteToAdmin.mutate(member.userId)}
                        disabled={promoteToAdmin.isPending}
                      >
                        Promote
                      </button>
                    </div>
                  ))}
                {(members ?? []).filter((member) => member.role !== 'creator' && member.role !== 'admin').length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>No eligible members to promote.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contributions */}
      {tab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Contributions</h2>
              <p className="mt-1 text-xs max-w-xl" style={{ color: 'var(--mk-muted)' }}>
                Verified amounts are written to an append-only ledger on the server. Reject keeps the row with status rejected — records are not deleted.
              </p>
            </div>
            <Link
              to={`/circles/${id}/contributions/new`}
              className="mukwano-btn mukwano-btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
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
