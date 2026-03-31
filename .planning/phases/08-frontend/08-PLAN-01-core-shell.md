---
phase: 08-frontend
plan: 01
type: execute
wave: 1
depends_on: [08-00]
files_modified:
  - packages/web/src/api/client.ts
  - packages/web/src/api/types.ts
  - packages/web/src/contexts/AuthContext.tsx
  - packages/web/src/hooks/useAuth.ts
  - packages/web/src/components/layout/AppLayout.tsx
  - packages/web/src/components/layout/AppLayout.test.tsx
  - packages/web/src/components/layout/NavBar.tsx
  - packages/web/src/components/auth/AuthGuard.tsx
  - packages/web/src/components/shared/ErrorPage.tsx
  - packages/web/src/components/shared/LoadingSpinner.tsx
  - packages/web/src/components/shared/StatusBadge.tsx
  - packages/web/src/router/index.tsx
  - packages/web/src/main.tsx
autonomous: true
requirements: [FE-01, FE-11, FE-12]

must_haves:
  truths:
    - "API calls go through api/client.ts — no direct fetch in components"
    - "401 response triggers one refresh attempt then redirects to /login on second failure"
    - "AuthContext provides user state and login/logout to the whole tree"
    - "Protected routes redirect unauthenticated users to /login"
    - "DEMO_MODE amber banner renders on every authenticated screen when demoMode=true"
    - "AppLayout fetches GET /api/v1/config once with staleTime: Infinity"
  artifacts:
    - path: "packages/web/src/api/client.ts"
      provides: "Typed fetch wrapper with 401 interceptor and token refresh"
      exports: ["api"]
    - path: "packages/web/src/api/types.ts"
      provides: "Shared API response type definitions"
      exports: ["ApiError", "User", "Circle", "Contribution", "Proposal", "Project"]
    - path: "packages/web/src/contexts/AuthContext.tsx"
      provides: "User session state, login, logout"
      exports: ["AuthProvider", "AuthContext"]
    - path: "packages/web/src/hooks/useAuth.ts"
      provides: "useAuth() consumer hook"
      exports: ["useAuth"]
    - path: "packages/web/src/router/index.tsx"
      provides: "All 19 routes with AuthGuard wrapping protected routes"
      exports: ["router"]
    - path: "packages/web/src/components/layout/AppLayout.tsx"
      provides: "TopNav + DemoModeBanner + page container"
  key_links:
    - from: "packages/web/src/api/client.ts"
      to: "localStorage"
      via: "access_token read on every request"
      pattern: "localStorage.getItem.*access_token"
    - from: "packages/web/src/api/client.ts"
      to: "/api/v1/auth/refresh"
      via: "tryRefresh() called on 401"
      pattern: "tryRefresh"
    - from: "packages/web/src/components/layout/AppLayout.tsx"
      to: "/api/v1/config"
      via: "useQuery staleTime: Infinity"
      pattern: "queryKey.*config"
---

<objective>
Build the application shell: typed API client with 401 interceptor, AuthContext, all 19 routes with guards, and AppLayout with NavBar + DEMO_MODE banner wired to GET /api/v1/config.

Purpose: Every subsequent wave requires this infrastructure. The api client, auth context, and router are the contracts all screens build against.
Output: A running SPA skeleton with routing, auth state, and the persistent demo mode banner.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-frontend/08-CONTEXT.md
@.planning/phases/08-frontend/08-RESEARCH.md
@.planning/phases/08-frontend/08-VALIDATION.md
</context>

<interfaces>
<!-- API contracts the executor needs. Extracted from API source. -->

From packages/api/src/routes/auth/login.ts — POST /api/v1/auth/login:
  Request:  { email: string, password: string }
  Response: { accessToken: string, refreshToken: string, ...user fields }

From packages/api/src/routes/auth/refresh.ts — POST /api/v1/auth/refresh:
  Request:  { refreshToken: string }   ← field is EXACTLY "refreshToken"
  Response: { accessToken: string, refreshToken: string }

From packages/api/src/routes/config.ts — GET /api/v1/config:
  Response: { demoMode: boolean, currency: string, escrowLabel: string }

