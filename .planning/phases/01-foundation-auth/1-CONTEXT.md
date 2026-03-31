# Phase 1: Foundation & Auth — Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the monorepo, connect the database, and deliver JWT authentication end-to-end with refresh token rotation. No domain entities (circles, contributions, proposals) exist yet. This phase is backend-only — no frontend screens. The output is a runnable API that passes all auth success criteria and a DEMO-01 config endpoint.

</domain>

<decisions>
## Implementation Decisions

### Monorepo structure
- **D-01:** npm workspaces monorepo at repo root — `packages/api` and `packages/web` (web is empty scaffold in this phase)
- **D-02:** Root `package.json` with `"workspaces": ["packages/*"]`; shared TypeScript config at root
- **D-03:** `packages/api` is the only active package in Phase 1; `packages/web` is created but empty

### API framework
- **D-04:** Fastify (not Express, not NestJS) — TypeScript-native, schema validation built-in via JSON Schema / Zod, better performance
- **D-05:** `@fastify/jwt` for JWT handling on Fastify; `jose` or `jsonwebtoken` as underlying lib
- **D-06:** Fastify plugins for rate limiting (`@fastify/rate-limit`) and CORS (`@fastify/cors`)

### Database & ORM
- **D-07:** PostgreSQL 16 (Docker Compose for local dev)
- **D-08:** Prisma ORM — type-safe client, schema-first migrations, auto-generated types shared with frontend
- **D-09:** Prisma schema covers Phase 1 tables only: `users`, `refresh_tokens`
- **D-10:** DB user for app has no UPDATE/DELETE on `ledger_entries` (Phase 3 concern — note here so it's designed in from the start)

### Authentication
- **D-11:** Access token — HS256 JWT, 15-minute expiry, payload: `{ sub: userId, email, isGlobalAdmin, iat, exp }`
- **D-12:** Refresh token — HS256 JWT (separate secret), 30-day expiry, payload: `{ sub: userId, tokenFamily, iat, exp }`, stored as bcrypt hash in `refresh_tokens` table
- **D-13:** Token rotation on every refresh: new token issued, old token hash stored as revoked
- **D-14:** Token family reuse detection: if a revoked token in a family is presented again, revoke ALL tokens in that family (all sessions for that user) and return 401
- **D-15:** Logout revokes the presented refresh token (marks `revoked_at`); does NOT revoke the entire family
- **D-16:** Access token is NOT stored in DB — stateless; only refresh tokens are stored (hashed)

### Middleware chain
- **D-17:** `AuthGuard` as Fastify preHandler hook — verifies JWT signature, checks expiry, attaches `req.user = { id, email, isGlobalAdmin }` to request
- **D-18:** Unauthenticated requests to protected routes return `401 UNAUTHORIZED` using the canonical error format
- **D-19:** `CirclePermissionGuard` is scaffolded in Phase 1 as a placeholder (exported function that takes `requiredRole`) but not wired to any routes until Phase 2

### Error handling
- **D-20:** Global error handler returns the canonical JSON format from SYSTEM_DESIGN.md §19: `{ "error": { "code": "...", "message": "...", "field": null, "status": N } }`
- **D-21:** Validation errors (Fastify schema validation failures) are mapped to `VALIDATION_ERROR / 422` with `field` populated
- **D-22:** Unhandled errors return `500` with a generic message; full error + correlation ID logged server-side

### Config endpoint
- **D-23:** `GET /api/v1/config` is public (no auth required) — returns `{ demoMode: boolean, currency: "USD", escrowLabel: string }`
- **D-24:** `DEMO_MODE` env var drives `demoMode`; when true, `escrowLabel = "Simulated escrow — no real funds"`
- **D-25:** All routes are prefixed `/api/v1`

### Environment & local dev
- **D-26:** `docker-compose.yml` at repo root starts PostgreSQL 16 on port 5432
- **D-27:** `.env` at `packages/api` with `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DEMO_MODE`, `PORT=4000`
- **D-28:** `.env.example` committed to git; `.env` in `.gitignore`
- **D-29:** `npm run dev` at `packages/api` starts Fastify with hot reload (tsx watch or ts-node-dev)

### Testing
- **D-30:** Vitest for unit tests; `supertest` + Fastify test server for integration tests
- **D-31:** Tests cover: signup validation, login success/failure, token refresh, reuse detection, logout, /config

### Claude's Discretion
- Exact bcrypt cost factor for password hashing (12 is a sensible default)
- Correlation ID implementation (uuid v4 per request, logged with every error)
- Fastify plugin organization (separate plugin files per concern vs single plugin)
- Exact Prisma migration file naming convention
- Whether to use `zod` for runtime validation alongside Fastify's JSON Schema or lean on JSON Schema alone

</decisions>

<specifics>
## Specific Ideas

- The canonical error format from SYSTEM_DESIGN.md §19 must be followed exactly — all downstream code depends on it
- Token family revocation is the theft-detection mechanism; it must cause ALL active sessions for the user to be invalidated (not just the reused token)
- The `is_global_admin` flag in the JWT payload means role changes don't propagate to existing tokens until they expire (15 min lag is acceptable, document it)
- `DEMO_MODE` is a first-class citizen from Phase 1; the config endpoint is the single source of truth for the client

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### System specification
- `SYSTEM_DESIGN.md` §7 — Authentication & Authorization: JWT strategy, token payloads, expiry, refresh_tokens table schema, middleware chain
- `SYSTEM_DESIGN.md` §19 — Error Handling Strategy: canonical error format, error code catalog, transaction failure handling
- `SYSTEM_DESIGN.md` §15 — DEMO_MODE: behavior table, config endpoint response shape
- `SYSTEM_DESIGN.md` §16 — Security Model: threat model table, what admins can/cannot do

### Database schema
- `SYSTEM_DESIGN.md` §5 — `users` table and `refresh_tokens` table DDL (exact column names, types, constraints)

### API design
- `SYSTEM_DESIGN.md` §6 — Auth endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`

### Planning context
- `.planning/PROJECT.md` — Core value, key decisions, constraints
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-07, DEMO-01 (with traceability)
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria (5 criteria to verify against)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases follow

### Integration Points
- `packages/api` Fastify instance is the integration point for all Phase 2+ routes
- `AuthGuard` preHandler hook established here is reused by every subsequent phase
- `CirclePermissionGuard` placeholder established here is filled in Phase 2
- Prisma client instance established here is shared across all Phase 2+ services
- Global error handler format established here must not change in later phases

</code_context>

<deferred>
## Deferred Ideas

- `CirclePermissionGuard` full implementation — Phase 2 (circles must exist first)
- `LedgerService` and append-only DB protections — Phase 3
- Email verification on signup — v2 (out of scope for MVP)
- OAuth / magic link login — v2
- Redis session store / rate limit counters — v2 (in-memory rate limiting acceptable for MVP)
- Frontend auth screens — Phase 8

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-30*
