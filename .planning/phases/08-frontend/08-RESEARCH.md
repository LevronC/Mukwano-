# Phase 8: Frontend - Research

**Researched:** 2026-03-31
**Domain:** React SPA — auth, data fetching, forms, routing, role-gated UI, file upload
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Stack** — React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), TanStack Query v5, React Router v6, React Hook Form + Zod
2. **Auth Token Storage** — Access token in React context + localStorage; refresh token in localStorage; 401 interceptor in api.ts with one-time retry; logout clears localStorage
3. **Layout** — Warm & community-first visual style (earthy green `#3d6b4f` range, amber accents); top nav (no sidebar); DEMO_MODE persistent amber banner non-dismissible; 1200px max-width; admin actions inline (not a separate tab)
4. **Screen Map** — Routes as defined in CONTEXT.md §4 (19 routes total)
5. **Data Fetching Patterns** — Single typed `api.ts` fetch client; queryKey conventions `['circles']`, `['circle', id]`, etc.; mutations invalidate related cache
6. **Error Display** — Mutations: toast (top-right, 5s auto-dismiss); form field errors: inline using `error.field`; page-load 404/403: full-page error state; network errors: toast with retry; never show raw JSON
7. **Proof Upload Flow** — Two-step presigned: (1) POST /proof → get uploadUrl+fileKey; (2) PUT uploadUrl with raw file; (3) POST /proof/confirm. Client validates size ≤ 10 MB and MIME ∈ {jpeg, png, pdf} before step 1
8. **Role-Gated UI** — Admin actions render only when user role ∈ {creator, admin} from Circle detail response; global admin link only when isGlobalAdmin=true; backend is authoritative
9. **Circle Detail Tabs** — Tab state via `?tab=overview|contributions|proposals|projects` URL param; default `overview`; tab badge counts (pending contributions for admin, open proposals count)
10. **Project Lifecycle UI** — Status stepper: approved → executing → complete; admin-only Transition button for valid next state; INSUFFICIENT_TREASURY error displayed inline

### Claude's Discretion

None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Dark mode — defer to v2
- Real-time updates (WebSocket) — defer to v2 (polling acceptable for MVP)
- Circle search/filter — defer to v2
- Notification center / notification bell — defer to v2
- Mobile native app — out of scope (web only per constraints)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FE-01 | Auth screens (login, signup) with JWT session management | Auth flow pattern; signup requires `displayName`; token interceptor in api.ts |
| FE-02 | Dashboard screen showing treasury signals and action items | GET /dashboard response shape; TanStack Query staleTime tuning |
| FE-03 | Circle list and create screens | POST /circles requires `name` + `goalAmount`; optional governance fields |
| FE-04 | Circle detail with tabs: Overview, Contributions, Proposals, Projects | Tab via URL `?tab=`; 4 independent TanStack queries per tab |
| FE-05 | Contribution submission form with proof upload (two-step presigned flow) | Three-step proof flow; client-side MIME + size validation before first POST |
| FE-06 | Admin verify/reject contribution workflow in UI | PATCH (not POST) for verify; PATCH /reject requires `reason` body; role gate |
| FE-07 | Proposal create and vote screens with one-vote enforcement in UI | `requestedAmount` field name; vote body `{ vote: "yes"|"no"|"abstain" }`; 409 on duplicate |
| FE-08 | Project lifecycle and progress update screens | Status stepper; PATCH body `{ status }`; update body `content` field; INSUFFICIENT_TREASURY inline |
| FE-09 | Personal portfolio screen | GET /portfolio (not /me/portfolio); plus GET /portfolio/summary |
| FE-10 | Admin panel screens (global ledger, user management, pending contributions) | isGlobalAdmin from JWT; PATCH /admin/members/:id/role body `{ isGlobalAdmin: boolean }` |
| FE-11 | DEMO_MODE persistent banner when demoMode = true | GET /api/v1/config on app load; non-dismissible amber bar; show `balanceLabel` not raw balance |
| FE-12 | Consistent error display matching API error format | Error shape `{ error: { code, message, field, status } }`; toast vs inline vs page-level routing |
</phase_requirements>

---

## Summary

Phase 8 builds the Mukwano React SPA from a completely empty `packages/web/package.json` scaffold. The entire front-end must be installed and configured from scratch — Vite project, Tailwind CSS, shadcn/ui, TanStack Query v5, React Router v6, React Hook Form + Zod. There are no existing source files to integrate with; this is a greenfield build constrained by the fully-implemented 47-endpoint API from phases 1–7.