From packages/api/src/app.ts — error shape:
  { error: { code: string, message: string, field: string | null, status: number } }

JWT user payload (from fastify.d.ts):
  { id: string, email: string, isGlobalAdmin: boolean }

GET /api/v1/auth/me returns (expected):
  { id: string, email: string, displayName: string, isGlobalAdmin: boolean, country?: string, sector?: string }
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Build api/client.ts (typed fetch wrapper with 401 interceptor) and api/types.ts</name>
  <files>
    packages/web/src/api/client.ts
    packages/web/src/api/types.ts
  </files>
  <read_first>
    packages/web/src/api/client.ts
    .planning/phases/08-frontend/08-RESEARCH.md
  </read_first>
  <action>
    Create packages/web/src/api/types.ts with all shared response types:
    ```typescript
    export interface ApiError {
      error: { code: string; message: string; field: string | null; status: number }
    }

    export interface User {
      id: string; email: string; displayName: string
      isGlobalAdmin: boolean; country?: string; sector?: string
    }

    export interface AppConfig {
      demoMode: boolean; currency: string; escrowLabel: string
    }

    export interface Circle {
      id: string; name: string; description?: string
      goalAmount: number; currency: string; status: string
      createdBy: string; createdAt: string; updatedAt: string
      governanceConfig?: GovernanceConfig
    }

    export interface GovernanceConfig {
      id: string; circleId: string
      minContribution: number; votingModel: string
      quorumPercent: number; approvalPercent: number
      proposalDurationDays: number
      whoCanPropose: string; requireProof: boolean
    }

    export interface CircleMembership {
      circleId: string; userId: string; role: MembershipRole
      joinedAt: string
      user?: { id: string; email: string; displayName: string; isGlobalAdmin: boolean }
    }

    export type MembershipRole = 'member' | 'contributor' | 'creator' | 'admin'

    export interface Contribution {
      id: string; circleId: string; userId: string
      amount: number; note?: string; status: 'pending' | 'verified' | 'rejected'
      currency: string; submittedAt: string; verifiedAt?: string
      verifiedBy?: string; rejectionReason?: string
      user?: { id: string; email: string; displayName: string }
      proofDocuments?: ProofDocument[]
    }

    export interface ProofDocument {
      id: string; contributionId: string; fileKey: string
      fileName: string; mimeType: string; sizeBytes: number
      uploadedBy: string; createdAt: string
    }

    export interface Treasury {
      circleId: string; balance: number; currency: string; balanceLabel: string
    }

    export interface LedgerEntry {
      id: string; circleId: string; userId: string
      amount: number; runningBalance: number
      currency: string; type: string
      recordedAt: string; metadata?: Record<string, unknown>
    }

    export interface LedgerPage {
      page: number; pageSize: number; total: number; items: LedgerEntry[]
    }

    export interface Proposal {
      id: string; circleId: string; createdBy: string
      title: string; description: string; requestedAmount: number
      currency: string; status: string; votingDeadline: string
      votes?: { yes: number; no: number; abstain: number; total: number }
      myVote?: string | null
      createdAt: string
    }

    export interface Vote {
      id: string; proposalId: string; userId: string
      vote: 'yes' | 'no' | 'abstain'; createdAt: string
    }

    export interface Project {
      id: string; circleId: string; proposalId: string
      createdBy: string; title: string; description: string
      budget: number; currency: string
      status: 'approved' | 'executing' | 'complete' | 'cancelled'
      createdAt: string; completedAt?: string
      updates?: ProjectUpdate[]
    }

    export interface ProjectUpdate {
      id: string; projectId: string; postedBy: string
      content: string; percentComplete: number; createdAt: string
    }

    export interface Portfolio {
      id: string; circleId: string; circleName?: string
      amount: number; status: string; currency: string
      submittedAt: string
    }

    export interface PortfolioSummary {
      totalContributed: number; totalVerified: number; totalInProjects: number
    }

    export interface DashboardData {
      circles: Circle[]; pendingContributions: number
      unvotedProposals: number; recentActivity: ActivityItem[]
    }

    export interface ActivityItem {
      id: string; type: string; description: string; createdAt: string
    }
    ```

    Create packages/web/src/api/client.ts:
    ```typescript
    import type { ApiError } from './types'

    const BASE = '/api/v1'

    // IMPORTANT: tryRefresh must use raw fetch — NOT the request() function.
    // Using request() for refresh would cause infinite loop on 401.
    async function tryRefresh(): Promise<boolean> {
      const rt = localStorage.getItem('refresh_token')
      if (!rt) return false
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),  // field is "refreshToken" (camelCase)
      })
      if (!res.ok) return false
      const data = await res.json()
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      return true
    }

    async function request<T>(
      path: string,
      init: RequestInit = {},
      retried = false
    ): Promise<T> {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers ?? {}),
        },
      })

      if (res.status === 401 && !retried) {
        const refreshed = await tryRefresh()
        if (refreshed) return request<T>(path, init, true)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        throw new Error('Session expired')
      }

      if (!res.ok) {
        const body: ApiError = await res.json()
        throw body
      }

      // 204 No Content
      if (res.status === 204) return undefined as T
      return res.json() as Promise<T>
    }

    export const api = {
      get: <T>(path: string) => request<T>(path, { method: 'GET' }),
      post: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
      patch: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
      delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    }
    ```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/api/types.ts exists and exports ApiError, User, Circle, Contribution, Proposal, Project, Treasury
    - packages/web/src/api/client.ts exists and contains `tryRefresh` function
    - packages/web/src/api/client.ts contains `localStorage.getItem('access_token')`
    - packages/web/src/api/client.ts contains `window.location.href = '/login'` (redirect on refresh failure)
    - packages/web/src/api/client.ts calls raw `fetch` in tryRefresh (not the api.* helpers)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <done>Typed API client with 401 interceptor exists; all API response types are defined</done>
