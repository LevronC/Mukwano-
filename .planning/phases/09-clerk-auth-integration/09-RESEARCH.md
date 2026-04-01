# Phase 9: Clerk Auth Integration — Research

**Researched:** 2026-04-01
**Domain:** Clerk authentication SDK integration (Fastify backend + React frontend)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Auth UI Strategy**: Use embedded Clerk components (`<SignIn />`, `<SignUp />`) inside existing React pages — not hosted redirect to Clerk domain.
- **Social Logins**: Enable Google and GitHub in Clerk dashboard. Zero frontend code change needed — Clerk components surface these automatically once enabled.
- **Existing Users / Migration**: Start fresh — dev database, no user migration needed. `passwordHash` becomes nullable (null for all Clerk users).
- **Backend Token Verification**: Use `clerk.verifyToken(token, { secretKey })` — NOT `clerk.sessions.verifySession()`. Clerk JWTs are RS256-signed against JWKS endpoint. `verifyToken` handles that correctly.
- **Email Selection**: Use `clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === 'verified')?.emailAddress` — not `emailAddresses[0]`. If no primary verified email, return 401 with `UNVERIFIED_EMAIL`.
- **Environment Variables**: Backend needs only `CLERK_SECRET_KEY`. Frontend needs only `VITE_CLERK_PUBLISHABLE_KEY`. Do not add `CLERK_PUBLISHABLE_KEY` to the backend env schema.
- **TypeScript / Fastify Types**: Keep `req.user` typed via `packages/api/src/types/fastify.d.ts` as `{ id: string; email: string; isGlobalAdmin: boolean }`. No `(req as any).user` casts anywhere. Add `clerk: ClerkClient` to `FastifyInstance` declaration.
- **Migration Strategy**: Full replace (not bridge). Phases:
  1. Backend: add Clerk plugin + new authGuard + schema migration (clerkId, passwordHash nullable)
  2. Frontend: ClerkProvider + embedded components + client.ts rewrite
  3. Cleanup: remove @fastify/jwt, remove custom auth routes, drop RefreshToken model, remove passwordHash column, remove bcryptjs
- **Frontend Token Injection**: Replace `localStorage` token management in `client.ts` with Clerk's `getToken()`. No manual refresh loop. Remove `tryRefresh()`, `ACCESS_KEY`, `REFRESH_KEY` constants, and retry logic.

### Claude's Discretion
- Exact Clerk appearance/theme customization (colors, logo) — match existing app design system
- Whether to use Clerk's `<UserButton />` for profile menu
- Error message wording for `UNVERIFIED_EMAIL` 401 response
- Whether to keep `isGlobalAdmin` field sourced from DB (not Clerk metadata) — recommendation: keep in DB

### Deferred Ideas (OUT OF SCOPE)
- Clerk webhooks for user lifecycle events (delete, update)
- Clerk Organizations for circle-level membership management
- `<UserButton />` profile menu integration (nice-to-have after core auth works)
- Migrating existing production users from bcrypt to Clerk
- `isGlobalAdmin` sync to Clerk metadata
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLERK-01 | User can sign up via embedded `<SignUp />` (email/password, Google, GitHub) and land on dashboard | ClerkProvider + embedded component routing, signInUrl/signUpUrl props |
| CLERK-02 | Backend verifies Clerk JWTs using `clerk.verifyToken()` (RS256/JWKS); tampered/expired returns 401 | `verifyToken()` API confirmed — see Standard Stack section |
| CLERK-03 | First-time Clerk login auto-creates User row in DB from primary verified email; subsequent logins reuse row | Auto-provision pattern in authGuard — see Architecture Patterns |
| CLERK-04 | `req.user` populated via typed FastifyRequest decoration (no `as any`) with `{ id, email, isGlobalAdmin }` | fastify.d.ts augmentation pattern — no changes to user shape |
| CLERK-05 | Remove `@fastify/jwt`, `bcryptjs`, `RefreshToken` model, all custom auth routes | Full inventory documented — see Runtime State Inventory |
| CLERK-06 | `CLERK_SECRET_KEY` only on backend; `VITE_CLERK_PUBLISHABLE_KEY` only on frontend | env plugin schema update pattern confirmed |
| CLERK-07 | Frontend `client.ts` injects tokens via `getToken()` — no localStorage, no manual refresh | setTokenGetter pattern + useAuth hook confirmed |
| CLERK-08 | Google and GitHub social login buttons visible on embedded sign-in component | Dashboard-configured, zero code change required |
</phase_requirements>

