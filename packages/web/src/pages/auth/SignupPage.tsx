import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorField, getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldError(null)
    try {
      const res = await signup({ displayName, email, password })
      if (res.user.emailVerified === false) {
        toast.message('Check your email for a link to verify your address. You can resend it from the banner after you continue.')
      }
      navigate('/verify-email-required', { replace: true })
    } catch (error) {
      setFieldError(getErrorField(error))
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="fixed top-6 right-6 z-50">
        <span className="chip-demo">Demo Mode</span>
      </div>

      <div className="mb-8 text-center">
        <Link to="/" className="inline-block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold)]">
          <img
            src={mukwanoLogo}
            alt="Mukwano logo"
            className="mx-auto h-24 w-auto rounded-2xl bg-white/95 p-2 shadow-ambient"
          />
        </Link>
        <p className="mt-2 text-sm tracking-[0.08em] uppercase" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          Building Together
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium label-font transition-opacity hover:opacity-90"
          style={{ color: 'var(--mk-muted)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
            arrow_back
          </span>
          Back to home
        </Link>
      </div>

      <div className="mukwano-card w-full max-w-[440px] p-8 shadow-ambient-lg">
        <h2 className="mb-7 text-[1.375rem] font-semibold leading-tight" style={{ color: 'var(--mk-white)' }}>
          Create your account
        </h2>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="signup-display-name"
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
            >
              Full Name
            </label>
            <input
              id="signup-display-name"
              className="mukwano-input"
              placeholder="Enter your full name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            {fieldError === 'displayName' && (
              <p className="text-xs ml-1" style={{ color: '#ba1a1a' }}>
                Display name is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
            >
              Email Address
            </label>
            <input
              id="signup-email"
              className="mukwano-input"
              type="email"
              placeholder="example@mukwano.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                className="mukwano-input pr-12"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--mk-muted)' }}
                onClick={() => setShowPassword((v) => !v)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="mukwano-btn-primary mukwano-cursor-hover w-full rounded-xl py-3.5 font-semibold text-base mt-2">
            Continue
          </button>
        </form>

        <p className="mt-5 text-xs text-center" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          This platform is in demo mode. No real funds are collected or processed. By signing up, you agree to our{' '}
          <Link className="font-medium" style={{ color: 'var(--mk-gold)' }} to="/terms">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link className="font-medium" style={{ color: 'var(--mk-gold)' }} to="/privacy">
            Privacy Policy
          </Link>.
        </p>

        <p className="mt-4 text-sm text-center" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          Already have an account?{' '}
          <Link className="font-semibold" style={{ color: 'var(--mk-gold)' }} to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