</task>

<task type="auto">
  <name>Task 2: Build AuthContext, AuthGuard, AppLayout (with DemoModeBanner), NavBar, shared components, and wire all 19 routes in main.tsx</name>
  <files>
    packages/web/src/contexts/AuthContext.tsx
    packages/web/src/hooks/useAuth.ts
    packages/web/src/components/auth/AuthGuard.tsx
    packages/web/src/components/layout/AppLayout.tsx
    packages/web/src/components/layout/NavBar.tsx
    packages/web/src/components/shared/ErrorPage.tsx
    packages/web/src/components/shared/LoadingSpinner.tsx
    packages/web/src/components/shared/StatusBadge.tsx
    packages/web/src/router/index.tsx
    packages/web/src/main.tsx
  </files>
  <read_first>
    packages/web/src/contexts/AuthContext.tsx
    packages/web/src/router/index.tsx
    packages/web/src/main.tsx
    packages/web/src/api/client.ts
    packages/web/src/api/types.ts
    .planning/phases/08-frontend/08-CONTEXT.md
  </read_first>
  <action>
    Create packages/web/src/contexts/AuthContext.tsx:
    ```tsx
    import React, { createContext, useState, useEffect, useCallback } from 'react'
    import { api } from '../api/client'
    import type { User } from '../api/types'

    interface AuthState {
      user: User | null
      isLoading: boolean
      login: (email: string, password: string) => Promise<void>
      logout: () => Promise<void>
    }

    export const AuthContext = createContext<AuthState>({} as AuthState)

    export function AuthProvider({ children }: { children: React.ReactNode }) {
      const [user, setUser] = useState<User | null>(null)
      const [isLoading, setIsLoading] = useState(true)

      // Hydrate from localStorage on page load
      useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (!token) { setIsLoading(false); return }
        api.get<User>('/auth/me')
          .then(setUser)
          .catch(() => {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          })
          .finally(() => setIsLoading(false))
      }, [])

      const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<{ accessToken: string; refreshToken: string } & User>(
          '/auth/login', { email, password }
        )
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        setUser({ id: data.id, email: data.email, displayName: data.displayName, isGlobalAdmin: data.isGlobalAdmin })
      }, [])

      const logout = useCallback(async () => {
        try { await api.post('/auth/logout') } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      }, [])

      return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
          {children}
        </AuthContext.Provider>
      )
    }
    ```

    Create packages/web/src/hooks/useAuth.ts:
    ```typescript
    import { useContext } from 'react'
    import { AuthContext } from '../contexts/AuthContext'
    export function useAuth() {
      return useContext(AuthContext)
    }
    ```

    Create packages/web/src/components/auth/AuthGuard.tsx:
    ```tsx
    import { Navigate, Outlet } from 'react-router-dom'
    import { useAuth } from '../../hooks/useAuth'
    import { LoadingSpinner } from '../shared/LoadingSpinner'

    export function AuthGuard() {
      const { user, isLoading } = useAuth()
      if (isLoading) return <LoadingSpinner />
      if (!user) return <Navigate to="/login" replace />
      return <Outlet />
    }
    ```

    Create packages/web/src/components/shared/LoadingSpinner.tsx:
    ```tsx
    import { Loader2 } from 'lucide-react'
    export function LoadingSpinner() {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }
    ```

    Create packages/web/src/components/shared/ErrorPage.tsx:
    ```tsx
    import { Button } from '../ui/button'
    import { useNavigate } from 'react-router-dom'
    interface Props { code?: number; message?: string }
    export function ErrorPage({ code = 404, message = 'Page not found' }: Props) {
      const navigate = useNavigate()
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-6xl font-bold text-primary">{code}</h1>
          <p className="text-lg text-muted-foreground">{message}</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      )
    }
    ```

    Create packages/web/src/components/shared/StatusBadge.tsx:
    ```tsx
    import { Badge } from '../ui/badge'
    const STATUS_COLORS: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      open: 'bg-blue-100 text-blue-800',
      closed_passed: 'bg-green-100 text-green-800',
      closed_failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      executing: 'bg-amber-100 text-amber-800',
      complete: 'bg-green-100 text-green-800',
    }
    export function StatusBadge({ status }: { status: string }) {
      const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'
      return <Badge className={cls}>{status.replace('_', ' ')}</Badge>
    }
    ```

    Create packages/web/src/components/layout/NavBar.tsx:
    ```tsx
    import { Link } from 'react-router-dom'
    import { useAuth } from '../../hooks/useAuth'
    import { Button } from '../ui/button'
    import { useNavigate } from 'react-router-dom'

    export function NavBar() {
      const { user, logout } = useAuth()
      const navigate = useNavigate()
      const handleLogout = async () => { await logout(); navigate('/login') }
      return (
        <nav className="border-b bg-white px-6 py-3 flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-xl font-bold text-primary">Mukwano</Link>
            <Link to="/circles" className="text-sm text-muted-foreground hover:text-primary">Circles</Link>
            <Link to="/portfolio" className="text-sm text-muted-foreground hover:text-primary">Portfolio</Link>
            {user?.isGlobalAdmin && (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary">Admin</Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="text-sm text-muted-foreground hover:text-primary">
              {user?.displayName ?? user?.email}
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </nav>
      )
    }
    ```

    Create packages/web/src/components/layout/AppLayout.tsx:
    ```tsx
    import { Outlet } from 'react-router-dom'
    import { useQuery } from '@tanstack/react-query'
    import { NavBar } from './NavBar'
    import { api } from '../../api/client'
    import type { AppConfig } from '../../api/types'
    import { Toaster } from '../ui/sonner'

    export function AppLayout() {
      const { data: config } = useQuery<AppConfig>({
        queryKey: ['config'],
        queryFn: () => api.get('/config'),
        staleTime: Infinity,
      })
      return (
        <div className="min-h-screen bg-gray-50">
          {config?.demoMode && (
            <div className="bg-amber-400 text-amber-900 px-4 py-2 text-center text-sm font-medium">
              Demo Mode — No real funds. Governance is fully enforced.
            </div>
          )}
          <NavBar />
          <main className="max-w-[1200px] mx-auto px-4 py-6">
            <Outlet />
          </main>
          <Toaster position="top-right" />
        </div>
      )
    }
    ```

    Create packages/web/src/router/index.tsx with all 19 routes.
    Use lazy imports for page components (they do not exist yet — create placeholder components inline or use React.lazy with fallback):
    ```tsx
    import { createBrowserRouter, Navigate } from 'react-router-dom'
    import { AuthGuard } from '../components/auth/AuthGuard'
    import { AppLayout } from '../components/layout/AppLayout'
    import { ErrorPage } from '../components/shared/ErrorPage'
    import { LoadingSpinner } from '../components/shared/LoadingSpinner'
    import React, { Suspense } from 'react'

    // Lazy-load pages — files don't exist yet; create empty stubs
    const lazy = (factory: () => Promise<{ default: React.ComponentType }>) =>
      React.lazy(factory)

    // Create placeholder stubs for pages that don't exist yet
    // Each stub renders the page name so we know routing works
    const stub = (name: string) => () => <div className="p-8"><h2 className="text-xl font-semibold">{name}</h2></div>

    export const router = createBrowserRouter([
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/login', element: React.createElement(stub('Login')) },
      { path: '/signup', element: React.createElement(stub('Signup')) },
      {
        element: <AuthGuard />,
        children: [{
          element: <AppLayout />,
          children: [
            { path: '/dashboard', element: React.createElement(stub('Dashboard')) },
            { path: '/circles', element: React.createElement(stub('CirclesList')) },
            { path: '/circles/new', element: React.createElement(stub('NewCircle')) },
            { path: '/circles/:id', element: React.createElement(stub('CircleDetail')) },
            { path: '/circles/:id/contributions/new', element: React.createElement(stub('NewContribution')) },
            { path: '/circles/:id/proposals/new', element: React.createElement(stub('NewProposal')) },
            { path: '/circles/:id/proposals/:pid', element: React.createElement(stub('ProposalDetail')) },
            { path: '/circles/:id/projects/:projId', element: React.createElement(stub('ProjectDetail')) },
            { path: '/portfolio', element: React.createElement(stub('Portfolio')) },
            { path: '/admin', element: React.createElement(stub('Admin')) },
            { path: '/profile', element: React.createElement(stub('Profile')) },
          ]
        }]
      },
      { path: '*', element: <ErrorPage code={404} message="Page not found" /> }
    ])
    ```

    Update packages/web/src/main.tsx to wire QueryClient, AuthProvider, RouterProvider:
    ```tsx
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import { RouterProvider } from 'react-router-dom'
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
    import { AuthProvider } from './contexts/AuthContext'
    import { router } from './router/index'
    import './index.css'

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </React.StrictMode>
    )
    ```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/api/client.ts contains `export const api` with `.get`, `.post`, `.patch`, `.delete` methods
    - packages/web/src/contexts/AuthContext.tsx exports `AuthProvider` and `AuthContext`
    - packages/web/src/hooks/useAuth.ts exports `useAuth`
    - packages/web/src/components/auth/AuthGuard.tsx exports `AuthGuard` and uses `Navigate` to `/login`
    - packages/web/src/components/layout/AppLayout.tsx contains `config?.demoMode` check for amber banner
    - packages/web/src/components/layout/AppLayout.tsx contains `queryKey: ['config']` and `staleTime: Infinity`
    - packages/web/src/router/index.tsx exports `router` and contains all paths: `/login`, `/signup`, `/dashboard`, `/circles`, `/portfolio`, `/admin`, `/profile`
    - packages/web/src/main.tsx contains `QueryClientProvider`, `AuthProvider`, `RouterProvider`
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <done>Application shell is complete: API client, auth context, all routes with guards, AppLayout with DEMO_MODE banner, NavBar with admin link gating</done>
</task>