---

## Summary

Phase 9 replaces the existing custom HS256 JWT/bcrypt auth stack with Clerk. The changes span three layers: Prisma schema (add `clerkId`, make `passwordHash` nullable, eventually drop `RefreshToken`), Fastify backend (new Clerk plugin + rewritten `authGuard` using `verifyToken()`), and the React frontend (ClerkProvider wrapper, embedded `<SignIn />`/`<SignUp />` components replacing custom forms, and a rewritten `client.ts` that injects Clerk session tokens).

The existing codebase is well-structured for this swap. The Fastify plugin pattern (`fastify-plugin` + `fp()`) is already used for `jwt.ts` — the new `clerk.ts` plugin follows exactly the same shape. The `FastifyInstance` type augmentation in `fastify.d.ts` needs four properties removed (`jwt`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `accessJwtVerify`, `refreshJwtVerify`, `accessJwtSign`, `refreshJwtSign`) and two added (`clerk: ClerkClient`, `CLERK_SECRET_KEY` on config). The `req.user` shape is unchanged.

The most significant testing concern is that every integration test currently provisions users via `POST /api/v1/auth/signup` and obtains tokens from `POST /api/v1/auth/login`. After this phase those routes are gone. A new test helper must create DB users directly (bypassing Clerk) and generate a fake-signed JWT using the JWKS public key — or more practically, the tests should use a mocked/stubbed `verifyToken()` that accepts a test-issued token and returns a known payload.

**Primary recommendation:** Implement in three strictly sequential waves — schema migration first, then backend Clerk plugin + new authGuard, then frontend. Do not attempt to bridge old and new auth simultaneously. The test suite must be updated in the same wave as the backend change or vitest will fail on every integration test.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/backend | 3.2.4 (latest) | Backend JWT verification, user fetch | Official Clerk Node/backend SDK; `createClerkClient` and `verifyToken` live here |
| @clerk/clerk-react | 5.61.3 (latest) | ClerkProvider, SignIn, SignUp, useAuth | Official Clerk React SDK; all embedded components and hooks |

### Packages Being Removed
| Library | Version | Why Removed |
|---------|---------|-------------|
| @fastify/jwt | 10.0.0 | Replaced by Clerk JWKS-based verification |
| bcryptjs | 3.0.3 | No more local password hashing |
| @types/bcryptjs | 3.0.0 | Type package for bcryptjs |

### Note on @clerk/fastify
There is an official `@clerk/fastify` package (3.1.6) that wraps Clerk as a Fastify plugin. However, it uses `authenticateRequest()` and exposes `getAuth()` per-request — a different surface than the `verifyToken()` approach locked in CONTEXT.md. The locked approach uses `@clerk/backend` directly with a custom plugin, which gives full control over user auto-provisioning in `authGuard`. Do NOT use `@clerk/fastify`.

**Installation:**
```bash
# Backend
npm install @clerk/backend --workspace=packages/api

# Frontend
npm install @clerk/clerk-react --workspace=packages/web

# Remove from backend
npm uninstall @fastify/jwt bcryptjs @types/bcryptjs --workspace=packages/api
```

**Version verification (confirmed against npm registry on 2026-04-01):**
- `@clerk/backend` → 3.2.4
- `@clerk/clerk-react` → 5.61.3

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
packages/api/src/
├── plugins/
│   └── clerk.ts          # new: createClerkClient, decorate server.clerk
├── hooks/
│   └── auth-guard.ts     # replace: verifyToken() + auto-provision
├── types/
│   └── fastify.d.ts      # update: remove jwt, add clerk + CLERK_SECRET_KEY

packages/web/src/
├── main.tsx               # update: wrap with ClerkProvider
├── pages/auth/
│   ├── LoginPage.tsx      # replace form content with <SignIn />
│   └── SignupPage.tsx     # replace form content with <SignUp />
├── api/
│   └── client.ts          # rewrite: remove localStorage, add setTokenGetter pattern
├── contexts/
│   └── AuthContext.tsx    # rewrite: replace login/signup/logout with Clerk hooks
```

### Pattern 1: Clerk Fastify Plugin
**What:** Registers a `createClerkClient` instance on the Fastify server instance as `server.clerk`.
**When to use:** Register after `envPlugin` (needs `CLERK_SECRET_KEY`), before all route plugins.
**Example:**
```typescript
// Source: CONTEXT.md specifics + @clerk/backend docs
import fp from 'fastify-plugin'
import { createClerkClient } from '@clerk/backend'
import type { FastifyPluginAsync } from 'fastify'

