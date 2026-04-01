import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'

const mukwanoLogo = '/assets/mukwano-logo.png'

const navInactive = { color: 'var(--mk-muted)' }
const navActive = { color: 'var(--mk-gold)', borderColor: 'var(--mk-gold)' }

export function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ demoMode: boolean; escrowLabel: string }>('/config'),
    staleTime: Infinity
  })

  return (
    <div className="min-h-screen bg-transparent">
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
            <button
              className="mukwano-cursor-hover rounded-full p-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--mk-muted)' }}
              aria-label="Notifications"
              type="button"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                notifications
              </span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="mukwano-cursor-hover rounded-full p-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--mk-gold)' }}
              aria-label="Profile"
              type="button"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                account_circle
              </span>
            </button>
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
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 pb-20">
        <Outlet />
      </main>
    </div>
  )
}