The most technically nuanced parts of this phase are: (1) the three-step proof upload flow with presigned URLs and direct PUT to storage, (2) token refresh interception with single-retry on 401 in a fetch-based client, (3) role-gated UI derived from Circle membership role included in GET /circles/:id, and (4) the DEMO_MODE banner wired to GET /api/v1/config fetched once on app start. All governance remains on the server — the frontend renders what the API returns, gates on roles for UX convenience only, never computes balances or vote tallies.

All stack choices are locked in CONTEXT.md. Research below focuses on integration patterns, exact API field contracts extracted from route source code, and component/testing approaches for each FE requirement.

**Primary recommendation:** Initialize the Vite + React + TypeScript project first (Wave 0), then layer Tailwind → shadcn/ui → routing → api client → auth context → screens in order, with each screen driven by what the API routes actually return.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 8 |
|-----------|-------------------|
| Tech stack: Node.js + Fastify + TypeScript, PostgreSQL 16, Prisma ORM, **React + TypeScript frontend** | Frontend must use React + TypeScript exactly |
| Structure: npm workspaces monorepo (`/api`, `/web`) | Web app lives in `packages/web/`; shares workspace with api |
| Auth: JWT HS256, 15-min access + 30-day refresh with family rotation | Frontend must handle 401 → refresh → retry; logout must call POST /auth/logout |
| DEMO_MODE: governance logic identical, only bank rails differ | Frontend must display DEMO_MODE banner but never modify governance behavior |
| Security: All business logic server-side; no balance mutations or vote counting in client | Frontend is display/input only — never derive totals, never count votes |
| GSD Workflow Enforcement: use `/gsd:execute-phase` for phase work | Follow GSD workflow; no direct edits outside a plan |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.0.3 | Build tool and dev server | Fastest HMR, native ESM, first-class TypeScript |
| react | 19.2.4 | UI framework | Project constraint; React 18+ required |
| react-dom | 19.2.4 | DOM rendering | Paired with react |
| typescript | 6.0.2 | Type safety | Matches API package; project constraint |
| @vitejs/plugin-react | 6.0.1 | Vite React plugin (Babel/SWC fast refresh) | Official Vite plugin for React |
| tailwindcss | 4.2.2 | Utility-first CSS | Locked decision; zero runtime overhead |
| @tanstack/react-query | 5.96.0 | Server state management | Locked decision; caching, loading states, mutations |
| react-router-dom | 7.13.2 | Client-side routing | Locked decision; nested routes for Circle detail tabs |
| react-hook-form | 7.72.0 | Form state management | Locked decision; minimal re-renders |
| zod | 4.3.6 | Schema validation | Locked decision; TypeScript-first validation |
| @hookform/resolvers | latest | Connects Zod to React Hook Form | Required glue package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Mutation error/success toasts (top-right, 5s) |
| lucide-react | 1.7.0 | Icons | Consistent icon set; used by shadcn/ui components |
| class-variance-authority | 0.7.1 | Component variant utility | Required by shadcn/ui |
| clsx | 2.1.1 | Conditional className helper | Required by shadcn/ui |
| tailwind-merge | 3.5.0 | Merges Tailwind class conflicts | Required by shadcn/ui cn() utility |

### shadcn/ui Components (install via CLI)
shadcn/ui is not an npm package — components are code-generated into `src/components/ui/`. Install via:
```bash
npx shadcn@latest init
npx shadcn@latest add button input form card badge tabs dialog toast
```

Components needed per screen:
- `button` — all action buttons
- `input`, `textarea`, `label` — all form fields
- `form` — React Hook Form integration wrapper
- `card` — circle/contribution/proposal list items
- `badge` — status chips (pending, verified, approved, etc.)
- `tabs` — Circle detail tabbed navigation
- `dialog` — confirm modals (verify, reject, vote, close)
- `select` — governance dropdowns
- `progress` — proof upload progress bar
- `separator` — layout dividers
- `avatar` — user display in member lists

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui | Chakra UI, MUI | shadcn locked in; no component library lock-in, full control of source |
| Sonner | React Hot Toast | Sonner is newer, better TypeScript, native Tailwind-compatible |
| fetch (api.ts) | axios | Fetch chosen in CONTEXT.md for smaller bundle; axios simpler interceptors |

### Installation
```bash
cd packages/web

# Initialize Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Core runtime deps
npm install @tanstack/react-query react-router-dom react-hook-form zod @hookform/resolvers sonner lucide-react clsx tailwind-merge class-variance-authority

# Tailwind CSS
npm install -D tailwindcss @tailwindcss/vite

# Initialize shadcn/ui (interactive CLI)
npx shadcn@latest init
```

