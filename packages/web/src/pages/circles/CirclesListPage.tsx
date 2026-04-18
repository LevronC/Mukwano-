import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { CircleShowcaseCard } from '@/components/circles/CircleShowcaseCard'
import { CircleSectorFilterBar } from '@/components/circles/CircleSectorFilterBar'
import { enrichCircleForShowcase } from '@/components/circles/circleShowcaseModel'
import type { SectorId } from '@/components/circles/circleShowcaseModel'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'

type CircleListRow = {
  id: string
  name: string
  description?: string | null
  status: string
  goalAmount?: string | null
  currency?: string | null
  coverImageUrl?: string | null
  verifiedRaisedAmount?: string | null
}

export function CirclesListPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [sector, setSector] = useState<Exclude<SectorId, 'other'>>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['circles'],
    queryFn: () => api.get<CircleListRow[]>('/circles'),
  })

  const { data: myRequests } = useQuery({
    queryKey: ['my-circle-requests'],
    queryFn: () =>
      api.get<Array<{ circleId: string; role: string; circle?: { name?: string } }>>('/circles/my-requests'),
  })

  const requestsByCircleId = new Map((myRequests ?? []).map((entry) => [entry.circleId, entry.role]))

  const requestJoin = useMutation({
    mutationFn: (circleId: string) => api.post(`/circles/${circleId}/join-request`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
      await queryClient.invalidateQueries({ queryKey: ['my-circle-requests'] })
      toast.success('Join request sent. Awaiting committee approval.')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const enriched = useMemo(
    () =>
      (data ?? []).map((c) =>
        enrichCircleForShowcase({
          ...c,
          goalAmount: c.goalAmount ?? '0',
          currency: c.currency ?? 'USD',
        })
      ),
    [data]
  )

  const filtered = useMemo(() => {
    if (sector === 'all') return enriched
    return enriched.filter((c) => c.inferred === sector)
  }, [enriched, sector])

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
          <p className="font-medium" style={{ color: '#fecaca' }}>
            {getErrorMessage(error)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
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
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#ffffff', color: 'var(--mk-gold)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add_circle
            </span>
            Create Circle
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 border-b border-[rgba(240,165,0,0.08)] pb-8 sm:grid-cols-3 sm:gap-8 md:pb-10">
        <div className="text-center sm:text-left">
          <p className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold tabular-nums leading-none text-[var(--mk-gold)]">
            {(data ?? []).length}
          </p>
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-[var(--mk-muted)] uppercase md:text-[11px]">
            Active circles
          </p>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold tabular-nums leading-none text-[var(--mk-gold)]">
            24
          </p>
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-[var(--mk-muted)] uppercase md:text-[11px]">
            Countries
          </p>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold tabular-nums leading-none text-[var(--mk-gold)]">
            $1.2M
          </p>
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-[var(--mk-muted)] uppercase md:text-[11px]">
            Community impact
          </p>
        </div>
      </div>

      <CircleSectorFilterBar sector={sector} onSectorChange={setSector} />

      <div>
        <span className="mb-2 block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">Discover</span>
        <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Featured circles</h2>
        <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-[var(--mk-muted)]">
          Browse and join circles with the same view as Explore — filters match keywords in names and descriptions.
        </p>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--mk-navy2)' }}>
          <span className="material-symbols-outlined mb-4 block text-5xl" style={{ color: '#bec9c3' }}>
            group_work
          </span>
          <p className="mb-1 text-lg font-semibold" style={{ color: 'var(--mk-muted)' }}>
            No circles yet
          </p>
          <p className="mb-6 text-sm" style={{ color: 'var(--mk-muted)' }}>
            Create a circle to start pooling funds with your community.
          </p>
          <Link to="/circles/new" className="mukwano-btn mukwano-btn-primary inline-block rounded-xl px-6 py-3 font-semibold">
            Create your first circle
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
          <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>
            No circles match this sector. Try All Sectors or another filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CircleShowcaseCard
              key={c.id}
              circle={c}
              user={user ? { id: user.id } : null}
              requestsByCircleId={requestsByCircleId}
              onRequestJoin={(id) => requestJoin.mutate(id)}
              requestJoinPending={requestJoin.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
