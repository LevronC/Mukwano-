import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, authStorage } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { useAuth } from '@/contexts/AuthContext'

const mukwanoLogo = '/assets/mukwano-logo.png'

type Status = 'loading' | 'success' | 'error' | 'missing'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser, refreshSession } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')?.trim() ?? ''

  useEffect(() => {
    if (!token) {
      setStatus('missing')
      setMessage('No verification token was provided. Use the link from your email.')
      return
    }

    let cancelled = false
    let redirectTimer: ReturnType<typeof setTimeout> | undefined

    void (async () => {
      try {
        await api.post('/auth/verify-email', { token })
        if (cancelled) return
        setStatus('success')
        setMessage('Your email has been verified.')
        if (authStorage.getRefresh()) {
          try {
            await refreshSession()
          } catch {
            try {
              await refreshUser()
            } catch {
              /* ignore */
            }
          }
        } else if (authStorage.getAccess()) {
          try {
            await refreshUser()
          } catch {
            /* ignore */
          }
        }
        redirectTimer = setTimeout(() => {
          navigate(authStorage.getAccess() ? '/dashboard' : '/login', { replace: true })
        }, 2000)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(getErrorMessage(e))
      }
    })()

    return () => {
      cancelled = true
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [token, navigate, refreshUser, refreshSession])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-8 inline-block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-gold)]">
        <img src={mukwanoLogo} alt="Mukwano logo" className="mx-auto h-20 w-auto rounded-2xl bg-white/95 p-2 shadow-ambient" />
      </Link>
      <div className="mukwano-card w-full max-w-md p-8 text-center shadow-ambient-lg">
        {status === 'loading' && (
          <p style={{ color: 'var(--mk-muted)' }}>Verifying your email…</p>
        )}
        {status === 'success' && (
          <>
            <p className="font-semibold" style={{ color: '#84d6b9' }}>{message}</p>
            <p className="mt-3 text-sm" style={{ color: 'var(--mk-muted)' }}>Redirecting…</p>
          </>
        )}
        {(status === 'error' || status === 'missing') && (
          <>
            <p className="font-medium" style={{ color: '#fecaca' }}>{message}</p>
            <Link className="mt-6 inline-block font-semibold" style={{ color: 'var(--mk-gold)' }} to="/login">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