**Version verification (registry-confirmed 2026-03-31):**
- vite: 8.0.3 (current)
- react: 19.2.4 (current)
- tailwindcss: 4.2.2 (current — uses CSS `@import "tailwindcss"` syntax, not PostCSS plugin)
- @tanstack/react-query: 5.96.0 (current)
- react-router-dom: 7.13.2 (current)

> **Tailwind v4 breaking change:** Tailwind CSS 4.x uses `@import "tailwindcss"` in CSS, and the Vite plugin is `@tailwindcss/vite` (not `tailwindcss/vite` or PostCSS). shadcn/ui v2+ supports Tailwind v4.

---

## Architecture Patterns

### Recommended Project Structure
```
packages/web/
├── src/
│   ├── api/
│   │   ├── client.ts          # Typed fetch wrapper; token refresh interceptor
│   │   └── types.ts           # API response types (mirroring API schema)
│   ├── components/
│   │   ├── ui/                # shadcn/ui generated components (DO NOT EDIT manually)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx  # Top nav + DEMO_MODE banner + page container
│   │   │   └── NavBar.tsx
│   │   ├── auth/
│   │   │   └── AuthGuard.tsx  # Redirect to /login if no token
│   │   └── shared/
│   │       ├── ErrorPage.tsx  # Full-page 404/403 state
│   │       ├── StatusBadge.tsx # Reusable status chip
│   │       └── LoadingSpinner.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx    # Token storage, user state, login/logout actions
│   ├── hooks/
│   │   ├── useAuth.ts         # Consume AuthContext
│   │   ├── useCircle.ts       # Typed TanStack Query hooks for circle data
│   │   └── useContributions.ts
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── circles/
│   │   │   ├── CirclesListPage.tsx
│   │   │   ├── NewCirclePage.tsx
│   │   │   └── CircleDetailPage.tsx   # Tabbed — Overview | Contributions | Proposals | Projects
│   │   ├── contributions/
│   │   │   └── NewContributionPage.tsx  # Form + proof upload flow
│   │   ├── proposals/
│   │   │   ├── NewProposalPage.tsx
│   │   │   └── ProposalDetailPage.tsx
│   │   ├── projects/
│   │   │   └── ProjectDetailPage.tsx
│   │   ├── PortfolioPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── admin/
│   │       └── AdminPage.tsx          # Tabbed — Pending | Members | Ledger | Activity
│   ├── router/
│   │   └── index.tsx          # All routes; AuthGuard wrapping protected routes
│   ├── lib/
│   │   └── utils.ts           # cn() helper from shadcn/ui
│   ├── main.tsx               # React 18 createRoot; QueryClient; RouterProvider
│   └── index.css              # Tailwind v4 @import
├── vite.config.ts
├── tailwind.config.ts         # May be empty in Tailwind v4 (CSS-first config)
├── tsconfig.json
└── package.json
```

### Pattern 1: Typed API Client with 401 Refresh Interceptor
**What:** A single `api.ts` module wrapping `fetch`. On 401, it calls POST /auth/refresh, updates localStorage, and retries the original request once.
**When to use:** All API calls in the app — never call fetch directly from components.

```typescript
// src/api/client.ts
const BASE = '/api/v1'

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, init, true)
    // refresh failed — clear auth and redirect
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json()
    throw body // shape: { error: { code, message, field, status } }
  }

  return res.json() as Promise<T>
}

async function tryRefresh(): Promise<boolean> {
  const rt = localStorage.getItem('refresh_token')
  if (!rt) return false
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
  if (!res.ok) return false
  const data = await res.json()
  localStorage.setItem('access_token', data.accessToken)
  localStorage.setItem('refresh_token', data.refreshToken)
  return true
}
```

### Pattern 2: TanStack Query v5 with Typed Query Hooks
**What:** Each data domain has a typed custom hook using `useQuery` / `useMutation`.
**When to use:** All server state — never use `useState` + `useEffect` for API data.

