import { Link } from 'react-router-dom'
import type { EnrichedCircle } from '@/components/circles/circleShowcaseModel'
import { progressPct, sectorLabel } from '@/components/circles/circleShowcaseModel'

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

export type CircleShowcaseCardProps = {
  circle: EnrichedCircle
  user: { id: string } | null
  requestsByCircleId: Map<string, string>
  onRequestJoin: (circleId: string) => void
  requestJoinPending: boolean
}

export function CircleShowcaseCard({
  circle,
  user,
  requestsByCircleId,
  onRequestJoin,
  requestJoinPending,
}: CircleShowcaseCardProps) {
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
            <p className="text-[11px] text-[var(--mk-muted)]">raised of {formatMoney(circle.goal, circle.currency)}</p>
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
