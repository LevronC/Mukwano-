import type { CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

/** Subtle top accent per card — deterministic from id, no extra data. */
function exploreCardTopAccent(circleId: string): CSSProperties {
  let n = 0
  for (let i = 0; i < circleId.length; i++) {
    n = (n + circleId.charCodeAt(i) * (i + 1)) % 360
  }
  const h2 = (n + 52) % 360
  return {
    background: `linear-gradient(90deg, hsla(${n}, 50%, 46%, 0.42) 0%, hsla(${h2}, 46%, 40%, 0.22) 55%, transparent 100%)`,
  }
}

export function ExplorePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

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
    <div className="space-y-12 md:space-y-16">
      {/* Hero — editorial layout */}
      <section className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-3 space-y-5 md:space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-demo">Demo Mode</span>
            <span className="chip-escrow flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              Simulated Escrow
            </span>
          </div>
          <h1
            className="text-[2.5rem] sm:text-[3rem] md:text-[3.25rem] leading-[1.08] font-semibold tracking-tight"
            style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Join a movement.
            <br />
            <span style={{ color: 'var(--mk-gold)' }}>Build a legacy.</span>
          </h1>
          <p className="text-base sm:text-lg max-w-lg leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
            Find active circles and contribute to projects in your chosen country and sector.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {user ? (
              <>
                <Link
                  to="/circles/new"
                  className="mukwano-btn-primary mukwano-cursor-hover flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold focus-visible:outline-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
                  Create a Circle
                </Link>
                <Link
                  to="/circles"
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-7 py-3.5 font-semibold text-[var(--mk-white)] transition-all duration-200 ease-out hover:border-[rgba(240,165,0,0.4)] hover:bg-white/[0.1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]"
                >
                  Browse all
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="mukwano-btn-primary mukwano-cursor-hover flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold focus-visible:outline-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group_add</span>
                  Create a Circle
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-7 py-3.5 font-semibold text-[var(--mk-white)] transition-all duration-200 ease-out hover:border-[rgba(240,165,0,0.4)] hover:bg-white/[0.1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy)]"
                >
                  Browse all
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Brand illustration */}
        <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <div
              className="absolute inset-[-12%] rounded-full opacity-[0.12]"
              style={{ background: 'var(--mk-gold)', filter: 'blur(56px)' }}
            />
            <img
              src={mukwanoLogo}
              alt="Mukwano logo"
              className="relative z-[1] w-full h-full object-contain opacity-95 drop-shadow-[0_20px_48px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      </section>

      {/* Circles grid */}
      <section>
        <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]" style={{ color: 'var(--mk-white)' }}>
          Active Communities
        </h2>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(circles ?? []).map((circle) => (
              <article
                key={circle.id}
                className="mukwano-card group flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-ambient-lg"
              >
                <div className="h-1 w-full shrink-0" style={exploreCardTopAccent(circle.id)} aria-hidden />
                <div className="flex flex-1 flex-col gap-3 p-5 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="rounded-lg border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-widest label-font text-teal-100/95"
                      title="Circle status"
                    >
                      {circle.status}
                    </span>
                    <span
                      className="shrink-0 rounded-lg border border-[rgba(240,165,0,0.35)] bg-[rgba(240,165,0,0.1)] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-[var(--mk-gold2)] label-font"
                      title="Goal currency"
                    >
                      {circle.currency}
                    </span>
                  </div>
                  <div className="min-h-0">
                    <h3 className="text-lg font-semibold leading-snug" style={{ color: 'var(--mk-white)' }}>
                      {circle.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--mk-muted)' }}>
                      {circle.description ?? 'Community circle focused on collective impact.'}
                    </p>
                  </div>
                  <div className="mt-auto border-t border-white/[0.06] pt-4">
                    <div className="mb-4">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
                        Goal
                      </p>
                      <p className="mt-1 text-base font-bold tabular-nums tracking-tight" style={{ color: 'var(--mk-white)' }}>
                        {circle.goalAmount} {circle.currency}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user ? (
                        <Link
                          to={`/circles/${circle.id}`}
                          className="mukwano-btn-primary mukwano-cursor-hover flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none"
                        >
                          Open
                          <span className="material-symbols-outlined transition-transform duration-200 group-hover:translate-x-0.5" style={{ fontSize: '16px' }}>
                            arrow_forward
                          </span>
                        </Link>
                      ) : (
                        <Link
                          to="/signup"
                          className="mukwano-btn-primary mukwano-cursor-hover flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none"
                        >
                          Sign up
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            arrow_forward
                          </span>
                        </Link>
                      )}
                      {user ? (
                        <button
                          type="button"
                          className="rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[var(--mk-white)] transition-all duration-200 ease-out hover:border-[rgba(240,165,0,0.35)] hover:bg-white/[0.1] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/12 disabled:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-navy2)]"
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
                      ) : (
                        <Link
                          to="/signup"
                          className="mukwano-btn-primary mukwano-cursor-hover flex items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-semibold focus-visible:outline-none"
                        >
                          Sign up to join
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  // Always render a self-contained layout so the page has proper container/centering
  // regardless of whether the user arrived via the public route or the protected shell.
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--mk-navy, #060d1f)' }}>
      <header
        className="sticky top-0 z-50 border-b bg-[rgba(6,13,31,0.78)] backdrop-blur-md backdrop-saturate-150"
        style={{ borderColor: 'rgba(240, 165, 0, 0.12)' }}
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
                className="mukwano-btn-primary mukwano-cursor-hover rounded-xl px-5 py-2 text-sm font-semibold focus-visible:outline-none"
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