```typescript
// src/hooks/useContributions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useContributions(circleId: string, status?: string) {
  return useQuery({
    queryKey: ['contributions', circleId, status],
    queryFn: () => api.get<Contribution[]>(`/circles/${circleId}/contributions${status ? `?status=${status}` : ''}`),
  })
}

export function useVerifyContribution(circleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cid: string) => api.patch(`/circles/${circleId}/contributions/${cid}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions', circleId] })
      qc.invalidateQueries({ queryKey: ['treasury', circleId] })
    },
  })
}
```

### Pattern 3: Auth Context
**What:** React context holding user state (id, email, isGlobalAdmin, displayName), access token, and login/logout actions.
**When to use:** Wrap entire app; all components read via `useAuth()` hook.

```typescript
// src/contexts/AuthContext.tsx
type AuthState = {
  user: { id: string; email: string; isGlobalAdmin: boolean; displayName: string } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

On mount: if localStorage has `access_token`, call GET /auth/me to hydrate user state (handles page refresh).

### Pattern 4: Role-Gated Render
**What:** Conditional rendering based on membership role from GET /circles/:id response.
**When to use:** Every action button in Circle detail — verify, reject, close proposal, transition project.

```typescript
// In CircleDetailPage — role comes from the circle overview response
const isCircleAdmin = circle.myRole === 'creator' || circle.myRole === 'admin'

// Render verify button only for circle admins
{isCircleAdmin && (
  <Button onClick={() => verifyMutation.mutate(cid)}>Verify</Button>
)}
```

Note: `myRole` field name must be verified against the actual GET /circles/:id response. Read `circle.service.ts` `getCircleOverview()` to confirm the exact field.

### Pattern 5: React Hook Form + Zod
**What:** Zod schema defines validation; `zodResolver` passes it to `useForm`; errors from `formState.errors` are displayed inline.
**When to use:** All forms (signup, login, create circle, submit contribution, create proposal, etc.).

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
})

const form = useForm({ resolver: zodResolver(schema) })
```

### Pattern 6: DEMO_MODE Banner
**What:** On app startup, fetch GET /api/v1/config once. Store `demoMode` and `escrowLabel` in context or React Query. AppLayout renders persistent amber banner when `demoMode === true`.
**When to use:** AppLayout wraps every authenticated screen.

```typescript
// Query runs once; staleTime: Infinity (config never changes at runtime)
const { data: config } = useQuery({
  queryKey: ['config'],
  queryFn: () => api.get('/config'),
  staleTime: Infinity,
})

