# Phase 9: Clerk Auth Integration — Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Source:** Design conversation (all decisions locked by user)

<domain>
## Phase Boundary

Replace the existing custom JWT/bcrypt authentication system with Clerk. This phase covers:

- **Backend**: Remove `@fastify/jwt`, `bcryptjs`, custom auth routes, and `RefreshToken` model. Install `@clerk/backend`, add a Clerk Fastify plugin, replace `authGuard` with JWKS-based token verification using `clerk.verifyToken()`, and auto-provision DB users on first Clerk login.
- **Frontend**: Remove custom token storage and refresh loop in `client.ts`. Install `@clerk/clerk-react`, wrap app in `ClerkProvider`, replace `LoginPage`/`SignupPage` with embedded `<SignIn />`/`<SignUp />` components.
- **DB schema**: Add `clerkId String @unique` to User, make `passwordHash` nullable, run migration, then drop `RefreshToken` table.

Out of scope: multi-tenancy, Clerk Organizations, webhooks, user management UI (Clerk dashboard handles this).

</domain>

<decisions>
## Implementation Decisions

### Auth UI Strategy
- **LOCKED**: Use **embedded Clerk components** (`<SignIn />`, `<SignUp />`) inside existing React pages — not hosted redirect to Clerk domain.
- Why: seamless UX, full branding control (Mukwano navy/gold theme), integrates with existing route flow.

### Social Logins
- **LOCKED**: Enable **Google and GitHub** in Clerk dashboard. Zero frontend code change needed — Clerk components surface these automatically once enabled in dashboard.

### Existing Users / Migration
- **LOCKED**: **Start fresh** — dev database, no user migration needed. `passwordHash` becomes nullable (null for all Clerk users).

### Backend Token Verification
- **LOCKED**: Use `clerk.verifyToken(token, { secretKey })` — NOT `clerk.sessions.verifySession()`. Clerk JWTs are RS256-signed against JWKS endpoint. `verifyToken` handles that correctly.
- Reference: `@clerk/backend` createClerkClient API.

### Email Selection
- **LOCKED**: Use `clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === 'verified')?.emailAddress` — not `emailAddresses[0]`. If no primary verified email, return 401 with `UNVERIFIED_EMAIL`.

### Environment Variables
- **LOCKED**: Backend needs only `CLERK_SECRET_KEY`. Frontend needs only `VITE_CLERK_PUBLISHABLE_KEY`. Do not add `CLERK_PUBLISHABLE_KEY` to the backend env schema.

### TypeScript / Fastify Types
- **LOCKED**: Keep `req.user` typed via `packages/api/src/types/fastify.d.ts` as `{ id: string; email: string; isGlobalAdmin: boolean }`. No `(req as any).user` casts anywhere. Add `clerk: ClerkClient` to `FastifyInstance` declaration.

### Migration Strategy
- **LOCKED**: **Full replace** (not bridge). Phases:
  1. Backend: add Clerk plugin + new authGuard + schema migration (clerkId, passwordHash nullable)
  2. Frontend: ClerkProvider + embedded components + client.ts rewrite
  3. Cleanup: remove @fastify/jwt, remove custom auth routes, drop RefreshToken model, remove passwordHash column, remove bcryptjs

### Frontend Token Injection
- **LOCKED**: Replace `localStorage` token management in `client.ts` with Clerk's `getToken()`. No manual refresh loop — Clerk handles session refresh internally. The `tryRefresh()`, `ACCESS_KEY`, `REFRESH_KEY` constants, and retry logic in `client.ts` are removed.

