import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { flagEmojiForCountryName, RESIDENCE_COUNTRIES } from '@/lib/onboarding-display'

export function OnboardingCountryPage() {
  const navigate = useNavigate()
  const [residenceCountry, setResidenceCountry] = useState('United States')
  const [search, setSearch] = useState('')
  const filtered = RESIDENCE_COUNTRIES.filter(({ name }) =>
    name.toLowerCase().includes(search.toLowerCase())
  )
  const save = useMutation({
    mutationFn: () => api.patch('/auth/me', { residenceCountry }),
    onSuccess: () => navigate('/onboarding/complete'),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-16 pb-36">
        {/* Progress */}
        <div className="mb-3 flex gap-2">
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--mk-gold)' }} />
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--mk-gold)' }} />
        </div>
        <p className="mb-10 text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-gold)' }}>
          Step 2 of 2
        </p>

        <h1 className="mb-2 text-3xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Which country do you currently live in?
        </h1>
        <p className="mb-8 text-base" style={{ color: 'var(--mk-muted)' }}>
          Pick your residence country so we can localize your circle discovery.
        </p>

        {/* Search — flex row so icon never overlaps text/caret (absolute+pl-* fought .mukwano-input padding) */}
        <div className="mb-6">
          <label htmlFor="country-search" className="sr-only">
            Search countries
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
              id="country-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search country…"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-[rgba(122,149,196,0.65)]"
              style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map(({ name }) => {
            const flag = flagEmojiForCountryName(name)
            const selected = residenceCountry === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setResidenceCountry(name)}
                className="flex items-center gap-3 rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                style={
                  selected
                    ? {
                        background: 'rgba(240,165,0,0.12)',
                        outline: '2px solid var(--mk-gold)',
                        color: 'var(--mk-gold)',
                        fontWeight: 600
                      }
                    : {
                        background: 'var(--mk-navy2)',
                        outline: '2px solid rgba(240,165,0,0.15)',
                        color: 'var(--mk-white)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
                      }
                }
              >
                <span className="text-3xl leading-none select-none" aria-hidden title={name}>
                  {flag}
                </span>
                <p className="font-medium text-sm leading-snug">{name}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 w-full px-6 py-5 glass-nav"
        style={{ background: 'rgba(6,13,31,0.92)', borderTop: '1px solid rgba(240,165,0,0.12)' }}
      >
        <div className="mx-auto flex max-w-2xl justify-between">
          <button
            className="rounded-xl px-5 py-3 font-medium text-sm transition-colors hover:bg-white/10"
            style={{ color: 'var(--mk-muted)' }}
            onClick={() => navigate('/onboarding/sector')}
          >
            ← Back
          </button>
          <button
            className="mukwano-btn-primary rounded-xl px-8 py-3 font-semibold"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : "Let's go →"}
          </button>
        </div>
      </div>
    </div>
  )
}
