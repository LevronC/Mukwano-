import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function ProposalDetailPage() {
  const { id = '', pid = '' } = useParams()
  const { data, refetch } = useQuery({
    queryKey: ['proposal', pid],
    queryFn: () =>
      api.get<{
        title?: string
        description?: string
        requestedAmount?: number | string
        currency?: string
        status?: string
        votingDeadline?: string
        votes?: { yes: number; no: number; abstain: number }
      }>(`/circles/${id}/proposals/${pid}`)
  })

  const vote = useMutation({
    mutationFn: (choice: 'yes' | 'no' | 'abstain') => api.post(`/circles/${id}/proposals/${pid}/vote`, { vote: choice }),
    onSuccess: () => void refetch(),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const closeProposal = useMutation({
    mutationFn: () => api.post(`/circles/${id}/proposals/${pid}/close`),
    onSuccess: () => void refetch(),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const statusColor = (status?: string) => {
    if (status === 'approved') return { background: '#c9eadb', color: '#2f4c42' }
    if (status === 'rejected') return { background: '#ffdad6', color: '#93000a' }
    return { background: '#ffdcbb', color: '#6b3f00' }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Hero */}
      <section className="mukwano-hero p-8 md:p-10">
        <div className="relative z-10 space-y-2">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: '#84d6b9' }}>
            Proposal
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {data?.title ?? 'Proposal'}
          </h1>
          {data?.description && (
            <p className="text-sm max-w-xl mt-2" style={{ color: '#a0f3d4' }}>{data.description}</p>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Requested</p>
          <p className="mt-2 font-bold text-xl" style={{ color: 'var(--mk-gold)' }}>
            {data?.requestedAmount ?? '–'} {data?.currency ?? 'USD'}
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Status</p>
          <div className="mt-2">
            <span
              className="rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-widest label-font"
              style={statusColor(data?.status)}
            >
              {data?.status ?? '–'}
            </span>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Deadline</p>
          <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>
            {data?.votingDeadline ? new Date(data.votingDeadline).toLocaleDateString() : '–'}
          </p>
        </div>
      </section>

      {/* Vote tally */}
      {data?.votes && (
        <section className="mukwano-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--mk-white)' }}>Vote Tally</h2>
          <div className="flex gap-6">
            {(['yes', 'no', 'abstain'] as const).map((v) => (
              <div key={v} className="text-center">
                <p className="text-2xl font-bold" style={{ color: v === 'yes' ? 'var(--mk-gold)' : v === 'no' ? '#ba1a1a' : 'var(--mk-muted)' }}>
                  {data.votes?.[v] ?? 0}
                </p>
                <p className="text-xs font-bold uppercase tracking-widest label-font capitalize" style={{ color: 'var(--mk-muted)' }}>{v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Voting actions */}
      {data?.status === 'open' && (
        <section className="mukwano-card p-6 space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--mk-white)' }}>Cast Your Vote</h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="mukwano-btn-primary flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
              onClick={() => vote.mutate('yes')}
              disabled={vote.isPending}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>thumb_up</span>
              Vote Yes
            </button>
            <button
              className="mukwano-btn-danger flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
              onClick={() => vote.mutate('no')}
              disabled={vote.isPending}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>thumb_down</span>
              Vote No
            </button>
            <button
              className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }}
              onClick={() => vote.mutate('abstain')}
              disabled={vote.isPending}
            >
              Abstain
            </button>
          </div>
          <div className="pt-2" style={{ borderTop: '1px solid rgba(190,201,195,0.2)' }}>
            <button
              className="text-sm font-medium transition-colors hover:opacity-70 label-font"
              style={{ color: 'var(--mk-muted)' }}
              onClick={() => closeProposal.mutate()}
              disabled={closeProposal.isPending}
            >
              Close proposal manually →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