// In AppLayout:
{config?.demoMode && (
  <div className="bg-amber-400 text-amber-900 px-4 py-2 text-center text-sm font-medium">
    Demo Mode — No real funds. Governance is fully enforced.
  </div>
)}
```

### Pattern 7: Proof Upload (Three-Step)
**What:** Client validates file → POST /proof → PUT presigned URL directly → POST /proof/confirm.
**When to use:** NewContributionPage proof upload form.

```typescript
async function uploadProof(circleId: string, cid: string, file: File) {
  // Step 0: Client validation
  const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf']
  if (!ALLOWED.includes(file.type)) throw new Error('Invalid file type')
  if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds 10 MB')

  // Step 1: Get presigned URL
  const { uploadUrl, fileKey } = await api.post(
    `/circles/${circleId}/contributions/${cid}/proof`,
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size }
  )

  // Step 2: Upload directly to storage (bypasses API)
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  // Step 3: Confirm
  await api.post(`/circles/${circleId}/contributions/${cid}/proof/confirm`, {
    fileKey, fileName: file.name, mimeType: file.type, sizeBytes: file.size,
  })
}
```

### Anti-Patterns to Avoid
- **Calling fetch directly in components:** Always use `api.ts` client so token refresh happens consistently
- **Deriving balance from contributions in the client:** Always use GET /circles/:id/treasury; `balanceLabel` field contains the correct display string
- **Using `amount` instead of `requestedAmount` in proposal form:** The API schema requires `requestedAmount`
- **Using POST for verify/reject:** Both are PATCH endpoints
- **Counting votes or checking quorum in UI:** Server returns proposal status; display it, never compute it
- **Storing JWT in sessionStorage:** CONTEXT.md decision is localStorage for page-reload persistence
- **Using `update` as the field for project progress posts:** The API schema field is `content`

---

## API Contract Reference (from Route Source)

These field names are extracted from route schemas and service code — they are authoritative for form field names and API call construction.

### POST /api/v1/auth/signup
```typescript
{ email: string, password: string, displayName: string }
// Required: all three. `displayName` is required (not optional).
```

### POST /api/v1/circles
```typescript
{
  name: string,           // required, max 120
  goalAmount: number,     // required, >0
  description?: string,   // optional, max 2000
  governance?: {
    minContribution?: number,
    votingModel?: string,
    quorumPercent?: number,     // 1-100
    approvalPercent?: number,   // 1-100
    proposalDurationDays?: number,
    whoCanPropose?: 'member'|'contributor'|'creator'|'admin',
    requireProof?: boolean
  }
}
```

### POST /api/v1/circles/:id/contributions
```typescript
{ amount: number, note?: string }
```

### PATCH /api/v1/circles/:id/contributions/:cid/verify
No body required.

### PATCH /api/v1/circles/:id/contributions/:cid/reject
```typescript
{ reason: string }  // required, min 1, max 1000
```

### POST /api/v1/circles/:id/contributions/:cid/proof (get presigned URL)
```typescript
{ fileName: string, mimeType: string, sizeBytes: number }  // all required
```

### POST /api/v1/circles/:id/contributions/:cid/proof/confirm
```typescript
{ fileKey: string, fileName: string, mimeType: string, sizeBytes: number }  // all required
```

### GET /api/v1/circles/:id/treasury
Response: `{ circleId, balance, currency, balanceLabel }` — always display `balanceLabel`, not `balance`

### POST /api/v1/circles/:id/proposals
```typescript
{ title: string, description: string, requestedAmount: number }
// Note: field is requestedAmount, NOT amount
```

### POST /api/v1/circles/:id/proposals/:pid/vote
```typescript
{ vote: 'yes' | 'no' | 'abstain' }
```

### POST /api/v1/circles/:id/projects
```typescript
{ proposalId: string }  // must be a closed_passed proposal
```

### PATCH /api/v1/circles/:id/projects/:projId
```typescript
{ status: 'approved' | 'executing' | 'complete' | 'cancelled' }
```

### POST /api/v1/circles/:id/projects/:projId/updates
```typescript
{ content: string, percentComplete?: number }
// Note: field is `content`, NOT `update`
```

### GET /api/v1/portfolio
Direct endpoint (NOT `/me/portfolio`). Returns user's contributions across all circles.

### PATCH /api/v1/admin/members/:id/role
```typescript
{ isGlobalAdmin: boolean }
```

### API Error Shape (universal)
```typescript
{ error: { code: string, message: string, field: string | null, status: number } }
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validator functions | React Hook Form + Zod | Handles async, touched state, re-render optimization |
| Toast notifications | Custom toast component | Sonner | Accessibility, stacking, animation, dismiss handling |
| Accessible modals | Custom dialog with portal | shadcn/ui `Dialog` (Radix UI) | Focus trap, aria-modal, scroll lock, keyboard navigation |
| Date formatting | Custom date utils | `Intl.DateTimeFormat` (built-in) or `date-fns` | i18n-aware, no extra dependency needed for MVP |
| Loading spinners | CSS animation from scratch | shadcn/ui `Skeleton` or `lucide-react` `Loader2` icon | Consistent with design system |
| Tab URL state | Custom history manipulation | React Router `useSearchParams` | Handles back/forward, bookmark, SSR-safe |
| Query cache invalidation | Manual state updates after mutation | TanStack Query `invalidateQueries` | Handles race conditions, background refetch |
| File upload progress | XHR onprogress | Fetch with ReadableStream or XHR for progress | XHR required for upload progress (fetch does not expose upload progress in all browsers) |

**Key insight:** Radix UI/shadcn handles all the accessibility primitives that are deceptively complex (focus management, keyboard navigation, ARIA). Never build modals, dialogs, or dropdowns without it.

---

## Common Pitfalls

### Pitfall 1: Using POST for verify/reject contributions
**What goes wrong:** Frontend calls POST /verify — API returns 404 (route not found).
**Why it happens:** Inconsistency between REST convention (action routes often POST) and this API's actual implementation.
**How to avoid:** Both verify and reject are PATCH endpoints. Always reference the route source code.
**Warning signs:** 404 response from /verify with no error body.

### Pitfall 2: Missing `displayName` on signup
**What goes wrong:** API returns 422 VALIDATION_ERROR with `field: "displayName"`.
**Why it happens:** Signup schema requires `displayName`; UI built only with email + password fields.
**How to avoid:** Signup Zod schema must include `displayName: z.string().min(1).max(100)`.

### Pitfall 3: Using `amount` not `requestedAmount` in proposal form
**What goes wrong:** API returns 422 VALIDATION_ERROR — `requestedAmount` missing.
**Why it happens:** Natural intuition to name it `amount`; this API deliberately uses `requestedAmount`.
**How to avoid:** Proposal form Zod schema: `requestedAmount: z.number().positive()`.

### Pitfall 4: Displaying raw `balance` from treasury instead of `balanceLabel`
**What goes wrong:** In DEMO_MODE, balance shows as a bare number without "(simulated)" label.
**Why it happens:** Developer uses `treasury.balance` for display.
**How to avoid:** Always render `treasury.balanceLabel`. The API computes the correct display string including the "(simulated)" suffix in DEMO_MODE.

