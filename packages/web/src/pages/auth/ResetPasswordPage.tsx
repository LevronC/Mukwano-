import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const mukwanoLogo = '/assets/mukwano-logo.png'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) {
      toast.error('Invalid or missing reset link')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setPending(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
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
      </div>

      <div className="mukwano-card w-full max-w-[440px] p-8 shadow-ambient-lg">
        <h2 className="mb-6 text-[1.375rem] font-semibold leading-tight" style={{ color: 'var(--mk-white)' }}>
          Set new password
        </h2>

        {!token ? (
          <p className="text-sm" style={{ color: '#fecaca' }}>
            This reset link is invalid.{' '}
            <Link className="font-semibold" style={{ color: 'var(--mk-gold)' }} to="/forgot-password">
              Request a new one
            </Link>
            .
          </p>
        ) : done ? (
          <>
            <p className="text-sm" style={{ color: '#84d6b9' }}>Password reset successfully.</p>
            <Link
              className="mt-6 inline-block w-full rounded-xl py-3.5 text-center text-sm font-semibold mukwano-btn-primary"
              to="/login"
            >
              Sign in
            </Link>
          </>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="reset-pw" className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
                New password
              </label>
              <input
                id="reset-pw"
                className="mukwano-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reset-pw2" className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
                Confirm password
              </label>
              <input
                id="reset-pw2"
                className="mukwano-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="mukwano-btn-primary mukwano-cursor-hover mt-2 w-full rounded-xl py-3.5 font-semibold text-base"
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--mk-muted)' }}>
          <Link className="font-semibold" style={{ color: 'var(--mk-gold)' }} to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