const clerkPlugin: FastifyPluginAsync = fp(async (server) => {
  const clerk = createClerkClient({ secretKey: server.config.CLERK_SECRET_KEY })
  server.decorate('clerk', clerk)
})
export { clerkPlugin }
```

### Pattern 2: New authGuard with verifyToken + Auto-Provision
**What:** Extracts Bearer token, calls `verifyToken()`, looks up or creates DB user.
**When to use:** Applied as a `preHandler` on all protected routes (same as current `authGuard`).
**Critical implementation details:**
- `verifyToken(token, { secretKey })` returns a `JwtPayload` on success; throws on invalid/expired
- `payload.sub` = Clerk user ID (the `clerkId` value)
- DB lookup: `prisma.user.findUnique({ where: { clerkId: payload.sub } })`
- Auto-provision path: call `server.clerk.users.getUser(payload.sub)` to get email, then `prisma.user.create`
- Email selection: `clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === 'verified')?.emailAddress`
- If no verified email found: return 401 with code `UNVERIFIED_EMAIL`
- After lookup/create: `request.user = { id: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin }` (fully typed, no cast)

**Example:**
```typescript
// Source: CONTEXT.md specifics
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', field: null, status: 401 } })
  }
  const token = authHeader.slice(7)
  try {
    const payload = await request.server.clerk.verifyToken(token, {
      secretKey: request.server.config.CLERK_SECRET_KEY
    })
    // payload.sub is the Clerk user ID
    let user = await request.server.prisma.user.findUnique({ where: { clerkId: payload.sub } })
    if (!user) {
      // Auto-provision
      const clerkUser = await request.server.clerk.users.getUser(payload.sub)
      const email = clerkUser.emailAddresses.find(
        e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === 'verified'
      )?.emailAddress
      if (!email) {
        return reply.code(401).send({ error: { code: 'UNVERIFIED_EMAIL', message: 'Primary email not verified', field: null, status: 401 } })
      }
      user = await request.server.prisma.user.create({
        data: { clerkId: payload.sub, email, displayName: clerkUser.firstName ?? email.split('@')[0] }
      })
    }
    request.user = { id: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin }
  } catch {
    return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', field: null, status: 401 } })
  }
}
```

### Pattern 3: FastifyInstance Type Augmentation Update
**What:** Remove JWT-specific types, add `clerk: ClerkClient` and `CLERK_SECRET_KEY`.
**Example:**
```typescript
// packages/api/src/types/fastify.d.ts
import type { PrismaClient } from '@prisma/client'
import type { ClerkClient } from '@clerk/backend'
import type { EscrowAdapter, StorageAdapter, NotificationAdapter } from '../plugins/demo-mode.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    clerk: ClerkClient
    config: {
      DATABASE_URL: string
      CLERK_SECRET_KEY: string       // replaces JWT_SECRET + REFRESH_TOKEN_SECRET
      DEMO_MODE: string
      PORT: number
      CORS_ORIGIN: string
    }
    demoMode: boolean
    escrowAdapter: EscrowAdapter
    storageAdapter: StorageAdapter
    notificationAdapter: NotificationAdapter
  }
  interface FastifyRequest {
    user: {
      id: string
      email: string
      isGlobalAdmin: boolean
    }
    // Remove: accessJwtVerify, refreshJwtVerify
  }
  // Remove: FastifyReply augmentation (accessJwtSign, refreshJwtSign)
}
```

### Pattern 4: Frontend ClerkProvider Wrapping
**What:** Wrap app in `<ClerkProvider>` in `main.tsx`. Replace `<AuthProvider>` entirely.
**Key props:**
- `publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}` — automatic if env var is named correctly, but explicit is safer
- `signInUrl="/login"` — tells Clerk where your SignIn page lives
- `signUpUrl="/signup"` — tells Clerk where your SignUp page lives
- `afterSignOutUrl="/"` — where to send users after signout
- `routerPush` / `routerReplace` — wire up react-router-dom's `navigate`

**Example (main.tsx):**
```tsx
// Source: CONTEXT.md + Clerk React quickstart docs
import { ClerkProvider } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

