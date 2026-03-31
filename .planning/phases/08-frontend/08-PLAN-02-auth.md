---
phase: 08-frontend
plan: 02
type: execute
wave: 2
depends_on: [08-01]
files_modified:
  - packages/web/src/pages/auth/LoginPage.tsx
  - packages/web/src/pages/auth/SignupPage.tsx
  - packages/web/src/pages/ProfilePage.tsx
  - packages/web/src/router/index.tsx
  - packages/web/src/pages/auth/LoginPage.test.tsx
  - packages/web/src/pages/auth/SignupPage.test.tsx
  - packages/web/src/pages/ProfilePage.test.tsx
  - packages/web/src/api/client.test.ts
autonomous: true
requirements: [FE-01]

must_haves:
  truths:
    - "Login form posts email + password to POST /api/v1/auth/login; stores tokens in localStorage"
    - "Signup form posts email + password + displayName (required) to POST /api/v1/auth/signup"
    - "Successful login redirects to /dashboard"
    - "API error messages display as inline form errors (field-level) and toasts"
    - "Profile page loads GET /auth/me and allows PATCH /auth/me to update displayName"
    - "401 interceptor retries once with refresh then redirects — verified by test"
  artifacts:
    - path: "packages/web/src/pages/auth/LoginPage.tsx"
      provides: "Login form with RHF + Zod"
    - path: "packages/web/src/pages/auth/SignupPage.tsx"
      provides: "Signup form with displayName field"
    - path: "packages/web/src/pages/ProfilePage.tsx"
      provides: "Profile view + update form"
    - path: "packages/web/src/api/client.test.ts"
      provides: "401 interceptor unit tests"
  key_links:
    - from: "packages/web/src/pages/auth/SignupPage.tsx"
      to: "POST /api/v1/auth/signup"
      via: "api.post('/auth/signup', { email, password, displayName })"
      pattern: "displayName"
    - from: "packages/web/src/pages/auth/LoginPage.tsx"
      to: "AuthContext.login()"
      via: "useAuth().login"
      pattern: "login.*email.*password"
---

<objective>
Implement auth screens (Login, Signup, Profile) with React Hook Form + Zod validation, wire them into the router replacing placeholders, and write unit tests including the 401 interceptor test.

Purpose: Users must be able to authenticate before accessing any screen. These are the entry points for the entire app.
Output: Working Login/Signup/Profile pages with tests.
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
<!-- Key contracts from API source and Wave 1 files -->

POST /api/v1/auth/signup (from packages/api/src/routes/auth/signup.ts):
  Request:  { email: string, password: string, displayName: string }  ← ALL THREE REQUIRED
  Response: 201 { id, email, displayName, accessToken, refreshToken }

POST /api/v1/auth/login (from packages/api/src/routes/auth/login.ts):
  Request:  { email: string, password: string }
  Response: 200 { id, email, displayName, isGlobalAdmin, accessToken, refreshToken }

GET /api/v1/auth/me:
  Response: { id, email, displayName, isGlobalAdmin, country?, sector? }

PATCH /api/v1/auth/me:
  Request:  { displayName?: string, country?: string, sector?: string }
  Response: updated user object

API Error shape (from packages/api/src/app.ts):
  { error: { code: string, message: string, field: string | null, status: number } }

AuthContext.login() signature (from Wave 1 packages/web/src/contexts/AuthContext.tsx):
  login(email: string, password: string): Promise<void>
  — stores tokens in localStorage, sets user state

Zod schemas to use:
  Login:  z.object({ email: z.string().email(), password: z.string().min(1) })
  Signup: z.object({ email: z.string().email(), password: z.string().min(8).max(128), displayName: z.string().min(1).max(100) })
  Profile: z.object({ displayName: z.string().min(1).max(100), country: z.string().optional(), sector: z.string().optional() })

