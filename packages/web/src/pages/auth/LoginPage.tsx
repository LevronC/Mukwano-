import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'
const AUTH_NOTICE_KEY = 'mukwano_auth_notice'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem(AUTH_NOTICE_KEY)
      if (notice === 'session_expired') {
        sessionStorage.removeItem(AUTH_NOTICE_KEY)
        toast.message('Your session expired. Please sign in again.')
      }
    } catch {
      /* private mode */
    }
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
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
          Welcome back
        </h2>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
            >
              Email Address
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                className="mukwano-input pr-12"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
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
            Sign in
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--mk-muted)', fontFamily: "'Inter', sans-serif" }}>
          No account?{' '}
          <Link className="font-semibold" style={{ color: 'var(--mk-gold)' }} to="/signup">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