// ClerkProvider must be inside RouterProvider to access useNavigate
// Pattern: wrap RouterProvider output, or use a child component for navigate wiring
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Simplest approach — ClerkProvider wraps QueryClientProvider wraps RouterProvider
// Note: routerPush/routerReplace require access to navigate, which requires being inside the Router
// Clerk 5.x auto-detects react-router when using react-router-dom — no explicit routerPush needed
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/" signInUrl="/login" signUpUrl="/signup">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors theme="dark" />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
)
```

**Important:** The `AuthProvider` context and `AuthContext.tsx` are removed entirely. All auth state comes from Clerk's `useAuth()` and `useUser()` hooks.

### Pattern 5: Embedded SignIn and SignUp Pages
**What:** Replace form content in LoginPage/SignupPage with Clerk components. Preserve existing page chrome (logo, back link, card styling).
**Routing requirement:** React Router route must use a wildcard `/*` suffix to handle Clerk's internal multi-step navigation: `path="/login/*"`.
**Example:**
```tsx
// packages/web/src/pages/auth/LoginPage.tsx
import { SignIn } from '@clerk/clerk-react'

export function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Keep logo/header chrome */}
      <SignIn
        routing="path"
        path="/login"
        appearance={{
          variables: {
            colorPrimary: '#F0A500',       // --mk-gold
            colorBackground: '#0D1829',    // --mk-navy dark
            colorForeground: '#F5F5F5',    // --mk-white
            colorNeutral: '#4A5568',
            colorInput: '#1A2640',
            borderRadius: '0.75rem',
          }
        }}
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
```

**Note on appearance variables:** As of July 2025 `colorText` and `colorInputBackground` are deprecated. Use `colorForeground` and `colorInput` respectively.

### Pattern 6: Frontend Token Injection (module-level getter)
**What:** Since `client.ts` is not a React component, token injection uses a module-level setter initialized from a hook.
**Where to call `setTokenGetter`:** In `AppLayout.tsx` or a new `AuthSync` component rendered inside ClerkProvider, using `useAuth()`.
**Example:**
```typescript
// packages/web/src/api/client.ts
let _getToken: (() => Promise<string | null>) | null = null

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn
}

