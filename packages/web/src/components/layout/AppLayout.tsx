import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner'

const mukwanoLogo = '/assets/mukwano-logo.png'

const navInactive = { color: 'var(--mk-muted)' }
const navActive = { color: 'var(--mk-gold)', borderColor: 'var(--mk-gold)' }

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ demoMode: boolean; escrowLabel: string }>('/config'),
    staleTime: Infinity
  })

  const { notifications, unreadCount, markAllRead } = useNotifications(!!user)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  function handleBellClick() {
    if (!notifOpen) {
      setNotifOpen(true)
      if (unreadCount > 0) markAllRead()
    } else {
      setNotifOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header
        className="glass-nav sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(6, 13, 31, 0.88)',
          borderColor: 'rgba(240, 165, 0, 0.12)'
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <img src={mukwanoLogo} alt="Mukwano logo" className="h-10 w-auto rounded-xl bg-white/95 p-1" />
            <div
              className="hidden items-center gap-7 md:flex"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.9375rem', fontWeight: 500 }}
            >
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 pb-0.5 transition-colors' : 'transition-colors hover:text-[var(--mk-gold)]'
                }
                style={({ isActive }) => (isActive ? navActive : navInactive)}
              >
                Home
              </NavLink>
              <NavLink
                to="/circles"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 pb-0.5 transition-colors' : 'transition-colors hover:text-[var(--mk-gold)]'
                }
                style={({ isActive }) => (isActive ? navActive : navInactive)}
              >
                My Circles
              </NavLink>
              <NavLink
                to="/explore"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 pb-0.5 transition-colors' : 'transition-colors hover:text-[var(--mk-gold)]'
                }
                style={({ isActive }) => (isActive ? navActive : navInactive)}
              >
                Explore
              </NavLink>
              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 pb-0.5 transition-colors' : 'transition-colors hover:text-[var(--mk-gold)]'
                }
                style={({ isActive }) => (isActive ? navActive : navInactive)}
              >
                Portfolio
              </NavLink>
              {user?.isGlobalAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? 'border-b-2 pb-0.5 transition-colors' : 'transition-colors hover:text-[var(--mk-gold)]'
                  }
                  style={({ isActive }) => (isActive ? navActive : navInactive)}
                >
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config?.demoMode && (
              <span className="chip-demo hidden md:inline-flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>
                  security
                </span>
                Simulated Escrow
              </span>
            )}
            <div ref={bellRef} className="relative">
              <button
                onClick={handleBellClick}
                className="mukwano-cursor-hover rounded-full p-2 transition-colors hover:bg-white/5"
                style={{ color: notifOpen ? 'var(--mk-gold)' : 'var(--mk-muted)' }}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                type="button"
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '22px',
                    fontVariationSettings: notifOpen ? "'FILL' 1" : undefined
                  }}
                >
                  notifications
                </span>
                {unreadCount > 0 && !notifOpen && (
                  <span
                    className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                    style={{ background: '#e53e3e', color: '#fff' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="mukwano-cursor-hover rounded-full p-2 transition-colors hover:bg-white/5 hidden md:flex"
              style={{ color: 'var(--mk-gold)' }}
              aria-label="Profile"
              type="button"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                account_circle
              </span>
            </button>
            <button
              className="mukwano-cursor-hover rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:border-[var(--mk-gold)] hover:text-[var(--mk-gold)] hidden md:block"
              style={{
                background: 'transparent',
                borderColor: 'rgba(240, 165, 0, 0.35)',
                color: 'var(--mk-white)',
                fontFamily: "'Inter', sans-serif"
              }}
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
            >
              Logout
            </button>
            {/* Hamburger button — mobile only */}
            <button
              className="md:hidden rounded-full p-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--mk-gold)' }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>

        {/* Mobile slide-out drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden flex flex-col"
            style={{ background: 'rgba(6, 13, 31, 0.95)' }}
          >
            {(
              [
                { to: '/dashboard', label: 'Home' },
                { to: '/circles', label: 'My Circles' },
                { to: '/explore', label: 'Explore' },
                { to: '/portfolio', label: 'Portfolio' },
                ...(user?.isGlobalAdmin ? [{ to: '/admin', label: 'Admin' }] : [])
              ] as Array<{ to: string; label: string }>
            ).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'block px-6 py-4 text-sm font-medium border-l-2 transition-colors'
                    : 'block px-6 py-4 text-sm font-medium transition-colors hover:text-[var(--mk-gold)]'
                }
                style={({ isActive }) =>
                  isActive
                    ? { color: 'var(--mk-gold)', borderColor: 'var(--mk-gold)', borderBottom: '1px solid rgba(240, 165, 0, 0.08)', fontFamily: "'Outfit', sans-serif" }
                    : { color: 'var(--mk-muted)', borderBottom: '1px solid rgba(240, 165, 0, 0.08)', fontFamily: "'Outfit', sans-serif" }
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(240, 165, 0, 0.08)' }}>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-[var(--mk-gold)]"
                style={{ color: 'var(--mk-muted)', fontFamily: "'Outfit', sans-serif" }}
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--mk-gold)' }}>account_circle</span>
                Profile
              </button>
            </div>
            <div className="px-6 py-4">
              <button
                className="mukwano-cursor-hover rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:border-[var(--mk-gold)] hover:text-[var(--mk-gold)]"
                style={{
                  background: 'transparent',
                  borderColor: 'rgba(240, 165, 0, 0.35)',
                  color: 'var(--mk-white)',
                  fontFamily: "'Inter', sans-serif"
                }}
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/login', { replace: true })
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* DEMO MODE banner */}
      {config?.demoMode && (
        <div
          className="text-center text-xs py-1.5"
          style={{ background: 'rgba(240, 165, 0, 0.1)', color: 'var(--mk-gold)' }}
        >
          DEMO MODE &mdash; No real funds are processed
        </div>
      )}

      <VerifyEmailBanner />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 pb-20 flex-1">
        <Outlet />
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
