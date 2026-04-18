import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/hooks/useApiError'
import {
  GraduationCap,
  Laptop,
  LayoutGrid,
  Stethoscope,
  Tractor,
  Zap,
} from 'lucide-react'

export type SectorId = 'all' | 'healthcare' | 'education' | 'agriculture' | 'energy' | 'technology' | 'other'

const SECTORS: {
  id: Exclude<SectorId, 'other'>
  label: string
  Icon: typeof LayoutGrid
}[] = [
  { id: 'all', label: 'All Sectors', Icon: LayoutGrid },
  { id: 'healthcare', label: 'Healthcare', Icon: Stethoscope },
  { id: 'education', label: 'Education', Icon: GraduationCap },
  { id: 'agriculture', label: 'Agriculture', Icon: Tractor },
  { id: 'energy', label: 'Energy', Icon: Zap },
  { id: 'technology', label: 'Technology', Icon: Laptop },
]

const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  '/assets/landing/hero-expand-ghana.png',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
  '/assets/landing/showcase-urban.png',
]

const SECTOR_KEYWORDS: Record<Exclude<SectorId, 'all' | 'other'>, RegExp> = {
  healthcare: /health|clinic|medical|hospital|care|maternal|vacc/i,
  education: /school|edu|learn|scholar|stem|library|student/i,
  agriculture: /farm|crop|irrigation|agri|harvest|co-?op/i,
  energy: /solar|energy|power|grid|renewable|panel/i,
  technology: /tech|digital|software|fintech|data|lab|code/i,
}

function inferSector(name: string, description: string | null | undefined): Exclude<SectorId, 'all'> {
  const text = `${name} ${description ?? ''}`
  for (const [id, re] of Object.entries(SECTOR_KEYWORDS) as [keyof typeof SECTOR_KEYWORDS, RegExp][]) {
    if (re.test(text)) return id
  }
  return 'other'
}

function sectorLabel(s: Exclude<SectorId, 'all'>): string {
  const map: Record<Exclude<SectorId, 'all'>, string> = {
    healthcare: 'Healthcare',
    education: 'Education',
    agriculture: 'Agriculture',
    energy: 'Energy',
    technology: 'Technology',
    other: 'Community',
  }
  return map[s]
}

function pickImage(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997
  return IMAGE_POOL[Math.abs(h) % IMAGE_POOL.length]
}

function parseGoal(goalAmount: string): number {
  const n = Number.parseFloat(String(goalAmount).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function progressPct(raised: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}

export type ExploreCircleRow = {
  id: string
  name: string
  description?: string | null
  goalAmount: string
  status: string
  currency: string
}

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

  const enriched = useMemo(() => {
    return circles.map((c) => {
      const inferred = inferSector(c.name, c.description)
      return {
        ...c,
        inferred,
        imageSrc: pickImage(c.id),
        goal: parseGoal(c.goalAmount),
        raised: 0,
      }
    })
  }, [circles])

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

      <div className="flex flex-wrap gap-2 md:gap-2.5">
        {SECTORS.map(({ id, label, Icon }) => {
          const active = sector === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSector(id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-left text-[12px] font-medium transition-colors md:px-4 md:text-[13px] ${
                active
                  ? 'border-[rgba(240,165,0,0.45)] bg-[rgba(240,165,0,0.14)] text-[var(--mk-offwhite)]'
                  : 'border-[rgba(122,149,196,0.2)] bg-[rgba(11,22,48,0.85)] text-[var(--mk-muted)] hover:border-[rgba(240,165,0,0.25)] hover:text-[var(--mk-offwhite)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 md:h-4 md:w-4" strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>

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
            <ExploreCircleCard
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

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

function ExploreCircleCard({
  circle,
  user,
  requestsByCircleId,
  onRequestJoin,
  requestJoinPending,
}: {
  circle: ExploreCircleRow & {
    inferred: Exclude<SectorId, 'all'>
    imageSrc: string
    goal: number
    raised: number
  }
  user: { id: string } | null
  requestsByCircleId: Map<string, string>
  onRequestJoin: (circleId: string) => void
  requestJoinPending: boolean
}) {
  const pct = progressPct(circle.raised, circle.goal)
  const label = sectorLabel(circle.inferred)

  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] border border-[rgba(240,165,0,0.12)] bg-[var(--mk-navy2)] shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--mk-navy3)]">
        <img
          src={circle.imageSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,13,31,0.75)] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--mk-gold2)] uppercase backdrop-blur-sm">
          {label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug text-white md:text-xl">{circle.name}</h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider label-font"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }}
          >
            {circle.status}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--mk-muted)]">
          {circle.description ?? 'Community circle focused on collective impact.'}
        </p>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold tracking-[0.15em] text-[var(--mk-muted)] uppercase">
            <span>Progress toward goal</span>
            <span className="text-[var(--mk-chart-teal)]">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--mk-chart-teal)] to-[#5eead4] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--mk-muted)]">
            Verified contributions will fill this bar; goal is set by the circle.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[15px] font-bold tabular-nums text-white">{formatMoney(circle.raised, circle.currency)}</p>
            <p className="text-[11px] text-[var(--mk-muted)]">
              raised of {formatMoney(circle.goal, circle.currency)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {user ? (
              <>
                <Link
                  to={`/circles/${circle.id}`}
                  className="mukwano-btn-primary inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold"
                >
                  Open
                </Link>
                <button
                  type="button"
                  className="rounded-full px-3 py-2 text-[11px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
                  onClick={(e) => {
                    e.preventDefault()
                    onRequestJoin(circle.id)
                  }}
                  disabled={requestJoinPending || requestsByCircleId.get(circle.id) === 'pending'}
                >
                  {requestsByCircleId.get(circle.id) === 'pending'
                    ? 'Request pending'
                    : requestsByCircleId.get(circle.id) === 'rejected'
                      ? 'Request again'
                      : requestsByCircleId.get(circle.id)
                        ? `Joined (${requestsByCircleId.get(circle.id)})`
                        : 'Request to join'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="mukwano-btn-primary inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold"
                >
                  Join circle
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full px-3 py-2 text-[11px] font-semibold text-[var(--mk-muted)] hover:text-[var(--mk-gold)]"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
