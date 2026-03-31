import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const COUNTRIES = ['Uganda', 'Kenya', 'Nigeria', 'Ghana', 'Rwanda', 'Tanzania', 'South Africa', 'Ethiopia']

export function OnboardingCountryPage() {
  const navigate = useNavigate()
  const [country, setCountry] = useState('Uganda')
  const [search, setSearch] = useState('')
  const filtered = COUNTRIES.filter((value) => value.toLowerCase().includes(search.toLowerCase()))
  const save = useMutation({
    mutationFn: () => api.patch('/auth/me', { country }),
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
          Which country are you investing in?
        </h1>
        <p className="mb-8 text-base" style={{ color: 'var(--mk-muted)' }}>
          Pick the country where your circle will create impact.
        </p>

        {/* Search */}
        <div className="relative mb-6">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ fontSize: '20px', color: 'var(--mk-muted)' }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search country…"
            className="mukwano-input pl-11"
            style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((value) => (
            <button
              key={value}
              onClick={() => setCountry(value)}
              className="rounded-xl p-4 text-left transition-all active:scale-[0.98]"
              style={
                country === value
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
              <p className="font-medium text-sm">{value}</p>
            </button>
          ))}
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