### Pitfall 5: Tailwind v4 config differences
**What goes wrong:** tailwind.config.js with `content:` array and `theme:` doesn't work; PostCSS plugin not found.
**Why it happens:** Tailwind v4 (current: 4.2.2) uses CSS-first configuration via `@import "tailwindcss"` and the `@tailwindcss/vite` Vite plugin, not the PostCSS plugin from v3.
**How to avoid:** Use `@tailwindcss/vite` in `vite.config.ts`. Add `@import "tailwindcss"` to `index.css`. shadcn/ui v2+ supports Tailwind v4.
**Warning signs:** `Cannot find module 'tailwindcss'` or PostCSS-related errors on build.

### Pitfall 6: Token refresh loop
**What goes wrong:** Infinite loop when refresh token is also expired — refreshing calls /auth/refresh, gets 401, retries refresh, etc.
**Why it happens:** Retry logic applies to all 401s including the refresh call itself.
**How to avoid:** The `retried = false` flag in the fetch client prevents retry on the second call. Also: the refresh call itself must not pass through the interceptor — call raw `fetch` directly, not `api.request`.

### Pitfall 7: Portfolio endpoint path
**What goes wrong:** 404 on portfolio load.
**Why it happens:** Developer assumes GET /api/v1/me/portfolio or /api/v1/user/portfolio.
**How to avoid:** Correct path is GET /api/v1/portfolio. Confirm from reporting.ts route registration.

### Pitfall 8: Project update field name
**What goes wrong:** API returns 422 — `content` field missing.
**Why it happens:** Developer names the textarea field `update` or `text`.
**How to avoid:** POST /projects/:projId/updates schema requires `content` (string) and optional `percentComplete` (integer 0-100).

### Pitfall 9: Circle detail role field
**What goes wrong:** `circle.myRole` is undefined; all admin actions hidden even for admins.
**Why it happens:** The exact field name for the authenticated user's role in GET /circles/:id response is unknown until `circle.service.ts` `getCircleOverview()` is inspected.
**How to avoid:** Before implementing role-gated UI, read `getCircleOverview()` in `packages/api/src/services/circle.service.ts` to confirm the exact response shape and field name for the current user's membership role. This is a REQUIRED pre-step for FE-04 and FE-06.

### Pitfall 10: shadcn/ui Form component requires FormField wrapper
**What goes wrong:** React Hook Form errors don't propagate to shadcn Input components.
**Why it happens:** shadcn Form components use a FormField context to connect to RHF's register/errors.
**How to avoid:** Always use `<FormField control={form.control} name="..." render={...}>` pattern. Never use bare `<Input {...register("field")} />` with shadcn Form.

---

## Code Examples

### QueryClient configuration (main.tsx)
```typescript
// Source: TanStack Query v5 official docs
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s default — good for community data
      retry: 1,
      refetchOnWindowFocus: false,  // avoid jarring refetches for this app type
    },
  },
})
```

### Error handling in mutations (toast pattern)
```typescript
// Source: TanStack Query v5 useMutation + Sonner
import { toast } from 'sonner'

const mutation = useMutation({
  mutationFn: (data) => api.post('/circles', data),
  onSuccess: () => {
    toast.success('Circle created')
    navigate('/circles')
  },
  onError: (err: ApiError) => {
    toast.error(err.error?.message ?? 'Something went wrong')
  },
})
```

### URL tab state with React Router
```typescript
// Source: React Router v6 docs
import { useSearchParams } from 'react-router-dom'

const [searchParams, setSearchParams] = useSearchParams()
const tab = searchParams.get('tab') ?? 'overview'

function setTab(t: string) {
  setSearchParams({ tab: t })
}
```

### Protected route guard
```typescript
// src/components/auth/AuthGuard.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
```

### Tailwind v4 Vite config
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 PostCSS plugin + tailwind.config.js | Tailwind v4 Vite plugin + CSS `@import` | Tailwind v4.0 (2025) | Config file mostly gone; simpler setup |
| React Router v5 `<Switch>` + `component` | React Router v6/v7 `<Routes>` + `element` | RR v6 (2021), v7 (2024) | Cleaner nested route composition |
| TanStack Query v4 `useQuery(key, fn)` | TanStack Query v5 `useQuery({ queryKey, queryFn })` | v5 (2023) | Object syntax only; `cacheTime` → `gcTime` |
| React 17 ReactDOM.render | React 18 createRoot | React 18 (2022) | Required for concurrent features |
| Class components | Functional components + hooks | React 16.8+ (2019) | No class components in this codebase |

