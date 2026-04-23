import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'
import { US_STATE_NAMES, isoCodeToFlagEmoji } from '@/lib/onboarding-display'

export function OnboardingUsaStatePage() {
  const navigate = useNavigate()
  const { refreshUser, user, loading } = useAuth()
  const [residenceRegion, setResidenceRegion] = useState('California')
  const [search, setSearch] = useState('')

  if (loading) {
    return <div className="p-4 text-[var(--mk-muted)]">Loading...</div>
  }
  if (user && user.residenceCountry && user.residenceCountry !== 'United States') {
    return <Navigate to="/onboarding/country" replace />
  }

  const filtered = US_STATE_NAMES.filter((name) => name.toLowerCase().includes(search.toLowerCase()))

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/auth/me', { residenceRegion })
      const params = new URLSearchParams({
        residenceCountry: 'United States',
        residenceRegion
      })
      return api.get<{ count: number }>(`/auth/me/residence-peer-count?${params.toString()}`)
    },
    onSuccess: async (peerData) => {
      await refreshUser()
      if (peerData.count <= 1) {
        navigate('/onboarding/explore-circles')
        return
      }
      navigate('/onboarding/complete')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-16 pb-36">
        <div className="mb-3 flex gap-2">
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--mk-gold)' }} />
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--mk-gold)' }} />
        </div>
        <p className="mb-4 flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-gold)' }}>
          <span className="text-base leading-none" aria-hidden>
            {isoCodeToFlagEmoji('US')}
          </span>
          United States
        </p>

        <h1
          className="mb-2 text-3xl font-semibold"
          style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Which state or territory do you live in?
        </h1>
        <p className="mb-8 text-base" style={{ color: 'var(--mk-muted)' }}>
          We use this to connect you to nearby circles. You can change it anytime in your profile.
        </p>

        <div className="mb-6">
          <label htmlFor="state-search" className="sr-only">
            Search state
          </label>
          <div
            className="flex w-full items-center gap-3 rounded-[0.75rem] border border-[rgba(240,165,0,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-[box-shadow,border-color] focus-within:border-[rgba(240,165,0,0.45)] focus-within:shadow-[0_0_0_2px_rgba(240,165,0,0.35)]"
          >
            <span
              className="material-symbols-outlined pointer-events-none shrink-0 select-none"
              style={{ fontSize: '22px', color: 'var(--mk-muted)' }}
              aria-hidden
            >
              search
            </span>
            <input
              id="state-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search state…"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-[rgba(122,149,196,0.65)]"
              style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
        </div>

        <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((name) => {
            const selected = residenceRegion === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setResidenceRegion(name)}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.98]"
                style={
                  selected
                    ? {
                        background: 'rgba(240,165,0,0.12)',
                        outline: '2px solid var(--mk-gold)',
                        color: 'var(--mk-gold)'
                      }
                    : {
                        background: 'var(--mk-navy2)',
                        outline: '2px solid rgba(240,165,0,0.15)',
                        color: 'var(--mk-white)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                      }
                }
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 w-full px-6 py-5 glass-nav"
        style={{ background: 'rgba(6,13,31,0.92)', borderTop: '1px solid rgba(240,165,0,0.12)' }}
      >
        <div className="mx-auto flex max-w-2xl justify-between">
          <button
            className="rounded-xl px-5 py-3 font-medium text-sm transition-colors hover:bg-white/10"
            style={{ color: 'var(--mk-muted)' }}
            onClick={() => navigate('/onboarding/country')}
          >
            ← Back
          </button>
          <button
            className="mukwano-btn-primary rounded-xl px-8 py-3 font-semibold"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
