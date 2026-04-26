import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { ExploreCommunityNews } from '@/components/explore/ExploreCommunityNews'
import { ExploreImpactFeatured } from '@/components/explore/ExploreImpactFeatured'
import { ExploreTrendingAfrica } from '@/components/explore/ExploreTrendingAfrica'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { ONBOARDING_COUNTRIES, flagEmojiForCountryName } from '@/lib/onboarding-display'

const mukwanoLogo = '/assets/mukwano-logo.png'

type ExploreSort = 'recent' | 'members' | 'funded'

export function ExplorePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [sort, setSort] = useState<ExploreSort>('recent')

  // Debounce text search by 350 ms
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const params = useMemo(() => {
    const p: Record<string, string> = { sort }
    if (q) p.q = q
    if (country) p.country = country
    return p
  }, [q, country, sort])

  const { data: circles, isLoading, error } = useQuery({
    queryKey: ['circles-explore', params],
    queryFn: () => {
      const qs = new URLSearchParams(params).toString()
      return api.get<
        Array<{
          id: string
          name: string
          description?: string | null
          country?: string | null
          sector?: string | null
          goalAmount: string
          status: string
          currency: string
          coverImageUrl?: string | null
          verifiedRaisedAmount?: string | null
          memberCount?: number
        }>
      >(`/explore/circles?${qs}`)
    }
  })

  const { data: myRequests } = useQuery({
    queryKey: ['my-circle-requests'],
    queryFn: () =>
      api.get<Array<{ circleId: string; role: string }>>('/circles/my-requests'),
    enabled: !!user
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

  const pageContent = (
    <div className="space-y-10">
      {/* Hero — editorial layout */}
      <section className="grid lg:grid-cols-5 gap-10 items-center">
        <div className="lg:col-span-3 space-y-6">
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
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="mukwano-btn-primary flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
                  Create a Circle
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold transition-all hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
                >
                  Browse all
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Brand illustration */}
        <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full opacity-10" style={{ background: 'var(--mk-gold)', filter: 'blur(60px)' }} />
            <img src={mukwanoLogo} alt="Mukwano logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </section>

      {/* Search + filter bar — prominent, right below the hero */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Text search */}
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 select-none"
              style={{ fontSize: '18px', color: 'var(--mk-muted)' }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search circles…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
              style={{
                background: 'var(--mk-navy2)',
                border: '1px solid rgba(240,165,0,0.15)',
                color: 'var(--mk-white)',
              }}
            />
          </div>

          {/* Country filter */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--mk-navy2)',
              border: '1px solid rgba(240,165,0,0.15)',
              color: country ? 'var(--mk-white)' : 'var(--mk-muted)',
              minWidth: '160px',
            }}
          >
            <option value="">All countries</option>
            {ONBOARDING_COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {flagEmojiForCountryName(c.name)} {c.name}
              </option>
            ))}
          </select>

          {/* Sort buttons */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--mk-navy2)' }}>
            {(['recent', 'members', 'funded'] as ExploreSort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                style={
                  sort === s
                    ? { background: 'var(--mk-gold)', color: '#0a0e18' }
                    : { color: 'var(--mk-muted)' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {(q || country) && (
          <div className="flex flex-wrap gap-2">
            {q && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--mk-gold)' }}
              >
                "{q}"
                <button onClick={() => { setSearchInput(''); setQ('') }} className="opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
            {country && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--mk-gold)' }}
              >
                {flagEmojiForCountryName(country)} {country}
                <button onClick={() => setCountry('')} className="opacity-70 hover:opacity-100">✕</button>
              </span>
            )}
          </div>
        )}
      </section>

      <ExploreImpactFeatured
        circles={circles ?? []}
        isLoading={isLoading}
        error={error}
        user={user ? { id: user.id } : null}
        requestsByCircleId={requestsByCircleId}
        onRequestJoin={(circleId) => requestJoin.mutate(circleId)}
        requestJoinPending={requestJoin.isPending}
      />

      <ExploreCommunityNews />

      <ExploreTrendingAfrica />
    </div>
  )

  // Always render a self-contained layout so the page has proper container/centering
  // regardless of whether the user arrived via the public route or the protected shell.
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--mk-navy, #060d1f)' }}>
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(6, 13, 31, 0.88)',
          borderColor: 'rgba(240, 165, 0, 0.12)'
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to={user ? '/dashboard' : '/'}>
            <img src={mukwanoLogo} alt="Mukwano logo" className="h-10 w-auto rounded-xl bg-white/95 p-1" />
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-muted)', fontFamily: "'Outfit', sans-serif" }}
              >
                Home
              </Link>
              <Link
                to="/circles"
                className="text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-muted)', fontFamily: "'Outfit', sans-serif" }}
              >
                My Circles
              </Link>
              <Link
                to="/portfolio"
                className="text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-muted)', fontFamily: "'Outfit', sans-serif" }}
              >
                Portfolio
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="mukwano-btn-primary rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Join a Circle
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-8 pb-20 flex-1">
        {pageContent}
      </main>

      {/* Footer */}
      <footer
        className="border-t mt-auto"
        style={{ borderColor: 'rgba(240, 165, 0, 0.08)', background: 'rgba(6, 13, 31, 0.6)' }}
      >
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
            &copy; {new Date().getFullYear()} Mukwano. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Link
              to="/terms"
              className="transition-colors hover:text-[var(--mk-gold)]"
              style={{ color: 'var(--mk-muted)' }}
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-[var(--mk-gold)]"
              style={{ color: 'var(--mk-muted)' }}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