### Claude's Discretion
- Exact Clerk appearance/theme customization (colors, logo) — match existing app design system
- Whether to use Clerk's `<UserButton />` for profile menu
- Error message wording for `UNVERIFIED_EMAIL` 401 response
- Whether to keep `isGlobalAdmin` field sourced from DB (not Clerk metadata) — recommendation: keep in DB

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing auth system (being replaced)
- `packages/api/src/hooks/auth-guard.ts` — current authGuard using `request.accessJwtVerify()`
- `packages/api/src/plugins/jwt.ts` — `@fastify/jwt` namespaced plugin (access + refresh)
- `packages/api/src/plugins/env.ts` — env schema with `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (both to be removed)
- `packages/api/src/types/fastify.d.ts` — TypeScript augmentation for `req.user`, `FastifyInstance` (update in place)
- `packages/api/src/services/auth.service.ts` — signup/login/refresh/logout/getMe/updateMe (getMe and updateMe stay, rest removed)
- `packages/api/src/routes/auth/` — all auth route files (`signup.ts`, `login.ts`, `logout.ts`, `refresh.ts`, `me.ts`, `index.ts`)
- `packages/api/src/app.ts` — plugin registration order (jwt plugin registration to be removed)
- `packages/api/prisma/schema.prisma` — User model (`passwordHash` to nullable, add `clerkId`); RefreshToken model (to be dropped)

### Frontend (being updated)
- `packages/web/src/api/client.ts` — token storage, tryRefresh(), request() function (full rewrite of auth injection)
- `packages/web/src/pages/auth/LoginPage.tsx` — replace form with `<SignIn />`
- `packages/web/src/pages/auth/SignupPage.tsx` — replace form with `<SignUp />`
- `packages/web/src/main.tsx` — app entry point (wrap with `ClerkProvider`)
- `packages/web/vite.config.ts` — check proxy config still works (no change expected)

### Config / env
- `packages/api/.env` (not committed) — add `CLERK_SECRET_KEY=sk_...`
- `packages/web/.env` (not committed) — add `VITE_CLERK_PUBLISHABLE_KEY=pk_...`
- `.env.example` — add both keys (with placeholder values) for documentation

### System design
- `SYSTEM_DESIGN.md` — auth section describes current JWT flow; update to reflect Clerk after implementation

</canonical_refs>

<specifics>
## Specific Implementation Notes

### Fastify Clerk Plugin (`packages/api/src/plugins/clerk.ts`)
```ts
import fp from 'fastify-plugin'
import { createClerkClient } from '@clerk/backend'
import type { FastifyPluginAsync } from 'fastify'

const clerkPlugin: FastifyPluginAsync = fp(async (server) => {
  const clerk = createClerkClient({ secretKey: server.config.CLERK_SECRET_KEY })
  server.decorate('clerk', clerk)
})
export { clerkPlugin }
```

### New authGuard (`packages/api/src/hooks/auth-guard.ts`)
Key points:
- `const payload = await request.server.clerk.verifyToken(token, { secretKey: ... })`
- `payload.sub` is the Clerk user ID
- `prisma.user.findUnique({ where: { clerkId: payload.sub } })` for DB lookup
- Auto-provision block: `clerk.users.getUser(clerkUserId)` → find primary+verified email → `prisma.user.create`
- `request.user = { id: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin }` (typed, no cast)

### Frontend ClerkProvider (`packages/web/src/main.tsx`)
```tsx
import { ClerkProvider } from '@clerk/clerk-react'
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// Wrap <App /> with <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
```

### Frontend client.ts token injection
The `request()` function needs access to Clerk's `getToken()`. Since `client.ts` is not a React component, use a module-level token getter that is initialized once from a React context/hook and injected. Pattern:
```ts
let _getToken: (() => Promise<string | null>) | null = null
export function setTokenGetter(fn: () => Promise<string | null>) { _getToken = fn }
// In request(): const token = _getToken ? await _getToken() : null
```
Call `setTokenGetter(getToken)` from a top-level component (e.g., `AppLayout` or `App`) using `useAuth()`.

### Prisma migration sequence
1. `ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE` + make `password_hash` nullable → `prisma migrate dev --name add-clerk-id`
2. After cleanup: `DROP TABLE refresh_tokens` + `ALTER TABLE users DROP COLUMN password_hash` → second migration

</specifics>

<deferred>
## Deferred Ideas

- Clerk webhooks for user lifecycle events (delete, update) — post-MVP
- Clerk Organizations for circle-level membership management — post-MVP
- `<UserButton />` profile menu integration — nice-to-have after core auth works
- Migrating existing production users from bcrypt to Clerk — not needed (clean dev DB)
- `isGlobalAdmin` sync to Clerk metadata — keep in DB for now, re-evaluate later

</deferred>

---

*Phase: 09-clerk-auth-integration*
*Context gathered: 2026-04-01 via design conversation*