async function request<T>(path: string, init: ReqInit = {}): Promise<T> {
  const token = _getToken ? await _getToken() : null
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) }
  if (!headers['Content-Type'] && !(init.body instanceof FormData) && init.method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    window.location.replace('/login')
    throw new Error(AUTH_REDIRECT_ERROR_MESSAGE)
  }
  // ... rest of error handling unchanged
}
```

```tsx
// In AppLayout.tsx or a dedicated AuthSync component
import { useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '@/api/client'
import { useEffect } from 'react'

export function AuthSync() {
  const { getToken } = useAuth()
  useEffect(() => {
    setTokenGetter(() => getToken())
  }, [getToken])
  return null
}
```

### Pattern 7: Prisma Migration Sequence
**Migration 1 (Wave 1):** Add `clerkId`, make `passwordHash` nullable.
```prisma
model User {
  clerkId      String?  @unique  // add — nullable during transition, becomes required later
  passwordHash String?            // was String (non-nullable)
  // ... all other fields unchanged
}
```
Run: `npx prisma migrate dev --name add-clerk-id`

**Migration 2 (Wave 3 cleanup):** Drop `RefreshToken` table, drop `passwordHash`, make `clerkId` non-nullable.
```prisma
model User {
  clerkId      String  @unique   // now required
  // passwordHash removed entirely
  // refreshTokens relation removed
}
// RefreshToken model removed entirely
```
Run: `npx prisma migrate dev --name remove-legacy-auth`

### Anti-Patterns to Avoid
- **Using `@clerk/fastify`**: It uses `authenticateRequest()` not `verifyToken()`. Locked decision is `verifyToken()`.
- **Storing tokens in localStorage**: Clerk manages session tokens in memory and HTTP-only cookies. Do not replicate the old localStorage pattern.
- **Calling `clerk.sessions.verifySession()`**: This is deprecated and network-heavier than `verifyToken()`.
- **Bridging old and new auth simultaneously**: The "full replace" strategy is locked. Running both auth systems in parallel adds complexity and is explicitly rejected.
- **Using `emailAddresses[0]`**: Always use `primaryEmailAddressId` lookup with verified check.
- **Making `clerkId` required in migration 1**: Users signing up after the schema change will have no clerkId until auto-provision. Keep nullable through Wave 1-2.
- **Omitting `/*` from Router paths for auth pages**: Without the wildcard, Clerk's internal factor selection steps (e.g., OTP entry) will 404.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWKS key fetching & caching | Custom HTTP fetch of `/.well-known/jwks.json` | `clerk.verifyToken()` | Clerk SDK handles JWKS cache, key rotation, and RS256 verification internally |
| Session token refresh | Retry loop + `/auth/refresh` endpoint | `useAuth().getToken()` | Clerk auto-refreshes sessions every 60 seconds; `getToken()` always returns a valid non-expired token |
| Social login OAuth flow | Custom Google/GitHub OAuth routes | Clerk dashboard config | Social providers are configured entirely in Clerk dashboard; zero code change |
| Signup/login UI state machine | Multi-step form with verification flow | `<SignIn />` / `<SignUp />` | Clerk components handle factor selection, email verification, social redirect, error display |
| Token expiry handling in client | Track `exp` claim, schedule refresh | Trust Clerk's `getToken()` | `getToken()` proactively refreshes before expiry — no client-side expiry tracking needed |

**Key insight:** Clerk's value proposition is that all of these are solved, tested, and maintained. Reimplementing any of them loses the security guarantees and incurs ongoing maintenance.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `refresh_tokens` table in PostgreSQL — ~N rows. `users.password_hash` column — populated for all current users. | No migration needed (clean dev DB per locked decision). Migration 2 will `DROP TABLE refresh_tokens` and `ALTER TABLE users DROP COLUMN password_hash`. |
| Live service config | None — no external services configured beyond the database | None |
| OS-registered state | None — no task scheduler or service manager registrations for auth | None |
| Secrets/env vars | `JWT_SECRET` and `REFRESH_TOKEN_SECRET` in `packages/api/.env` (not in git). These are removed from the env schema in Wave 1. | Remove from `.env` after backend migration. Add `CLERK_SECRET_KEY` to `packages/api/.env`. Add `VITE_CLERK_PUBLISHABLE_KEY` to `packages/web/.env`. Update `.env.example`. |
| Build artifacts | None for auth — no compiled auth binaries outside of TypeScript compilation | None |

**Integration test impact (critical):** All existing integration tests in `packages/api/test/` use `POST /api/v1/auth/signup` to provision test users and get tokens. These endpoints will not exist after Wave 1. The `test/helpers/app.ts` `injectHeaders()` function and all `signup()` helpers across test files must be replaced with a test helper that either: (a) inserts a user directly via `prisma.user.create({ data: { clerkId: 'test_...', email, displayName } })` and generates a mock JWT signed with a test key, or (b) mocks `clerk.verifyToken()` to accept a test-generated token. Option (b) — mocking verifyToken — is strongly preferred because it avoids needing a real Clerk JWKS endpoint in test environments.

---

## Common Pitfalls

### Pitfall 1: Router Paths Without Wildcard
**What goes wrong:** `<Route path="/login" element={<LoginPage />} />` — Clerk's multi-factor steps (OTP, factor selection) emit navigation to `/login/factor-one`, `/login/sso-callback`, etc. Without `/*`, the router 404s on these internal paths.
**Why it happens:** Clerk's embedded components navigate internally during auth flows.
**How to avoid:** Always use `path="/login/*"` and `path="/signup/*"` in the React Router config.
**Warning signs:** Social login or OTP flows get stuck or show blank pages.

### Pitfall 2: ClerkProvider Outside Router
**What goes wrong:** If `ClerkProvider` is placed outside `RouterProvider`, `routerPush`/`routerReplace` callbacks cannot access `useNavigate()`, causing navigation to fall back to `window.location` and full page reloads.
**Why it happens:** `useNavigate` must be called inside a Router context.
**How to avoid:** The simplest solution is to omit `routerPush`/`routerReplace` — Clerk 5.x with react-router-dom auto-detects the router and handles navigation. Verified: in the React quickstart, `ClerkProvider` simply wraps the app without explicit router callbacks when using Vite + react-router-dom.
**Warning signs:** Auth redirects cause full page reloads instead of client-side navigation.

### Pitfall 3: Test Suite Breaks After Removing Auth Routes
**What goes wrong:** All integration tests outside `packages/api/test/auth/` call the `signup()` helper which uses `POST /api/v1/auth/signup`. After Wave 1 removes those routes, every test file errors in `beforeAll`.
**Why it happens:** The test setup pattern couples user provisioning to auth endpoints.
**How to avoid:** Wave 1 must include updating `test/helpers/app.ts` to add a `createTestUser(app, overrides?)` helper that inserts directly via Prisma and returns a test-verifiable JWT. All test files' `signup()` calls must be replaced.
**Warning signs:** `vitest` run immediately fails with 404 on `POST /api/v1/auth/signup` in beforeAll.

### Pitfall 4: verifyToken Throws on Expired Tokens
**What goes wrong:** `verifyToken()` throws a `TokenVerificationError` for expired tokens. If the catch block doesn't differentiate, all 401s look the same.
**Why it happens:** The function rejects the promise rather than returning a result with an error field.
**How to avoid:** In `authGuard`, catch the error and check the error type/message to return `TOKEN_EXPIRED` vs `UNAUTHORIZED` for better client debugging. The existing error shape (`{ error: { code, message, field, status } }`) is preserved.
**Warning signs:** Client can't distinguish session expiry from invalid token.

### Pitfall 5: Auto-Provision Race Condition
**What goes wrong:** Two simultaneous requests from a new Clerk user hit `authGuard` at the same time, both find no DB user, and both attempt `prisma.user.create` — second one fails with a unique constraint violation on `clerkId`.
**Why it happens:** No transaction/lock between findUnique and create.
**How to avoid:** Use `prisma.user.upsert({ where: { clerkId }, create: {...}, update: {} })` instead of the create-if-not-exists pattern. The `update: {}` no-op means an existing user is never mutated.
**Warning signs:** Occasional 500 errors on first login for new users under load.

### Pitfall 6: AuthContext.tsx Still Referenced After Removal
**What goes wrong:** After removing `AuthContext.tsx` and `AuthProvider`, other components that import `useAuth` from `@/contexts/AuthContext` will fail to compile.
**Why it happens:** The existing codebase uses `useAuth()` from AuthContext in AppLayout.tsx, LoginPage.tsx, SignupPage.tsx, DashboardPage.tsx, and ProfilePage.tsx.
**How to avoid:** Wave 2 must update every `import { useAuth } from '@/contexts/AuthContext'` to `import { useAuth } from '@clerk/clerk-react'`. The Clerk `useAuth()` hook provides `isLoaded`, `isSignedIn`, `getToken`, `userId` — a different shape from the custom context's `{ user, loading, login, signup, logout, refreshUser }`. All call sites must be updated.
**Warning signs:** TypeScript compilation fails with "Module not found: '@/contexts/AuthContext'" or type errors on `user.email`, `user.isGlobalAdmin` (not available from Clerk's useAuth — those come from `useUser()` or a separate `/api/v1/auth/me` call).

### Pitfall 7: User Profile Data After AuthContext Removal
**What goes wrong:** The existing `AppLayout.tsx` uses `user?.isGlobalAdmin` from the old AuthContext `user` object. After switching to Clerk's `useAuth()`, there is no `user.isGlobalAdmin` — Clerk knows nothing about this field.
**Why it happens:** `isGlobalAdmin` is stored in the Mukwano DB, not in Clerk metadata (locked decision).
**How to avoid:** Keep the `GET /api/v1/auth/me` endpoint (it's in the "stays" list from CONTEXT.md). After sign-in, call `/auth/me` to hydrate the Mukwano user profile (including `isGlobalAdmin`, `displayName`, `country`, `sector`). A lightweight `useMukwanoUser()` hook wrapping `useQuery(['me'], () => api.get('/auth/me'))` replaces the old `user` from AuthContext for profile data purposes.
**Warning signs:** Admin nav link never shows; profile fields are always undefined.

---

## Code Examples

### verifyToken() function signature
```typescript
// Source: https://clerk.com/docs/reference/backend/verify-token
import { verifyToken } from '@clerk/backend'
// or via clerkClient instance:
const payload = await clerkClient.verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY
  // Returns JwtPayload with:
  // payload.sub    — Clerk user ID (e.g., "user_2abc...")
  // payload.sid    — Session ID
  // payload.iss    — Issuer
  // payload.exp    — Expiry timestamp
  // Throws TokenVerificationError on invalid/expired token
})
```

### users.getUser()
```typescript
// Source: @clerk/backend docs
const clerkUser = await clerkClient.users.getUser(clerkUserId)
// clerkUser.emailAddresses — array of EmailAddress objects
// clerkUser.primaryEmailAddressId — string ID of primary email
// clerkUser.firstName / clerkUser.lastName
// emailAddress.verification?.status === 'verified'
```

### useAuth() hook (frontend)
```typescript
// Source: https://clerk.com/docs/react/hooks/use-auth
import { useAuth } from '@clerk/clerk-react'

const { isLoaded, isSignedIn, getToken, userId } = useAuth()
// getToken() → Promise<string | null> — always returns a fresh non-expired token
// isSignedIn — boolean (undefined if not loaded)
// isLoaded — boolean (false before Clerk initializes)
```

### useUser() hook (for profile data)
```typescript
// Source: Clerk React docs
import { useUser } from '@clerk/clerk-react'
const { user } = useUser()
// user.primaryEmailAddress?.emailAddress
// user.firstName, user.lastName
// This is Clerk's user — does NOT include isGlobalAdmin, country, sector
// Still need GET /auth/me for Mukwano-specific fields
```

### Appearance customization matching Mukwano design system
```typescript
// Mukwano CSS vars: --mk-gold: #F0A500, --mk-navy: #060D1F, --mk-white: #F5F5F5
const clerkAppearance = {
  variables: {
    colorPrimary: '#F0A500',      // --mk-gold
    colorBackground: '#0D1829',   // dark card background
    colorForeground: '#F5F5F5',   // --mk-white
    colorNeutral: '#4A5568',
    colorInput: '#1A2640',        // input background
    colorBorder: 'rgba(240, 165, 0, 0.2)',
    borderRadius: '0.75rem',
    fontFamily: "'Inter', sans-serif"
  }
}
// Note: colorText and colorInputBackground are deprecated as of July 2025
// Use colorForeground and colorInput instead
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HS256 symmetric JWT | RS256 asymmetric JWKS | Clerk-native | No manual key management; key rotation handled by Clerk |
| localStorage token storage | Clerk session (memory + HTTP-only cookie) | Clerk-native | No XSS token theft; automatic refresh every 60s |
| Manual refresh token rotation | Clerk session management | Clerk-native | No refresh endpoint needed; no token family tracking |
| `colorText` / `colorInputBackground` vars | `colorForeground` / `colorInput` | July 2025 Clerk update | Old var names deprecated — use new names |
| Explicit `routerPush` prop in ClerkProvider | Auto-detection of react-router-dom | Clerk 5.x | No manual router wiring needed for basic cases |

**Deprecated/outdated:**
- `clerk.sessions.verifySession()`: Use `clerk.verifyToken()` instead (locked decision).
- `colorText` appearance variable: Deprecated July 2025 — use `colorForeground`.
- `colorInputBackground` appearance variable: Deprecated July 2025 — use `colorInput`.
- `spacingUnit` appearance variable: Deprecated — use `spacing`.

---

## Open Questions

1. **Test mocking strategy for verifyToken()**
   - What we know: All integration tests use the custom auth endpoints for user setup. Those endpoints are removed.
   - What's unclear: Vitest's recommended pattern for mocking a decorated Fastify instance property (`server.clerk.verifyToken`) — needs `vi.mock` or a test-specific buildApp() override.
   - Recommendation: Add a `TEST_MODE` flag or a `buildTestApp()` variant that accepts a mock clerk object via dependency injection. This is a Wave 1 task that unblocks all subsequent test waves.

2. **`displayName` during auto-provision**
   - What we know: The DB `displayName` column is non-nullable. Clerk users may not have `firstName` set (especially social login).
   - What's unclear: What fallback to use for `displayName` when `clerkUser.firstName` is null.
   - Recommendation: Use `clerkUser.firstName ?? clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] ?? 'User'`. This can be updated from profile settings later.

3. **Onboarding flow after Clerk signup**
   - What we know: After signup, the current flow navigates to `/onboarding/sector`. Clerk's `<SignUp />` will handle the signup — the `afterSignUpUrl` prop controls where Clerk redirects post-signup.
   - What's unclear: Whether Clerk's redirect fires before or after auto-provision in authGuard (first authenticated API call triggers auto-provision).
   - Recommendation: Set `afterSignUpUrl="/onboarding/sector"` on `<SignUp />`. Auto-provision happens on the first protected API call (e.g., `GET /auth/me` which the onboarding page likely triggers). No blocking issue.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | @clerk/backend | ✓ | (project uses tsx 4.21.0 / Node 22) | — |
| PostgreSQL | Prisma migrations | ✓ (docker compose up -d) | 16 | — |
| Clerk account + app | CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY | External — must be provisioned | — | No fallback — keys required before any Clerk auth works |
| npm workspaces | --workspace install | ✓ | npm 10+ | — |

**Missing dependencies with no fallback:**
- Clerk account and application must be created at https://dashboard.clerk.com before implementation begins. Both `CLERK_SECRET_KEY` (from API Keys) and `VITE_CLERK_PUBLISHABLE_KEY` (from API Keys) must be in hand.
- Social login (Google, GitHub) OAuth app registrations must be configured in Clerk dashboard for CLERK-08 to pass.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `packages/api/vitest.config.ts` |
| Quick run command | `npm -w packages/api test -- --run` |
| Full suite command | `npm -w packages/api test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLERK-02 | `verifyToken()` rejects tampered/expired token with 401 | unit | `npm -w packages/api test -- --run test/auth/clerk-auth-guard.test.ts` | ❌ Wave 0 |
| CLERK-03 | Auto-provision creates User row on first Clerk login | integration | `npm -w packages/api test -- --run test/auth/clerk-auth-guard.test.ts` | ❌ Wave 0 |
| CLERK-04 | `req.user` typed correctly, no `as any` | build (tsc) | `npm -w packages/api run build` | ✅ (will fail until types updated) |
| CLERK-05 | All old auth routes return 404 | integration | `npm -w packages/api test -- --run test/auth/legacy-routes.test.ts` | ❌ Wave 0 |
| CLERK-06 | Backend starts without JWT_SECRET in env | integration | `npm -w packages/api test -- --run test/config.test.ts` | ✅ (needs update) |
| CLERK-07 | client.ts injects token from getToken(), no localStorage | manual/smoke | N/A | N/A |

### Sampling Rate
- **Per task commit:** `npm -w packages/api run build` (TypeScript compile check)
- **Per wave merge:** `npm -w packages/api test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/api/test/auth/clerk-auth-guard.test.ts` — covers CLERK-02, CLERK-03
- [ ] `packages/api/test/helpers/app.ts` update — add `createTestUser()` helper that bypasses auth routes
- [ ] `packages/api/test/auth/legacy-routes.test.ts` — covers CLERK-05 (verifies old routes are gone)
- [ ] All existing test files' `signup()` helpers must be updated to use direct Prisma inserts + mock JWT

---

## Sources

### Primary (HIGH confidence)
- `https://clerk.com/docs/reference/backend/verify-token` — `verifyToken()` function signature, parameters, payload claims
- `https://clerk.com/docs/js-backend/getting-started/quickstart` — `createClerkClient`, `users.getUser()` API
- `https://clerk.com/docs/react/guides/development/custom-sign-in-or-up-page` — custom sign-in page pattern, ClerkProvider props, Router wildcard requirement
- `https://clerk.com/docs/react/guides/customizing-clerk/appearance-prop/variables` — appearance variables including deprecation of `colorText`/`colorInputBackground`
- npm registry — `@clerk/backend@3.2.4`, `@clerk/clerk-react@5.61.3` (verified 2026-04-01)
- Project codebase — existing auth patterns, Fastify plugin structure, type augmentation

### Secondary (MEDIUM confidence)
- `https://clerk.com/docs/guides/routing` — routing strategies, `/*` wildcard requirement
- `https://clerk.com/docs/quickstarts/fastify` — confirmed @clerk/fastify uses authenticateRequest() not verifyToken() (reinforces locked decision to use @clerk/backend directly)
- `https://clerk.com/docs/react/hooks/use-auth` — useAuth() hook shape, getToken() behavior

### Tertiary (LOW confidence)
- Note on routerPush/routerReplace auto-detection in Clerk 5.x with react-router-dom: sourced from React quickstart docs but specific version behavior not independently verified. If navigation issues arise, explicit routerPush callbacks are the fallback.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry
- Architecture: HIGH — patterns verified against Clerk docs + existing codebase
- verifyToken() API: HIGH — official docs fetched and confirmed
- Appearance variables: HIGH — official docs confirm deprecations
- Pitfalls: MEDIUM-HIGH — pitfalls 1-5 are derived from official docs and codebase analysis; pitfalls 6-7 are codebase-specific and HIGH confidence
- Test strategy: MEDIUM — mocking pattern for Fastify decorated property not independently verified; recommend Wave 0 spike

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Clerk releases frequently; check changelog for breaking changes before implementation)
