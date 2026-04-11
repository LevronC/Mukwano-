import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSubmitted(true)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <Link to="/" className="inline-block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold)]">
          <img src={mukwanoLogo} alt="Mukwano logo" className="mx-auto h-24 w-auto rounded-2xl bg-white/95 p-2 shadow-ambient" />
        </Link>
        <p className="mt-2 text-sm tracking-[0.08em] uppercase" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          Building Together
        </p>
      </div>

      <div className="mukwano-card w-full max-w-[440px] p-8 shadow-ambient-lg">
        <h2 className="mb-2 text-[1.375rem] font-semibold leading-tight" style={{ color: 'var(--mk-white)' }}>
          Forgot password
        </h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--mk-muted)' }}>
          Enter your account email. If it exists, we will send a reset link.
        </p>

        {submitted ? (
          <p className="text-sm" style={{ color: 'var(--mk-white)' }}>
            If an account exists with that email, we have sent a reset link. Check your inbox and spam folder.
          </p>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
                Email
              </label>
              <input
                id="forgot-email"
                className="mukwano-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="mukwano-btn-primary mukwano-cursor-hover w-full rounded-xl py-3.5 font-semibold text-base"
              disabled={pending}
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          <Link className="font-semibold" style={{ color: 'var(--mk-gold)' }} to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
