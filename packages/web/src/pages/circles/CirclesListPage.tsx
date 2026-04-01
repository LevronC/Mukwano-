import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function CirclesListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['circles'],
    queryFn: () =>
      api.get<
        Array<{ id: string; name: string; description?: string | null; status: string; goalAmount?: string; currency?: string }>
      >('/circles')
  })
  const { data: myRequests } = useQuery({
    queryKey: ['my-circle-requests'],
    queryFn: () =>
      api.get<Array<{ circleId: string; role: string; circle?: { name?: string } }>>('/circles/my-requests')
  })

  const requestsByCircleId = new Map((myRequests ?? []).map((entry) => [entry.circleId, entry.role]))

  if (isLoading) {
    return (
      <div className="space-y-10">
        <section className="mukwano-hero p-8 md:p-12">
          <h1 className="text-4xl font-bold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Circles
          </h1>
        </section>
        <div className="mukwano-card rounded-2xl p-12 text-center">
          <p style={{ color: 'var(--mk-muted)' }}>Loading circles…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-10">
        <section className="mukwano-hero p-8 md:p-12">
          <h1 className="text-4xl font-bold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Circles
          </h1>
        </section>
        <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-8 text-center">
          <p className="font-medium" style={{ color: '#fecaca' }}>{getErrorMessage(error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="mukwano-hero p-8 md:p-12">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: '#84d6b9' }}>
              Community Capital
            </p>
            <h1 className="text-4xl font-bold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              My Circles
            </h1>
            <p className="max-w-md" style={{ color: '#a0f3d4' }}>
              Create, join, and govern circles with transparent treasury and proposal workflows.
            </p>
          </div>
          <Link
            to="/circles/new"
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm transition-all hover:opacity-90 active:scale-95 shrink-0"
            style={{ background: '#ffffff', color: 'var(--mk-gold)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
            Create Circle
          </Link>
        </div>
      </section>

      {/* Grid */}
      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--mk-navy2)' }}>
          <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: '#bec9c3' }}>group_work</span>
          <p className="text-lg font-semibold mb-1" style={{ color: 'var(--mk-muted)' }}>No circles yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--mk-muted)' }}>Create a circle to start pooling funds with your community.</p>
          <Link to="/circles/new" className="mukwano-btn mukwano-btn-primary inline-block rounded-xl px-6 py-3 font-semibold">
            Create your first circle
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((circle) => (
            <Link
              key={circle.id}
              to={`/circles/${circle.id}`}
              className="mukwano-card group flex flex-col gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-ambient-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }}
                  >
                    {circle.status}
                  </span>
                  {requestsByCircleId.get(circle.id) && (
                    <span
                      className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                      style={
                        requestsByCircleId.get(circle.id) === 'pending'
                          ? { background: '#ffdcbb', color: '#6b3f00' }
                          : requestsByCircleId.get(circle.id) === 'rejected'
                            ? { background: '#ffe9e7', color: '#7a1f1f' }
                            : { background: '#c9eadb', color: '#2f4c42' }
                      }
                    >
                      Request: {requestsByCircleId.get(circle.id)}
                    </span>
                  )}
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }}
                >
                  {circle.currency ?? 'USD'}
                </span>
              </div>
              <div>
                <h2
                  className="text-xl font-semibold transition-colors group-hover:text-[var(--mk-gold)]"
                  style={{ color: 'var(--mk-white)' }}
                >
                  {circle.name}
                </h2>
                <p className="mt-1.5 text-sm line-clamp-2" style={{ color: 'var(--mk-muted)' }}>
                  {circle.description ?? 'A governance-first circle for collective community investment.'}
                </p>
              </div>
              <div className="mt-auto rounded-xl p-4" style={{ background: 'var(--mk-navy2)' }}>
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Goal amount</p>
                <p className="mt-1 font-bold" style={{ color: 'var(--mk-white)' }}>
                  {circle.goalAmount ?? '–'} {circle.currency ?? 'USD'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