<task type="auto">
  <name>Task 3: Write AppLayout.test.tsx for DEMO_MODE banner behavior</name>
  <files>
    packages/web/src/components/layout/AppLayout.test.tsx
  </files>
  <read_first>
    packages/web/src/components/layout/AppLayout.tsx
    packages/web/src/test/server.ts
    packages/web/src/test/handlers.ts
  </read_first>
  <action>
    Create packages/web/src/components/layout/AppLayout.test.tsx.

    Use renderWithProviders from src/test/test-utils.tsx and MSW server.use() to override the
    GET /api/v1/config handler per test.

    Test cases required:

    1. "shows amber Demo Mode banner when demoMode is true"
       Override MSW: GET /api/v1/config → { demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow' }
       Render AppLayout (wrapped with QueryClientProvider, MemoryRouter).
       Assert: banner element is visible AND contains the text "Demo Mode".

    2. "does not render banner when demoMode is false"
       Override MSW: GET /api/v1/config → { demoMode: false, currency: 'USD', escrowLabel: '' }
       Render AppLayout.
       Assert: no element containing "Demo Mode" is in the document.

    3. "banner is non-dismissible — no dismiss or close button"
       Override MSW: GET /api/v1/config → { demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow' }
       Render AppLayout.
       Assert: queryByRole('button', { name: /dismiss|close/i }) returns null.

    Implementation notes:
    - Import { server } from '../../test/server' and use server.use(http.get(...)) in each test.
    - AppLayout renders <Outlet /> which requires a router context. Wrap with MemoryRouter and provide
      a simple child element, OR use a createMemoryRouter with a route that renders AppLayout directly.
    - The banner div does NOT have a role="banner" — query by text content: screen.getByText(/Demo Mode/i)
      or use screen.queryByText(/Demo Mode/i) for the negative assertion.

    Example structure:
    ```typescript
    import { render, screen, waitFor } from '@testing-library/react'
    import { http, HttpResponse } from 'msw'
    import { server } from '../../test/server'
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
    import { createMemoryRouter, RouterProvider } from 'react-router-dom'
    import { AppLayout } from './AppLayout'

    function renderAppLayout() {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const router = createMemoryRouter([{ path: '/', element: <AppLayout /> }])
      return render(
        <QueryClientProvider client={qc}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )
    }

    describe('AppLayout demo mode banner', () => {
      it('shows amber Demo Mode banner when demoMode is true', async () => {
        server.use(
          http.get('/api/v1/config', () =>
            HttpResponse.json({ demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow' })
          )
        )
        renderAppLayout()
        await waitFor(() => {
          expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument()
        })
      })

      it('does not render banner when demoMode is false', async () => {
        server.use(
          http.get('/api/v1/config', () =>
            HttpResponse.json({ demoMode: false, currency: 'USD', escrowLabel: '' })
          )
        )
        renderAppLayout()
        await waitFor(() => {
          // Config has loaded — check no banner
          expect(screen.queryByText(/Demo Mode/i)).not.toBeInTheDocument()
        })
      })

      it('banner is non-dismissible — no dismiss or close button present', async () => {
        server.use(
          http.get('/api/v1/config', () =>
            HttpResponse.json({ demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow' })
          )
        )
        renderAppLayout()
        await waitFor(() => {
          expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument()
        })
        expect(screen.queryByRole('button', { name: /dismiss|close/i })).toBeNull()
      })
    })
    ```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/components/layout/AppLayout.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/components/layout/AppLayout.test.tsx exists
    - File contains 3 test cases covering: demoMode=true shows banner, demoMode=false no banner, no dismiss button
    - `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/components/layout/AppLayout.test.tsx` exits 0
  </acceptance_criteria>
  <done>AppLayout banner tests pass: demoMode=true shows "Demo Mode" text, demoMode=false hides it, no dismiss/close button exists</done>
</task>

</tasks>

<verification>
- `npm run build --workspace=packages/web` exits 0
- grep 'demoMode' packages/web/src/components/layout/AppLayout.tsx returns match
- grep 'staleTime: Infinity' packages/web/src/components/layout/AppLayout.tsx returns match
- grep 'tryRefresh' packages/web/src/api/client.ts returns match
- grep 'Navigate to="/login"' packages/web/src/components/auth/AuthGuard.tsx returns match
- `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/components/layout/AppLayout.test.tsx` exits 0
</verification>

<success_criteria>
- Application shell builds without errors
- Typed API client with 401-refresh interceptor is in place
- AuthContext provides login/logout/user state to the whole tree
- AppLayout fetches config once and shows persistent amber banner when demoMode=true
- All 19 routes are declared; protected routes require auth
- AppLayout.test.tsx passes all 3 banner behavior tests
</success_criteria>

<output>
After completion, create `.planning/phases/08-frontend/08-01-SUMMARY.md`
</output>
