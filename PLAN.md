# Mukwano Implementation Plan — April 2026

## What Already Exists (Key Audit Findings)

- Email verification: **fully implemented** (Resend, tokens, endpoints)
- Admin dashboard: exists but lacks audit logs, Circle/Proposal CRUD
- Portfolio analytics: **impact score exists** (weighted formula, time-series)
- Onboarding countries: only 8 African home countries — no diaspora host countries (USA, UK, etc.)
- Community news & trending Africa: **100% hardcoded** — no live API
- Conversations/group chat: **does not exist**
- Phone verification: **does not exist** (no field in schema, no SMS provider)
- Committees: **do not exist**
- Currency converter: **does not exist**
- 

---

## P0 — Foundational (Do First)

### P0.1 — Onboarding: Make sure that the Onboarding is required  under all circumstances , the onboarding should come after the full email and phone verification has happened 

### P0.2 — Diaspora Host Country Expansion `M`
**Schema change required:** Add `residenceCountry String?` to `User` (separate from the existing `country` field which means "African investment target"). Add `DIASPORA_HOST_COUNTRY_NAMES` const to `circle-choices.ts`. Top countries: USA, UK, Germany, France, Canada, Netherlands, UAE, Saudi Arabia, Australia, Sweden, Norway.

### P0.3 — USA State Sub-Selection `M`
When user picks USA as residence, show a state picker. If they're the only person from that state, show "Explore other Circles near you" prompt. Store as `residenceRegion` field or encode as `US-CA`.

---

## P1 — High Value Features

### P1.1 — Live News API `M`
Replace hardcoded `exploreEditorialData.ts` with server-side fetch + 15-min cache. **Recommended:** The Guardian API (free, strong Africa coverage, no production-tier block unlike NewsAPI.org). New route: `GET /api/v1/news/community` and `/news/trending`.

### P1.2 — Top Circles Ranking `M`
No schema change. New scoring formula in `reporting.service.ts`:
```
score = 0.35*(verifiedBalance/goal) + 0.15*log(members+1)
      + 0.20*(passedProposals/total) + 0.20*(completedProjects/total)
      + 0.10*recencyDecay(lastActivity)
```
New endpoint: `GET /api/v1/circles/top?limit=10`. Surfaced on Explore page.

### P1.3 — Invitations / Share `M`
Schema: new `Invitation` model (token, circleId, expiresAt). Routes: `POST /circles/:id/invitations`, `GET /invitations/:token`. Web: "Share Circle" button copies link; signup flow reads `?invite=TOKEN` and auto-submits join request.

### P1.4 — Admin Dashboard: CRUD + Audit Logs `M-L`
- **4a** (M): Admin CRUD on Circles and Proposals (disable/delete)
- **4b** (L): New `AuditLog` schema model — write at mutation time in service layer. Replace in-memory activity synthesis. No backfill — logs go forward only.
- **4c** (S): Surface "Promote to Admin" in Circle detail page for creators (role endpoint already exists)

### P1.5 — Quorum / Committees `L`
- **5a** (M): Admin can add member directly by email — `POST /circles/:id/members` lookup by email, create membership
- **5b** (L): New `Committee` + `CommitteeMembership` schema models. CRUD routes. Committees tab in Circle detail.
- **5c** (M): UI treatment for quorum-met state — surface a clear notification and separate Conversations from Proposals page

### P1.6 — Conversations / Group Chat `L`
New `Message` model (circleId, committeeId?, content, parentId? for threads). New routes. New "Conversations" tab in Circle detail. **v1 uses polling at 5-10s intervals** (not WebSocket) — appropriate for governance discussions, not consumer chat.

---

## P2 — Nice-to-Have

| Feature | Complexity | External API |
|---|---|---|
| Phone OTP verification | L | Africa's Talking (preferred over Twilio for African numbers) |
| Currency converter | M | Open Exchange Rates (free tier, 60-min cache) |
| Email verification banner | S | None (resend endpoint already exists) |
| Social media setup | Non-engineering | LinkedIn, Instagram, Facebook, Google Workspace |

---

## Architectural Decisions to Make Upfront

