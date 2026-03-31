# Phase 8 — Frontend: Context & Decisions

**Mode:** --auto (all decisions auto-selected from API surface analysis)
**Date:** 2026-03-31
**Principle:** Build the UI around what is actually implemented in phases 1–7 — not a generic spec.

---

## API Surface (source of truth)

All 47 endpoints across 8 route files. Full URL map:

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me

GET    /api/v1/config                                           ← demoMode, currency, escrowLabel

GET    /api/v1/circles
POST   /api/v1/circles
GET    /api/v1/circles/:id
PATCH  /api/v1/circles/:id
POST   /api/v1/circles/:id/join
POST   /api/v1/circles/:id/leave
POST   /api/v1/circles/:id/close
GET    /api/v1/circles/:id/members
PATCH  /api/v1/circles/:id/members/:userId/role

POST   /api/v1/circles/:id/contributions
GET    /api/v1/circles/:id/contributions
GET    /api/v1/circles/:id/contributions/:cid
PATCH  /api/v1/circles/:id/contributions/:cid/verify          ← PATCH, not POST
PATCH  /api/v1/circles/:id/contributions/:cid/reject
POST   /api/v1/circles/:id/contributions/:cid/proof           ← get presigned upload URL
POST   /api/v1/circles/:id/contributions/:cid/proof/confirm   ← confirm after upload
GET    /api/v1/circles/:id/contributions/:cid/proof/:pid/view ← admin only
GET    /api/v1/circles/:id/treasury
GET    /api/v1/circles/:id/ledger

POST   /api/v1/circles/:id/proposals
GET    /api/v1/circles/:id/proposals
GET    /api/v1/circles/:id/proposals/:pid
POST   /api/v1/circles/:id/proposals/:pid/vote
POST   /api/v1/circles/:id/proposals/:pid/close
DELETE /api/v1/circles/:id/proposals/:pid

POST   /api/v1/circles/:id/projects
GET    /api/v1/circles/:id/projects
GET    /api/v1/circles/:id/projects/:projId
PATCH  /api/v1/circles/:id/projects/:projId                   ← status: approved|executing|complete|cancelled
POST   /api/v1/circles/:id/projects/:projId/updates
GET    /api/v1/circles/:id/projects/:projId/updates

GET    /api/v1/portfolio
GET    /api/v1/portfolio/summary
GET    /api/v1/dashboard

GET    /api/v1/admin/contributions/pending                     ← global admin only
GET    /api/v1/admin/members
PATCH  /api/v1/admin/members/:id/role
GET    /api/v1/admin/ledger
GET    /api/v1/admin/activity
```

---

## Decisions

### 1. Stack [auto: recommended]
- **Framework**: React 18 + TypeScript (already in project constraints)
- **Build**: Vite — fastest dev server, native ESM, optimal for SPA
- **Styling**: Tailwind CSS — utility-first, zero runtime, consistent design tokens
- **Components**: shadcn/ui — accessible Radix UI primitives, customizable, excellent for dashboard apps, no component lock-in
- **Data fetching**: TanStack Query v5 — server state management, caching, mutation handling, loading/error states out of the box
- **Routing**: React Router v6 — nested routes work perfectly for Circle detail tabs
- **Forms**: React Hook Form + Zod — lightweight, TypeScript-first, no re-render hell

### 2. Auth Token Storage [auto: recommended]
- Access token: stored in React context (memory) + `localStorage` for page-reload persistence
- Refresh token: `localStorage` (MVP pragmatic; DEMO_MODE only, no real funds at risk)
- Token refresh: axios/fetch interceptor — on 401, call `POST /auth/refresh`, retry original request
- On logout: call `POST /auth/logout`, clear localStorage, redirect to `/login`
- Protected routes: route guard component that checks auth context, redirects to `/login` if missing

### 3. Layout [auto: warm & community-first + inline admin]
- **Visual style**: Warm & community-first — warm neutrals, earthy green primary (`#3d6b4f` range), amber accents. Reflects "Mukwano = friend" and diaspora community mission. Not corporate-blue fintech.
- **Top navigation bar**: Logo (Mukwano wordmark) | Circles | Portfolio | (Admin if isGlobalAdmin) | User avatar/menu (right)
- **No sidebar**: Top nav appropriate for a community platform
- **DEMO_MODE banner**: Persistent amber bar directly below nav when `demoMode=true`. Text: "Demo Mode — No real funds. Governance is fully enforced." Never dismissible.
- **Page max-width**: 1200px centered, comfortable padding on mobile
- **Admin actions**: Inline — verify/reject/close/transition buttons appear next to each item for admins. Members see the same list without action buttons. No separate admin tab within Circle detail.

### 4. Screen Map [auto: derived from API]