**Deprecated/outdated:**
- `tailwind.config.js` `content:` array: replaced by automatic CSS scanning in v4 (though still works for custom overrides)
- TanStack Query v4 `cacheTime` option: renamed to `gcTime` in v5
- `useQuery(key, fn)` positional arguments: object syntax `useQuery({ queryKey, queryFn })` required in v5

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server, npm scripts | Yes | v25.6.1 | — |
| npm | Package installation | Yes | 11.11.0 | — |
| API server (port 3000) | All API calls during dev/test | Requires running | — | Start with `npm run dev` in api package |

**Missing dependencies with no fallback:**
- The API server must be running for the frontend to make real API calls in development. The Vite dev server should proxy `/api` to `http://localhost:3000`.

**Missing dependencies with fallback:**
- All npm packages are not yet installed — they must be installed as part of Wave 0 setup.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json`. Validation section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `packages/web/vitest.config.ts` — Wave 0 gap |
| Quick run command | `npm test -w packages/web -- --run` |
| Full suite command | `npm test -w packages/web` |

Note: The API package already uses Vitest 4.1.2. The web package must configure its own Vitest instance with jsdom environment.

### Required vitest.config.ts (Wave 0)
```typescript
// packages/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```typescript
// packages/web/src/test/setup.ts
import '@testing-library/jest-dom'
```

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FE-01 | Login form submits email+password, stores token | unit | `vitest run src/pages/auth/LoginPage.test.tsx` | Wave 0 |
| FE-01 | Signup form includes displayName field, posts correctly | unit | `vitest run src/pages/auth/SignupPage.test.tsx` | Wave 0 |
| FE-01 | 401 interceptor calls refresh and retries | unit | `vitest run src/api/client.test.ts` | Wave 0 |
| FE-02 | Dashboard renders circles, pending counts, activity | unit | `vitest run src/pages/DashboardPage.test.tsx` | Wave 0 |
| FE-03 | Circle list shows circles from API | unit | `vitest run src/pages/circles/CirclesListPage.test.tsx` | Wave 0 |
| FE-03 | Create circle form posts name + goalAmount | unit | `vitest run src/pages/circles/NewCirclePage.test.tsx` | Wave 0 |
| FE-04 | Circle detail renders 4 tabs; tab state in URL | unit | `vitest run src/pages/circles/CircleDetailPage.test.tsx` | Wave 0 |
| FE-04 | Each tab fetches correct data | unit | `vitest run src/pages/circles/CircleDetailPage.test.tsx` | Wave 0 |
| FE-05 | Contribution form rejects file > 10 MB before API call | unit | `vitest run src/pages/contributions/NewContributionPage.test.tsx` | Wave 0 |
| FE-05 | Proof upload three-step flow completes | unit | `vitest run src/pages/contributions/NewContributionPage.test.tsx` | Wave 0 |
| FE-06 | Verify button only visible to circle admin | unit | `vitest run src/pages/circles/CircleDetailPage.test.tsx` | Wave 0 |
| FE-06 | Verify uses PATCH; reject requires reason field | unit | `vitest run src/hooks/useContributions.test.ts` | Wave 0 |
| FE-07 | Proposal form uses requestedAmount field | unit | `vitest run src/pages/proposals/NewProposalPage.test.tsx` | Wave 0 |
| FE-07 | Vote widget shows yes/no/abstain; disables after vote | unit | `vitest run src/pages/proposals/ProposalDetailPage.test.tsx` | Wave 0 |
| FE-08 | Project stepper shows approved → executing → complete | unit | `vitest run src/pages/projects/ProjectDetailPage.test.tsx` | Wave 0 |
| FE-08 | INSUFFICIENT_TREASURY error shown inline | unit | `vitest run src/pages/projects/ProjectDetailPage.test.tsx` | Wave 0 |
| FE-09 | Portfolio page fetches /portfolio (not /me/portfolio) | unit | `vitest run src/pages/PortfolioPage.test.tsx` | Wave 0 |
| FE-10 | Admin panel not reachable for non-global-admin | unit | `vitest run src/pages/admin/AdminPage.test.tsx` | Wave 0 |
| FE-10 | Admin panel tabs: Pending, Members, Ledger, Activity | unit | `vitest run src/pages/admin/AdminPage.test.tsx` | Wave 0 |
| FE-11 | DEMO_MODE banner visible when demoMode=true | unit | `vitest run src/components/layout/AppLayout.test.tsx` | Wave 0 |
| FE-11 | Banner not present when demoMode=false | unit | `vitest run src/components/layout/AppLayout.test.tsx` | Wave 0 |
| FE-12 | Mutation error displays toast with error.message | unit | `vitest run src/api/client.test.ts` | Wave 0 |
| FE-12 | Form field error shows inline below correct field | unit | `vitest run src/pages/auth/SignupPage.test.tsx` | Wave 0 |

### MSW (Mock Service Worker) for API Mocking
All component tests should use MSW to intercept fetch calls. This keeps tests fast and isolated from the real API.

```typescript
// packages/web/src/test/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.get('/api/v1/config', () => HttpResponse.json({ demoMode: true, currency: 'USD', escrowLabel: 'Escrow (simulated)' })),
  // Add handlers per test file
)
```

MSW v2 uses `http.get/post/patch` (not `rest.get`) and `HttpResponse` (not `res/ctx`).

### Sampling Rate
- **Per task commit:** `npm test -w packages/web -- --run` (all tests, no watch)
- **Per wave merge:** Same — full suite must be green
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (must be created before implementation begins)
- [ ] `packages/web/vitest.config.ts` — Vitest + jsdom configuration
- [ ] `packages/web/src/test/setup.ts` — @testing-library/jest-dom imports
- [ ] `packages/web/src/test/server.ts` — MSW server setup for tests
- [ ] Framework installs: `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw jsdom -w packages/web`
- [ ] All `*.test.tsx` files listed in the test map above — one per screen/hook

---

## Open Questions

1. **Circle overview response shape — `myRole` field name**
   - What we know: GET /circles/:id calls `circleService.getCircleOverview()` which returns the membership role for the current user
   - What's unclear: The exact field name in the response (is it `myRole`, `role`, `membership.role`?) — needs `circle.service.ts` inspection
   - Recommendation: Read `packages/api/src/services/circle.service.ts` `getCircleOverview()` before implementing role-gated UI (FE-04, FE-06). This is a BLOCKING pre-step for the Circle Detail implementation wave.

2. **Vite proxy configuration for local development**
   - What we know: API runs on port 3000 (default Fastify); frontend Vite runs on a different port
   - What's unclear: The exact port the API uses in development
   - Recommendation: Add `server.proxy` in `vite.config.ts` to forward `/api` to `http://localhost:3000`; confirm by checking `packages/api/src/server.ts`

