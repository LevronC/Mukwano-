import { useMemo, useState } from 'react'
import { getErrorMessage } from '@/hooks/useApiError'
import { CircleShowcaseCard } from '@/components/circles/CircleShowcaseCard'
import { CircleSectorFilterBar } from '@/components/circles/CircleSectorFilterBar'
import type { ExploreCircleRow, SectorId } from '@/components/circles/circleShowcaseModel'
import { enrichCircleForShowcase } from '@/components/circles/circleShowcaseModel'

type ExploreImpactFeaturedProps = {
  circles: ExploreCircleRow[]
  isLoading: boolean
  error: unknown
  user: { id: string } | null
  requestsByCircleId: Map<string, string>
  onRequestJoin: (circleId: string) => void
  requestJoinPending: boolean
}

export function ExploreImpactFeatured({
  circles,
  isLoading,
  error,
  user,
  requestsByCircleId,
  onRequestJoin,
  requestJoinPending,
}: ExploreImpactFeaturedProps) {
  const [sector, setSector] = useState<Exclude<SectorId, 'other'>>('all')

  const enriched = useMemo(() => circles.map((c) => enrichCircleForShowcase(c)), [circles])

  const filtered = useMemo(() => {
    if (sector === 'all') return enriched
    return enriched.filter((c) => c.inferred === sector)
  }, [enriched, sector])

  const activeCount = circles.length

  return (
    <section id="explore-circles" className="space-y-10">
      <div className="grid grid-cols-1 gap-8 border-b border-[rgba(240,165,0,0.08)] pb-10 sm:grid-cols-3 sm:gap-6 md:pb-12">
        <StatBlock value={isLoading ? '—' : String(activeCount)} label="Active circles" />
        <StatBlock value="24" label="Countries" />
        <StatBlock value="$1.2M" label="Community impact" />
      </div>

      <CircleSectorFilterBar sector={sector} onSectorChange={setSector} />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[6px] text-[var(--mk-gold)] uppercase">
            Discover
          </span>
          <h2 className="font-display text-[clamp(28px,3.5vw,44px)] font-bold leading-tight text-white">
            Featured circles
          </h2>
          <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-[var(--mk-muted)]">
            Browse active communities. Sector filters match keywords in names and descriptions until dedicated fields are
            available.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
          <p style={{ color: 'var(--mk-muted)' }}>Loading circles...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: '#ffe9e7' }}>
          <p className="font-medium" style={{ color: '#7a1f1f' }}>
            {getErrorMessage(error)}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
          <span className="material-symbols-outlined mb-3 block text-4xl" style={{ color: '#bec9c3' }}>
            group_work
          </span>
          <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>
            {circles.length === 0
              ? 'No circles yet — be the first to create one.'
              : 'No circles match this sector. Try All Sectors or another filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {filtered.map((c) => (
            <CircleShowcaseCard
              key={c.id}
              circle={c}
              user={user}
              requestsByCircleId={requestsByCircleId}
              onRequestJoin={onRequestJoin}
              requestJoinPending={requestJoinPending}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="font-display text-[clamp(2rem,4vw,2.75rem)] font-bold tabular-nums leading-none text-[var(--mk-gold)]">
        {value}
      </p>
      <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-[var(--mk-muted)] uppercase md:text-[11px]">
        {label}
      </p>
    </div>
  )
}

export type { ExploreCircleRow } from '@/components/circles/circleShowcaseModel'