```
/                       → redirect: /dashboard (auth) or /login (no auth)
/login                  → Login form
/signup                 → Signup form

/dashboard              → GET /dashboard — circles summary, pending counts, activity feed

/circles                → GET /circles — list all circles + "Create Circle" button
/circles/new            → POST /circles form (name, goalAmount)
/circles/:id            → Circle detail — tabbed: Overview | Contributions | Proposals | Projects
  ?tab=overview         →   GET /circles/:id + treasury + ledger (admin)
  ?tab=contributions    →   GET /circles/:id/contributions — list; admin sees verify/reject actions
  ?tab=proposals        →   GET /circles/:id/proposals — list; open proposals show vote button
  ?tab=projects         →   GET /circles/:id/projects — list with status badges

/circles/:id/contributions/new       → POST /circles/:id/contributions + proof upload flow
/circles/:id/proposals/new           → POST /circles/:id/proposals
/circles/:id/proposals/:pid          → GET /circles/:id/proposals/:pid — detail + vote widget
/circles/:id/projects/:projId        → GET /circles/:id/projects/:projId — detail + updates timeline

/portfolio              → GET /portfolio + GET /portfolio/summary

/admin                  → isGlobalAdmin only; tabs: Pending | Members | Ledger | Activity
  ?tab=pending          →   GET /admin/contributions/pending
  ?tab=members          →   GET /admin/members
  ?tab=ledger           →   GET /admin/ledger
  ?tab=activity         →   GET /admin/activity

/profile                → GET /me + PATCH /me (display name update)
```

### 5. Data Fetching Patterns [auto: recommended]
- All API calls through a single typed `api.ts` client (fetch-based, not axios — smaller bundle)
- `queryKey` conventions: `['circles']`, `['circle', id]`, `['contributions', circleId]`, etc.
- Mutations trigger cache invalidation on success: verify contribution → invalidate `['contributions', circleId]` + `['treasury', circleId]`
- Token refresh: request interceptor in `api.ts` — catches 401, refreshes, retries once

### 6. Error Display [auto: recommended]
- API error shape: `{ error: { code, message, field, status } }`
- **Mutations** (POST/PATCH/DELETE): toast notification (top-right, auto-dismiss 5s)
- **Form validation** (field errors): inline below the relevant field using `error.field`
- **Page-level errors** (404, 403 on load): full-page error state with message + back button
- **Network errors**: toast with retry option
- Never show raw JSON or stack traces

### 7. Proof Upload Flow [auto: derived from API]
Two-step presigned flow:
1. `POST /circles/:id/contributions/:cid/proof` → get `{ uploadUrl, fileKey, expiresInSeconds }`
2. `PUT uploadUrl` with raw file body (Content-Type: file's MIME type) — progress bar shown
3. `POST /circles/:id/contributions/:cid/proof/confirm` with `{ fileKey, fileName, mimeType, sizeBytes }`
- Client validates: file size ≤ 10MB, MIME ∈ {image/jpeg, image/png, application/pdf} before step 1

### 8. Role-Gated UI [auto: from API role enforcement]
- All admin actions (verify, reject, close proposal, transition project, create project) rendered only when user's role ∈ `{creator, admin}` on that circle
- Global admin panel link shown only when `isGlobalAdmin: true` from JWT
- Role is read from GET /circles/:id/members — find the entry where `userId === currentUser.id`, read its `role` field. NOTE: GET /circles/:id does NOT return the user's membership role (getCircleOverview() only returns circle + governanceConfig)
- Backend is authoritative — UI gates are UX convenience only, not security

### 9. Circle Detail Tabs [auto: recommended]
- Tab state via URL query param `?tab=overview|contributions|proposals|projects`
- Each tab independently fetches its data (TanStack Query — cached after first load)
- Default tab: `overview`
- Tab badge counts: Contributions tab shows pending count (admin only), Proposals tab shows open count

### 10. Project Lifecycle UI [auto: from API]
- Status transitions displayed as a stepper: `approved → executing → complete`
- Admin-only "Transition" button appears for valid next state (approved→executing, executing→complete)
- `executing` transition shows treasury balance check — if insufficient, shows INSUFFICIENT_TREASURY error inline
- Progress updates shown as a chronological timeline below the stepper

---

## API Field Notes (learned from E2E — critical for frontend)

- Signup requires `displayName` (not just email + password)
- Circle creation requires `goalAmount` (number)
- Contribution verify: `PATCH` not `POST`
- Proposal creation: `requestedAmount` not `amount`
- Project update body: `content` (not `update`)
- Treasury response: `{ circleId, balance, currency, balanceLabel }` — show `balanceLabel` not raw "balance"
- Proposal vote: `{ vote: "yes" | "no" | "abstain" }`
- Project status PATCH: `{ status: "approved" | "executing" | "complete" | "cancelled" }`

---

## Deferred Ideas

- Dark mode — defer to v2
- Real-time updates (WebSocket) — defer to v2 (polling acceptable for MVP)
- Circle search/filter — defer to v2
- Notification center / notification bell — defer to v2
- Mobile native app — out of scope (web only per constraints)

---

## Next Steps

→ `gsd:plan-phase 8` — generate execution plans from this context
