import { useMemo, useState } from 'react'
import {
  trendingAfrica,
  type TrendingCategory,
  type TrendingItem,
} from '@/data/exploreEditorialData'

const FILTERS: Array<'All' | TrendingCategory> = ['All', 'Tech', 'Investment', 'Startup', 'Finance']

function formatPublished(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

const CATEGORY_BADGE: Record<TrendingCategory, string> = {
  Tech: 'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-300',
  Investment:
    'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-200',
  Startup: 'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-sky-500/15 text-sky-200',
  Finance:
    'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-violet-500/15 text-violet-200',
}

const rowFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(240,165,0,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]'
const FALLBACK_IMAGE = '/news-fallback.svg'

function applyImageFallback(img: HTMLImageElement) {
  if (img.dataset.fallbackApplied === 'true') return
  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_IMAGE
}

function TrendingRow({ item }: { item: TrendingItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex gap-4 rounded-2xl border border-[rgba(240,165,0,0.08)] p-4 transition-all hover:border-[rgba(240,165,0,0.2)] ${rowFocusRing}`}
      style={{ background: 'var(--mk-navy2)' }}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => applyImageFallback(event.currentTarget)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400/90">{item.region.toUpperCase()}</span>
          <span className={CATEGORY_BADGE[item.category]}>{item.category}</span>
          <span className="text-[10px] text-[var(--mk-muted)]">{formatPublished(item.publishedAt)}</span>
        </div>
        <h4 className="mt-1 font-display text-sm font-bold leading-snug text-white sm:text-base">{item.title}</h4>
        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--mk-muted)]">{item.subtitle}</p>
        <span className="sr-only">Opens in a new tab</span>
      </div>
    </a>
  )
}

export function ExploreTrendingAfrica() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')

  const filtered = useMemo(() => {
    if (filter === 'All') return trendingAfrica
    return trendingAfrica.filter((t) => t.category === filter)
  }, [filter])

  return (
    <section aria-labelledby="trending-africa-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: '28px' }}>
            trending_up
          </span>
          <h2 id="trending-africa-heading" className="font-display text-xl font-bold text-white sm:text-2xl">
            Trending in Africa
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {FILTERS.map((pill) => {
          const active = filter === pill
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setFilter(pill)}
              aria-pressed={active}
              aria-controls="trending-africa-list"
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(240,165,0,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]"
              style={{
                borderColor: active ? 'rgba(240, 165, 0, 0.45)' : 'rgba(255,255,255,0.12)',
                background: active ? 'rgba(240, 165, 0, 0.12)' : 'transparent',
                color: active ? 'var(--mk-white)' : 'var(--mk-muted)',
              }}
            >
              {pill}
            </button>
          )
        })}
      </div>

      <div id="trending-africa-list" className="flex flex-col gap-3" aria-live="polite">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(240,165,0,0.08)] px-4 py-8 text-center text-sm text-[var(--mk-muted)]" style={{ background: 'var(--mk-navy2)' }}>
            No items in this category yet.
          </p>
        ) : (
          filtered.map((item) => <TrendingRow key={item.id} item={item} />)
        )}
      </div>

      <div className="pt-2">
        <a
          href="https://www.reuters.com/world/africa/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-2xl border px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(240,165,0,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]"
          style={{
            borderColor: 'rgba(255,255,255,0.14)',
            background: 'rgba(6, 13, 31, 0.5)',
          }}
        >
          Browse Global Feed
          <span className="sr-only"> Opens in a new tab</span>
        </a>
      </div>
    </section>
  )
}