3. **Auth refresh token response field names**
   - What we know: POST /auth/refresh returns new tokens
   - What's unclear: Field names in the refresh response — `accessToken` + `refreshToken` is assumed, but needs verification from `packages/api/src/routes/auth/refresh.ts`
   - Recommendation: Read the refresh route before implementing the interceptor.

4. **List containers in admin PATCH /admin/members/:id/role**
   - What we know: The route requires `{ isGlobalAdmin: boolean }` body
   - What's unclear: What the response looks like after toggling — success message or updated user object
   - Recommendation: Low priority; can be resolved during implementation by checking `reporting.service.ts` `setGlobalAdmin()`.

---

## Sources

### Primary (HIGH confidence)
- Route source files read directly: `contributions.ts`, `proposals.ts`, `projects.ts`, `reporting.ts`, `circles.ts`, `auth/signup.ts`, `auth/me.ts` — all field names and HTTP methods verified from schema definitions
- Service source files: `contribution.service.ts`, `project.service.ts` — response shapes and treasury balance field confirmed
- `app.ts` — error handler shape `{ error: { code, message, field, status } }` confirmed
- npm registry (live query 2026-03-31): vite@8.0.3, react@19.2.4, tailwindcss@4.2.2, @tanstack/react-query@5.96.0, react-router-dom@7.13.2, react-hook-form@7.72.0, zod@4.3.6, vitest@4.1.2

### Secondary (MEDIUM confidence)
- Tailwind v4 configuration pattern: CSS `@import "tailwindcss"` + `@tailwindcss/vite` Vite plugin — consistent with official Tailwind v4 migration guide
- TanStack Query v5 object syntax `useQuery({ queryKey, queryFn })` — confirmed breaking change from v4
- MSW v2 `http.*` + `HttpResponse` API — confirmed breaking change from MSW v1 `rest.*`

### Tertiary (LOW confidence)
- shadcn/ui Tailwind v4 compatibility — stated as supported in shadcn docs but specific component behavior requires verification during initialization

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions registry-confirmed on research date
- Architecture: HIGH — derived directly from API route source code; field names are exact
- Pitfalls: HIGH — most extracted from actual API schemas; Tailwind v4 pattern from official migration docs
- Test patterns: MEDIUM — vitest + @testing-library/react + MSW combination is well established; specific wave 0 file list is prescriptive but adaptable

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable libraries; Tailwind v4 may have minor updates)
