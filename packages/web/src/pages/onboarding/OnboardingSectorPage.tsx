import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { ONBOARDING_SECTORS } from '@/lib/onboarding-display'

export function OnboardingSectorPage() {
  const navigate = useNavigate()
  const [sector, setSector] = useState('Education')
  const save = useMutation({
    mutationFn: () => api.patch('/auth/me', { sector }),
    onSuccess: () => navigate('/onboarding/country'),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-16 pb-36">
        {/* Progress */}
        <div className="mb-3 flex gap-2">
          <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--mk-gold)' }} />
          <div className="h-1 flex-1 rounded-full" style={{ background: 'rgba(240,165,0,0.15)' }} />
        </div>
        <p className="mb-10 text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-gold)' }}>
          Step 1 of 2
        </p>

        <h1 className="mb-2 text-3xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          What would you like to invest in?
        </h1>
        <p className="mb-10 text-base" style={{ color: 'var(--mk-muted)' }}>
          Choose one sector that matters most to you.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ONBOARDING_SECTORS.map(({ label, icon, shortHint }) => {
            const selected = sector === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSector(label)}
                className="flex items-start gap-4 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
                style={
                  selected
                    ? { background: 'rgba(240,165,0,0.12)', outline: '2px solid var(--mk-gold)' }
                    : {
                        background: 'var(--mk-navy2)',
                        outline: '2px solid rgba(240,165,0,0.15)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
                      }
                }
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: selected ? 'rgba(240,165,0,0.2)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(240,165,0,0.2)'
                  }}
                  aria-hidden
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '28px',
                      color: selected ? 'var(--mk-gold)' : 'var(--mk-muted)',
                      fontVariationSettings: "'FILL' 1"
                    }}
                  >
                    {icon}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: selected ? 'var(--mk-gold)' : 'var(--mk-white)' }}>
                    {label}
                  </p>
                  <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--mk-muted)' }}>
                    {shortHint}
                  </p>
                </span>
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
        <div className="mx-auto flex max-w-2xl justify-end">
          <button
            className="mukwano-btn-primary rounded-xl px-8 py-3 font-semibold"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Next: Choose country'}
          </button>
        </div>
      </div>
    </div>
  )
}
