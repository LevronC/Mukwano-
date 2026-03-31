import type { ApiError } from './types'

const BASE = '/api/v1'
const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

type ReqInit = RequestInit & { skipAuth?: boolean }

function readStorage(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(key)
    }
  } catch {
    // no-op
  }
  return null
}

function writeStorage(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value)
    }
  } catch {
    // no-op
  }
}

function removeStorage(key: string) {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key)
    }
  } catch {
    // no-op
  }
}

async function tryRefresh(): Promise<boolean> {
  const rt = readStorage(REFRESH_KEY)
  if (!rt) return false
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt })
  })
  if (!res.ok) return false
  const data = await res.json()
  writeStorage(ACCESS_KEY, data.accessToken)
  writeStorage(REFRESH_KEY, data.refreshToken)
  return true
}

async function request<T>(path: string, init: ReqInit = {}, retried = false): Promise<T> {
  const token = readStorage(ACCESS_KEY)
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) || {}) }
  if (!headers['Content-Type'] && !(init.body instanceof FormData) && init.method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }
  if (token && !init.skipAuth) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 401 && !retried && path !== '/auth/refresh' && !init.skipAuth) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, init, true)
    removeStorage(ACCESS_KEY)
    removeStorage(REFRESH_KEY)
    window.location.href = '/login'
  }
  if (!res.ok) {
    const fallback: ApiError = {
      error: { code: 'REQUEST_FAILED', message: 'Request failed', field: null, status: res.status }
    }
    throw ((await res.json().catch(() => fallback)) as ApiError)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: ReqInit) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...init }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}

export const authStorage = {
  getAccess: () => readStorage(ACCESS_KEY),
  getRefresh: () => readStorage(REFRESH_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    writeStorage(ACCESS_KEY, accessToken)
    writeStorage(REFRESH_KEY, refreshToken)
  },
  clear: () => {
    removeStorage(ACCESS_KEY)
    removeStorage(REFRESH_KEY)
  }
}
