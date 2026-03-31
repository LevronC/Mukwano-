import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, authStorage } from '@/api/client'
import type { AuthResponse, User } from '@/api/types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (payload: { email: string; password: string; displayName: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrate = async () => {
      if (!authStorage.getAccess()) {
        setLoading(false)
        return
      }
      try {
        const me = await api.get<User>('/auth/me')
        setUser(me)
      } catch {
        authStorage.clear()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    void hydrate()
  }, [])

  const refreshUser = async () => {
    const me = await api.get<User>('/auth/me')
    setUser(me)
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true })
    authStorage.setTokens(res.accessToken, res.refreshToken)
    setUser(res.user)
  }

  const signup = async (payload: { email: string; password: string; displayName: string }) => {
    const res = await api.post<AuthResponse>('/auth/signup', payload, { skipAuth: true })
    authStorage.setTokens(res.accessToken, res.refreshToken)
    setUser(res.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: authStorage.getRefresh() })
    } catch {
      // no-op; logout must still clear local auth state
    }
    authStorage.clear()
    setUser(null)
  }

  const value = useMemo(() => ({ user, loading, login, signup, logout, refreshUser }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
