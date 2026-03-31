import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function ExplorePage() {
  const queryClient = useQueryClient()
  const { data: circles, isLoading, error } = useQuery({
    queryKey: ['circles-explore'],
    queryFn: () =>
      api.get<
        Array<{ id: string; name: string; description?: string | null; goalAmount: string; status: string; currency: string }>
      >('/circles')
  })
  const { data: myRequests } = useQuery({
    queryKey: ['my-circle-requests'],
    queryFn: () =>
      api.get<Array<{ circleId: string; role: string }>>('/circles/my-requests')
  })
  const requestsByCircleId = new Map((myRequests ?? []).map((entry) => [entry.circleId, entry.role]))
  const requestJoin = useMutation({
    mutationFn: (circleId: string) => api.post(`/circles/${circleId}/join-request`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['circles-explore'] })
      toast.success('Join request sent. Awaiting committee approval.')
    },
    onError: (e) => toast.error(getErrorMessage(e))
  })

  return (
    <div className="space-y-10">
      {/* Hero — editorial layout */}
      <section className="grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-demo">Demo Mode</span>
            <span className="chip-escrow flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              Simulated Escrow
            </span>
          </div>
          <h1
            className="text-[3rem] leading-[1.1] font-semibold tracking-tight"
            style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Join a movement.<br />Build a legacy.
          </h1>
          <p className="text-lg max-w-md" style={{ color: 'var(--mk-muted)' }}>
            Find active circles and contribute to projects in your chosen country and sector.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/circles/new"
              className="mukwano-btn-primary flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
              Create a Circle
            </Link>
            <Link
              to="/circles"
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
            >
              Browse all
            </Link>
          </div>
        </div>
        {/* Brand illustration */}
        <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full opacity-10" style={{ background: 'var(--mk-gold)', filter: 'blur(60px)' }} />
            <img src={mukwanoLogo} alt="Mukwano logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </section>

      {/* Circles grid */}
      <section>
        <h2 className="mb-6 text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Active Communities</h2>
        {isLoading ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
            <p style={{ color: 'var(--mk-muted)' }}>Loading circles...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: '#ffe9e7' }}>
            <p className="font-medium" style={{ color: '#7a1f1f' }}>{getErrorMessage(error)}</p>
          </div>
        ) : (circles ?? []).length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
            <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: '#bec9c3' }}>group_work</span>
            <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No circles yet — be the first to create one.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(circles ?? []).map((circle) => (
              <article
                key={circle.id}
                className="mukwano-card p-6 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-ambient-lg"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }}
                  >
                    {circle.status}
                  </span>
                  <span className="chip-escrow">{circle.currency}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--mk-white)' }}>{circle.name}</h2>
                  <p className="mt-1.5 text-sm line-clamp-2" style={{ color: 'var(--mk-muted)' }}>
                    {circle.description ?? 'Community circle focused on collective impact.'}
                  </p>
                </div>
                <div className="mt-auto flex items-end justify-between pt-2">
                  <div>
                    <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Goal</p>
                    <p className="font-bold" style={{ color: 'var(--mk-white)' }}>
                      {circle.goalAmount} {circle.currency}
                    </p>
                  </div>
                  <Link
                    to={`/circles/${circle.id}`}
                    className="mukwano-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    Open
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </Link>
                </div>
                <button
                  className="rounded-xl px-4 py-2 text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
                  onClick={(event) => {
                    event.preventDefault()
                    requestJoin.mutate(circle.id)
                  }}
                  disabled={requestJoin.isPending || requestsByCircleId.get(circle.id) === 'pending'}
                >
                  {requestsByCircleId.get(circle.id) === 'pending'
                    ? 'Request Pending'
                    : requestsByCircleId.get(circle.id) === 'rejected'
                      ? 'Request Again'
                      : requestsByCircleId.get(circle.id)
                        ? `Joined (${requestsByCircleId.get(circle.id)})`
                        : 'Request to Join'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