shadcn/ui components (from Wave 0 packages/web/src/components/ui/):
  Button, Input, Label, Card, CardHeader, CardContent, CardTitle, Form, FormField, FormItem, FormLabel, FormControl, FormMessage
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement LoginPage, SignupPage, ProfilePage and update router</name>
  <files>
    packages/web/src/pages/auth/LoginPage.tsx
    packages/web/src/pages/auth/SignupPage.tsx
    packages/web/src/pages/ProfilePage.tsx
    packages/web/src/router/index.tsx
  </files>
  <read_first>
    packages/web/src/contexts/AuthContext.tsx
    packages/web/src/api/client.ts
    packages/web/src/api/types.ts
    packages/web/src/router/index.tsx
    packages/web/src/components/ui/button.tsx
    packages/web/src/components/ui/input.tsx
    packages/web/src/components/ui/card.tsx
  </read_first>
  <behavior>
    LoginPage:
    - Renders email and password fields
    - On submit: calls useAuth().login(email, password)
    - On success: navigate('/dashboard')
    - On error: displays error.error.message as toast via sonner; field-level error if error.error.field matches

    SignupPage:
    - Renders email, password, AND displayName fields (displayName is REQUIRED — API returns 422 without it)
    - On submit: api.post('/auth/signup', { email, password, displayName })
    - On success: stores tokens from response, calls api.get('/auth/me') to hydrate AuthContext, then navigate('/dashboard')
    - On error: toast with error.error.message

    ProfilePage:
    - Loads GET /api/v1/auth/me via useQuery
    - Shows displayName, email, country, sector in a form
    - On submit: PATCH /api/v1/auth/me with changed fields
    - Toast on success/error
  </behavior>
  <action>
    Create packages/web/src/pages/auth/LoginPage.tsx:
    Use shadcn/ui Form + FormField + FormItem + FormLabel + FormControl + FormMessage pattern.
    Use useForm({ resolver: zodResolver(loginSchema) }).
    On form submit: call useAuth().login(email, password). Catch ApiError and toast error.error.message.
    Successful login: navigate('/dashboard').
    Include a link to /signup at the bottom.

    Create packages/web/src/pages/auth/SignupPage.tsx:
    Three fields: email, password, displayName.
    Zod schema: displayName: z.string().min(1, 'Display name is required').max(100).
    On submit: api.post('/auth/signup', { email, password, displayName }).
    On success: store accessToken + refreshToken in localStorage, then navigate('/login') with a success toast.
    On error: toast error.error.message; if error.error.field, show inline below that field.
    Include a link to /login at the bottom.

    Create packages/web/src/pages/ProfilePage.tsx:
    Query: useQuery({ queryKey: ['me'], queryFn: () => api.get('/auth/me') })
    Form pre-populated with loaded values.
    useMutation for PATCH /api/v1/auth/me.
    On success: invalidateQueries(['me']), toast 'Profile updated'.

    Update packages/web/src/router/index.tsx:
    Replace the stub components for /login, /signup, /profile with real imports:
    - import { LoginPage } from '../pages/auth/LoginPage'
    - import { SignupPage } from '../pages/auth/SignupPage'
    - import { ProfilePage } from '../pages/ProfilePage'
    Replace stub('Login') with <LoginPage />, etc.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/pages/auth/SignupPage.tsx contains `displayName` as a form field name
    - packages/web/src/pages/auth/SignupPage.tsx contains `z.string().min(1` for displayName validation
    - packages/web/src/pages/auth/LoginPage.tsx uses `useAuth()` and calls `.login(`
    - packages/web/src/pages/ProfilePage.tsx contains `queryKey: ['me']`
    - packages/web/src/router/index.tsx imports `LoginPage`, `SignupPage`, `ProfilePage` (no stub for these 3 routes)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <done>Login, Signup, and Profile pages implemented with RHF+Zod; displayName required in signup; router updated</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write unit tests for auth pages and 401 interceptor</name>
  <files>
    packages/web/src/pages/auth/LoginPage.test.tsx
    packages/web/src/pages/auth/SignupPage.test.tsx
    packages/web/src/pages/ProfilePage.test.tsx
    packages/web/src/api/client.test.ts
  </files>
  <read_first>
    packages/web/src/test/handlers.ts
    packages/web/src/test/server.ts
    packages/web/src/test/setup.ts
    packages/web/src/pages/auth/LoginPage.tsx
    packages/web/src/pages/auth/SignupPage.tsx
    packages/web/src/api/client.ts
  </read_first>
  <behavior>
    LoginPage.test.tsx:
    - Renders email input
    - Renders password input
    - On submit with valid credentials: calls POST /api/v1/auth/login (MSW intercepts)

    SignupPage.test.tsx:
    - Renders email, password, AND displayName fields
    - displayName field is present and required (test that submitting without it shows validation error)
    - On submit with all fields: calls POST /api/v1/auth/signup with all three fields

    client.test.ts:
    - On 401 response: calls POST /api/v1/auth/refresh with { refreshToken } from localStorage
    - After successful refresh: retries original request with new access token
    - If refresh also fails: redirects to /login (checks window.location.href)

    ProfilePage.test.tsx:
    - Renders user displayName from GET /api/v1/auth/me
    - Shows a form with displayName input
  </behavior>
  <action>
    Create packages/web/src/api/client.test.ts:
    Use MSW to override handlers in specific tests. Test the 401-then-refresh flow:
    ```typescript
    import { server } from '../test/server'
    import { http, HttpResponse } from 'msw'
    import { api } from './client'
    import { describe, it, expect, beforeEach } from 'vitest'

    describe('api client 401 interceptor', () => {
      beforeEach(() => {
        localStorage.setItem('access_token', 'old-token')
        localStorage.setItem('refresh_token', 'valid-refresh-token')
      })

      it('calls refresh on 401 and retries original request', async () => {
        let callCount = 0
        server.use(
          http.get('/api/v1/circles', () => {
            callCount++
            if (callCount === 1) return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'expired', field: null, status: 401 } }, { status: 401 })
            return HttpResponse.json([])
          }),
          http.post('/api/v1/auth/refresh', () =>
            HttpResponse.json({ accessToken: 'new-token', refreshToken: 'new-refresh' })
          )
        )
        await api.get('/circles')
        expect(callCount).toBe(2)
        expect(localStorage.getItem('access_token')).toBe('new-token')
      })
    })
    ```

    Create packages/web/src/pages/auth/SignupPage.test.tsx:
    ```typescript
    import { render, screen } from '@testing-library/react'
    import userEvent from '@testing-library/user-event'
    import { SignupPage } from './SignupPage'
    // wrap with minimal providers (MemoryRouter, QueryClientProvider)

    it('renders displayName field', () => {
      // render SignupPage
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    })

    it('shows validation error when displayName is empty', async () => {
      // fill email and password but not displayName, submit
      // expect validation error message for displayName
    })
    ```

    Create packages/web/src/pages/auth/LoginPage.test.tsx with similar pattern.
    Create packages/web/src/pages/ProfilePage.test.tsx that renders and checks displayName is shown.

    Use a test helper wrapper:
    ```tsx
    // packages/web/src/test/test-utils.tsx
    import { render } from '@testing-library/react'
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
    import { MemoryRouter } from 'react-router-dom'
    import { AuthContext } from '../contexts/AuthContext'

    const mockUser = { id: '1', email: 'test@test.com', displayName: 'Test', isGlobalAdmin: false }
    const mockAuth = { user: mockUser, isLoading: false, login: vi.fn(), logout: vi.fn() }

    export function renderWithProviders(ui: React.ReactElement, { authenticated = false } = {}) {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      return render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authenticated ? mockAuth : { ...mockAuth, user: null }}>
            <MemoryRouter>{ui}</MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    }
    ```
    Save this helper to packages/web/src/test/test-utils.tsx.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/auth src/api/client.test.ts 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/pages/auth/LoginPage.test.tsx exists with at least 2 test cases
    - packages/web/src/pages/auth/SignupPage.test.tsx exists and tests that displayName field renders
    - packages/web/src/api/client.test.ts exists and contains a test for 401 refresh behavior
    - packages/web/src/test/test-utils.tsx exists and exports `renderWithProviders`
    - `npx vitest --run src/pages/auth src/api/client.test.ts` passes with 0 failures
  </acceptance_criteria>
  <done>Auth page tests and API client 401 interceptor test pass; displayName field verified by test</done>
</task>

</tasks>

<verification>
- `npm run build --workspace=packages/web` exits 0
- `grep -r 'displayName' packages/web/src/pages/auth/SignupPage.tsx` returns match
- `cd packages/web && npx vitest --run src/pages/auth src/api/client.test.ts` exits 0
- packages/web/src/pages/auth/SignupPage.tsx contains `z.string().min(1` for displayName
</verification>

<success_criteria>
- Login, Signup, Profile pages render and build without TypeScript errors
- Signup form has email + password + displayName (required field)
- Login uses AuthContext.login() — not a direct api.post call
- 401 interceptor test demonstrates refresh then retry behavior
- All auth tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/08-frontend/08-02-SUMMARY.md`
</output>
