import { Link } from 'react-router-dom'
import { communityNews, type CommunityNewsItem, type CommunityNewsType } from '@/data/exploreEditorialData'

const TYPE_LABEL: Record<CommunityNewsType, string> = {
  circle: 'Circle',
  project: 'Project update',
  proposal: 'Proposal',
  contribution: 'Contribution',
}

const cardFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(240,165,0,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]'
const FALLBACK_IMAGE = '/news-fallback.svg'

function applyImageFallback(img: HTMLImageElement) {
  if (img.dataset.fallbackApplied === 'true') return
  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_IMAGE
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TypeBadge({ type }: { type: CommunityNewsType }) {
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: 'rgba(240, 165, 0, 0.15)',
        color: 'var(--mk-gold)',
      }}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}

/** Thumbnail beside duplicated headline text — decorative per WCAG when alt is empty. */
function CardImage({ src, loading }: { src: string; loading?: 'lazy' | 'eager' }) {
  return (
    <img
      src={src}
      alt=""
      loading={loading ?? 'lazy'}
      decoding="async"
      onError={(event) => applyImageFallback(event.currentTarget)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  )
}

function FeaturedCard({ item }: { item: CommunityNewsItem }) {
  return (
    <Link
      to={item.href}
      className={`group flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.1)] transition-all hover:border-[rgba(240,165,0,0.2)] sm:min-h-[320px] md:flex-row ${cardFocusRing}`}
      style={{ background: 'var(--mk-navy2)' }}
    >
      <div className="aspect-[4/3] shrink-0 md:aspect-auto md:w-[46%]">
        <CardImage src={item.imageUrl} loading="eager" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-6 md:py-8">
        <TypeBadge type={item.type} />
        <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">{item.title}</h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--mk-muted)]">{item.description}</p>
        <p className="text-xs text-[var(--mk-muted)]">{formatTime(item.createdAt)}</p>
      </div>
    </Link>
  )
}

function SideCard({ item }: { item: CommunityNewsItem }) {
  return (
    <Link
      to={item.href}
      className={`group flex gap-4 overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.08)] p-4 transition-all hover:border-[rgba(240,165,0,0.18)] ${cardFocusRing}`}
      style={{ background: 'var(--mk-navy2)' }}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => applyImageFallback(event.currentTarget)}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="text-[10px] text-[var(--mk-muted)]">{formatTime(item.createdAt)}</span>
        </div>
        <h4 className="font-display text-sm font-bold leading-snug text-white">{item.title}</h4>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--mk-muted)]">{item.description}</p>
      </div>
    </Link>
  )
}

function CompactCard({ item }: { item: CommunityNewsItem }) {
  return (
    <Link
      to={item.href}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[rgba(240,165,0,0.08)] transition-all hover:border-[rgba(240,165,0,0.18)] ${cardFocusRing}`}
      style={{ background: 'var(--mk-navy2)' }}
    >
      <div className="aspect-[16/9] overflow-hidden">
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => applyImageFallback(event.currentTarget)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="text-[10px] text-[var(--mk-muted)]">{formatTime(item.createdAt)}</span>
        </div>
        <h4 className="font-display text-sm font-bold text-white">{item.title}</h4>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--mk-muted)]">{item.description}</p>
      </div>
    </Link>
  )
}

export function ExploreCommunityNews() {
  const [featured, ...rest] = communityNews
  const side = rest.slice(0, 2)
  const more = rest.slice(2)

  if (!featured) return null

  return (
    <section aria-labelledby="community-news-heading" className="space-y-6">
      <h2 id="community-news-heading" className="font-display text-xl font-bold text-white sm:text-2xl">
        Community News
      </h2>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
        <div className="lg:col-span-3">
          <FeaturedCard item={featured} />
        </div>
        {side.length > 0 && (
          <div className="flex flex-col gap-4 lg:col-span-2">
            {side.map((item) => (
              <SideCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {more.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {more.map((item) => (
            <CompactCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