1. **`user.country` semantics** — Add `residenceCountry` as a separate field. `country` stays as "African investment target." This avoids breaking portfolio analytics.
2. **Chat: polling vs WebSocket** — Use polling for v1. Design `Message` model to support WebSocket upgrade later (don't build "typing indicators").
3. **News API** — Use The Guardian API (free, no production block). NewsAPI.org's free tier blocks non-localhost requests.
4. **SMS provider** — Africa's Talking for African numbers (cheaper, local shortcodes). Twilio as fallback for diaspora host country numbers.
5. **Audit log** — Write-at-mutation-time in service layer. No backfill. Historical pre-launch activity won't appear — accept this.
6. **Country constants** — `ONBOARDING_COUNTRY_NAMES` is currently duplicated between API (`circle-choices.ts`) and web. This is a risk. Consider a `@mukwano/shared` workspace package before adding more enums.

---

## Recommended Sprint Order

| Sprint | Work |
|---|---|

| 1 | P0.2 + P0.3 (diaspora countries + USA states) |
| 2 | P1.1 (News API) + P1.2 (Top Circles ranking) |
| 3 | P1.3 (Invitations / Share) |
| 4 | P1.4a/4c (Admin CRUD + Promote to Admin UX) |
| 5 | P1.4b (Audit Logs) + P1.5a (Add member by email) |
| 6–7 | P1.5b/5c (Committees) + P1.6 (Conversations) |
| 8 | P2.1 (Phone verification) |
| 9 | P2.2 (Currency converter) |
| Parallel | P2.4 Social media (non-engineering track) |

---

**Total schema migrations required:** 5 (residenceCountry, Invitation, AuditLog, Committee+CommitteeMembership, Message, PhoneToken)

---

---

# Pre-Production Remediation Plan — "Must Fix Before Real Money"

> Separate track from feature roadmap above. These are correctness, security, and financial-integrity items
> that must be resolved before the platform handles real funds or real users.

---

## Phase 1 — Security Foundation
**Gate: Before any external user touches the system.**
*All items create direct account-level risk if left open.*

### 1.1 — Server-side block for unverified emails (item 3)
Add `requireEmailVerified` Fastify middleware. Apply to every route that mutates contributions, votes, proposals, and transfers. Return `403 EMAIL_UNVERIFIED` with a `resend_url` in the body. The check reads `user.emailVerifiedAt` from the DB, not just the JWT claim.

### 1.2 — Password change revokes sessions (item 6)
On successful `POST /auth/password`, call `revokeAllRefreshTokens(userId)` (the family-rotation function already exists) and issue a fresh token pair in the response. Write an integration test: change password → old refresh token returns 401.

### 1.3 — Account lockout / failed-login protection (item 7)
Track failed attempts in a `login_attempts` table or Redis counter keyed by `(email_hash, ip)`. Policy:
- 5 failures → 15 s back-off
- 8 failures → 5 min back-off
- 10 failures → soft lock + email alert to account owner
- Reset counter on successful login

### 1.4 — Safe account deactivation (item 9)
Replace any hard `DELETE` on User with:
- `deactivated_at TIMESTAMPTZ` column + `is_active` computed flag
- Auth layer blocks `deactivated` accounts at login
- Ledger entries, memberships, and votes are retained (append-only constraint is preserved)
- 30-day reactivation window via email token before data is anonymized

### 1.5 — Input sanitization layer (item 11)
Add a Fastify `preHandler` plugin using `sanitize-html` (server-side). Define per-field allowlists:
- `name`, `bio`, `description`: text only, no HTML
- `proof_url`: URL validation only
Apply to all `POST`/`PATCH` bodies that write user-supplied strings to the DB. Block merge if a field bypass is found in tests.

### 1.6 — MFA / step-up auth for high-risk actions (item 8)
Phase 1 minimum: TOTP (RFC 6238) via `otplib`.
- Protect: fund disbursement, adding/changing bank account, email/password change
- Step-up issues a short-lived (5 min) signed `step_up` claim in the JWT
- If `step_up` claim is absent or expired on a protected route → 403 with `{ action: "step_up_required" }`
- UI prompts TOTP entry, posts to `POST /auth/step-up`, receives upgraded token

**Phase 1 exit criteria:** All 6 items pass integration tests; CI blocks merge on failure.

---

## Phase 2 — Financial Integrity
**Gate: Before real money moves.**

### 2.1 — Idempotency keys on financial mutations (item 5)
Accept `Idempotency-Key: <uuid-v4>` header on:
- `POST /contributions`
- `POST /disbursements`
- `POST /transfers`

Schema: `idempotency_keys (key, user_id, endpoint, response_body JSONB, created_at)` with a 24-hour TTL (cron cleanup or `created_at < now() - interval '24h'`). On replay: return cached `response_body` with original status code. On collision (same key, different user): 422.

### 2.2 — Proof upload pipeline (item 2)
Fix both demo and prod paths:
- Server generates a pre-signed S3/GCS URL (`PUT`, 15-min expiry); client uploads directly
- On upload completion, client calls `POST /proposals/:id/proof { proof_url }`
- Server validates URL is within the allowed bucket prefix, runs async virus scan hook (ClamAV or cloud equivalent), then sets `proof_status = "accepted"` or `"rejected"`
- Store `proof_url`, `proof_uploaded_at`, `proof_mime_type`, `proof_status` on the proposal

### 2.3 — Automated proposal deadline auto-close (item 4)
Add a `pg-boss` or `BullMQ` job scheduled at `proposal.voting_deadline`:
- Job calls the same service function as manual close (vote count + quorum check → status transition)
- On `approved`: trigger disbursement flow
- On `rejected`: emit rejection notification to proposer
- Job is idempotent: if proposal is already closed, exit cleanly
- Integration test: create proposal with deadline 2 seconds away, assert status transitions correctly

### 2.4 — Real payment / storage / notification integrations (item 1)
Design all three behind interface + adapter pattern so `DEMO_MODE` env var swaps adapters cleanly.

**Payments:** `PaymentGateway` interface → `StripeAdapter` (card) + `FlutterwaveAdapter` (mobile money Africa). Demo mode: `SimulatedPaymentAdapter` (existing logic).

**Storage:** `StorageService` interface → `S3Adapter` (AWS SDK v3). Demo mode: local disk adapter (existing).

**Notifications:** `NotificationService` interface → `ResendAdapter` (transactional email) + `OneSignalAdapter` (push). Demo mode: console-log adapter.

Each adapter is injected via DI (Fastify plugin). Staging uses real Stripe test-mode keys.

**Phase 2 exit criteria:** Payment round-trip passes with real Stripe test cards in staging; proof upload/review flow unblocked; deadline job fires correctly in integration tests.

---

## Phase 3 — Observability & Quality Gates
**Gate: Before Phase 2 goes live.**
*You cannot safely run financial infrastructure without visibility.*

**Status: implemented in repo (Apr 2026).**

### 3.1 — Error monitoring / alerting (item 10) — **done**
- Sentry: `@sentry/node` in API — `initApiSentry()` in `server.ts` after dotenv; no-op if `SENTRY_DSN` unset
- `captureHttpException` on 500 responses in `app.setErrorHandler`
- `captureFinancialException` in financial/payment-adjacent `.catch` paths: `idempotency` store, contribution/project notification follow-ups, `deadline-cron`, Stripe webhook handler
- Tags: `financial`, `financial.operation` for Sentry issue alerts (configure in Sentry: alert on `tag:financial` or `financial.*`)
- **Alert rules (Sentry product UI):** create alert for error-rate spike and for first-seen issues where `financial` tag is set (replaces a fixed `financial.*` string tag name)
- `GET /healthz` (root) → `{ db: "ok"|"error", queue: number, backup_last_verified: string|null }` — DB liveness via `SELECT 1`; `queue` from `QUEUE_DEPTH` / `0`; `backup_last_verified` from `BACKUP_LAST_VERIFIED_ISO` (ops)

### 3.2 — Unit-test CI gate (item 12) — **done**
- Root: `npm run typecheck` (API + web), `npm run test:unit` (API + web Vitest), `npm run test:unit:coverage` (API coverage report to `packages/api/coverage/`)
- API `vitest.config` collects coverage for `src/services/**` (no hard CI threshold until integration suite is fully green; **policy target remains 80%** on that glob)
- GitHub Actions (`.github/workflows/e2e.yml` → workflow **CI**): `quality` job runs `typecheck` + `test:unit` → `playwright` job runs after `quality` succeeds
- `npm run test:unit` (API) runs `vitest run test/unit` only; full API `vitest run` (integration + e2e-style HTTP tests) is `npm -w @mukwano/api run test:all`
- Targeted unit tests: `test/unit/**` (including `healthz`, services, observability) — add more service mocks over time to approach 80%

**Phase 3 exit criteria:** (1) Set `SENTRY_DSN` / `VITE_SENTRY_DSN` in staging and confirm events. (2) Open PR: `quality` job must pass. (3) Optionally raise Vitest `coverage.thresholds` once full API test suite passes.

---

## Phase 4 — API & Data Completeness
**Gate: Before public launch.**

### 4.1 — Pagination on list endpoints (item 13)
Implement cursor-based pagination (`after` cursor + `limit`) on:
`/circles`, `/proposals`, `/contributions`, `/ledger-entries`, `/members`

Response shape: `{ data: T[], nextCursor: string | null, hasMore: boolean }`

Add compound indexes `(created_at, id)` on each paginated table for deterministic ordering.

### 4.2 — Explore search / filter / sort / pagination (item 14)
`GET /explore/circles?q=&country=&sort=recent|members|funded&after=&limit=`
- Full-text: `pg_trgm` GIN index on `name || ' ' || description`; fallback `ILIKE` if extension unavailable
- Filter: `country`, `is_public = true`
- Sort: `recent` (created_at desc), `members` (member count desc), `funded` (balance desc)
- Wire filters and pagination to existing Explore UI components

### 4.3 — Multi-currency support (item 15)
- Add `currency CHAR(3)` column to `contributions` and `ledger_entries` (default `'USD'` to preserve existing data)
- Contribution creation accepts `currency` from the user's profile `defaultCurrency` (derive from `residenceCountry`)
- Store exchange-rate snapshot at contribution time (use existing exchange-rate infrastructure)
- Circle-level `reporting_currency` setting; ledger display converts using stored snapshots
- No retroactive conversion of historical entries

### 4.4 — Privacy toggle persistence (item 16)
- Add `is_public BOOLEAN DEFAULT false` to `circles` table
- `GET /explore` only returns `is_public = true` circles
- `GET /circles/:id` enforces members-only guard for private circles
- `PATCH /circles/:id { is_public }` is restricted to circle admin role
- Wire existing UI toggle to this endpoint

**Phase 4 exit criteria:** All four items have integration tests; Explore returns paginated filterable results; contributions store currency.

---

## Phase 5 — User Growth & UX Polish
**Gate: Before marketing/growth push.**

### 5.1 — Invite system (item 17)
- `circles.invite_code` — 8-char alphanumeric, unique, regeneratable by admin
- `GET /circles/join/:code` — returns circle preview (name, member count, goal) without auth
- `POST /circles/join/:code` — authenticated; respects capacity and privacy rules; idempotent
- Shareable link: `https://app.mukwano.com/join/:code`
- "Regenerate invite code" action in circle admin panel

### 5.2 — Proof review / view UX (item 18)
- In proposal detail: show proof attachment with lightbox (images) / PDF embed (documents)
- Admin review panel: approve / reject buttons, required rejection reason field
- On decision: notify proposer via `NotificationService` (email + push)
- Rejection reason stored on proposal for audit

### 5.3 — Dashboard "New Contribution" CTA (item 19)
- Audit the broken route; fix to navigate to the circle-specific contribution flow with circle pre-selected
- Add an E2E Playwright test: click CTA → contribution modal opens for correct circle

### 5.4 — CSP env-configurable (item 20)
- Move CSP header construction to `packages/api/src/config/csp.ts`
- Read `CSP_SCRIPT_SRC`, `CSP_CONNECT_SRC`, `CSP_IMG_SRC` from env
- Ship three presets: `development` (relaxed), `staging` (near-production), `production` (strict)
- Preset selected by `NODE_ENV`; individual directives overridable per-env

**Phase 5 exit criteria:** Invite round-trip tested; proof viewer renders in screenshot test; dashboard CTA E2E passes; CSP parameterized.

---

## Phase 6 — Scale & Ops Readiness
**Gate: Before scaling to >100 active circles.**

### 6.1 — Session / device management (item 22)
- `sessions` table: `(id, user_id, refresh_token_hash, user_agent, ip, created_at, last_used_at, revoked_at)`
- `GET /auth/sessions` — returns active sessions for current user
- `DELETE /auth/sessions/:id` — self-revoke; admin can revoke any session for a given user
- Account settings UI: "Active Sessions" list with device name, last seen, revoke button

### 6.2 — Governance anomaly observability (item 21)
- Emit structured log events at: vote count transitions, quorum events, disbursement approvals, proposal status changes
- Ship to log aggregator (Datadog / Loki / CloudWatch Logs)
- One dashboard: proposals-by-status over time, vote participation rate, disbursement success/failure rate, balance-mutation anomalies

### 6.3 — External provider side-effect isolation (item 23)
- Outbox pattern: write intent to `outbox_events (id, type, payload JSONB, status, attempts, next_retry_at, created_at)` before calling external provider
- Worker processes `outbox_events` with exponential back-off (3 retries then dead-letter)
- Dead-letter events trigger Sentry alert + Slack/email notification to ops
- Prevents partial state if API crashes mid-payment or mid-email

### 6.4 — Backup / restore validation (item 24)
- Daily `pg_dump` to encrypted S3 bucket (server-side encryption, versioning enabled)
- Weekly automated restore drill to staging: `pg_restore` → smoke-test suite
- `GET /healthz` includes `backup_last_verified: iso_date`
- `docs/runbook-recovery.md` documenting RPO/RTO targets and step-by-step restore procedure

**Phase 6 exit criteria:** Session self-revoke works; governance events appear in observability dashboard; outbox tests cover retry + dead-letter; restore drill passes in CI on weekly schedule.

---

## Remediation Summary Table

| Phase | Focus | Items | Gate |
|-------|-------|-------|------|
| 1 | Security Foundation | 3, 6, 7, 9, 11, 8 | Any external user |
| 2 | Financial Integrity | 5, 2, 4, 1 | Real money |
| 3 | Observability & Testing | 10, 12 | Phase 2 go-live |
| 4 | API & Data Completeness | 13, 14, 15, 16 | Public launch |
| 5 | User Growth & UX | 17, 18, 19, 20 | Marketing push |
| 6 | Scale & Ops | 22, 21, 23, 24 | >100 active circles |
