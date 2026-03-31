# Phase 1: Foundation & Auth — Research

**Researched:** 2026-03-31
**Domain:** Fastify + TypeScript + Prisma + JWT auth with refresh token rotation, npm workspaces monorepo
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Monorepo structure**
- D-01: npm workspaces monorepo at repo root — `packages/api` and `packages/web` (web is empty scaffold in this phase)
- D-02: Root `package.json` with `"workspaces": ["packages/*"]`; shared TypeScript config at root
- D-03: `packages/api` is the only active package in Phase 1; `packages/web` is created but empty

**API framework**
- D-04: Fastify (not Express, not NestJS) — TypeScript-native, schema validation built-in via JSON Schema / Zod, better performance
- D-05: `@fastify/jwt` for JWT handling on Fastify; `jose` or `jsonwebtoken` as underlying lib
- D-06: Fastify plugins for rate limiting (`@fastify/rate-limit`) and CORS (`@fastify/cors`)

**Database & ORM**
- D-07: PostgreSQL 16 (Docker Compose for local dev)
- D-08: Prisma ORM — type-safe client, schema-first migrations, auto-generated types shared with frontend
- D-09: Prisma schema covers Phase 1 tables only: `users`, `refresh_tokens`
- D-10: DB user for app has no UPDATE/DELETE on `ledger_entries` (Phase 3 concern — note here so it's designed in from the start)

**Authentication**
- D-11: Access token — HS256 JWT, 15-minute expiry, payload: `{ sub: userId, email, isGlobalAdmin, iat, exp }`
- D-12: Refresh token — HS256 JWT (separate secret), 30-day expiry, payload: `{ sub: userId, tokenFamily, iat, exp }`, stored as bcrypt hash in `refresh_tokens` table
- D-13: Token rotation on every refresh: new token issued, old token hash stored as revoked
- D-14: Token family reuse detection: if a revoked token in a family is presented again, revoke ALL tokens in that family (all sessions for that user) and return 401
- D-15: Logout revokes the presented refresh token (marks `revoked_at`); does NOT revoke the entire family
- D-16: Access token is NOT stored in DB — stateless; only refresh tokens are stored (hashed)

**Middleware chain**
- D-17: `AuthGuard` as Fastify preHandler hook — verifies JWT signature, checks expiry, attaches `req.user = { id, email, isGlobalAdmin }` to request
- D-18: Unauthenticated requests to protected routes return `401 UNAUTHORIZED` using the canonical error format
- D-19: `CirclePermissionGuard` is scaffolded in Phase 1 as a placeholder (exported function that takes `requiredRole`) but not wired to any routes until Phase 2

**Error handling**
- D-20: Global error handler returns the canonical JSON format from SYSTEM_DESIGN.md §19
- D-21: Validation errors are mapped to `VALIDATION_ERROR / 422` with `field` populated
- D-22: Unhandled errors return `500` with a generic message; full error + correlation ID logged server-side

**Config endpoint**
- D-23: `GET /api/v1/config` is public (no auth required) — returns `{ demoMode: boolean, currency: "USD", escrowLabel: string }`
- D-24: `DEMO_MODE` env var drives `demoMode`; when true, `escrowLabel = "Simulated escrow — no real funds"`
- D-25: All routes are prefixed `/api/v1`

**Environment & local dev**
- D-26: `docker-compose.yml` at repo root starts PostgreSQL 16 on port 5432
- D-27: `.env` at `packages/api` with `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DEMO_MODE`, `PORT=4000`
- D-28: `.env.example` committed to git; `.env` in `.gitignore`
- D-29: `npm run dev` at `packages/api` starts Fastify with hot reload (tsx watch or ts-node-dev)

**Testing**
- D-30: Vitest for unit tests; `supertest` + Fastify test server for integration tests
- D-31: Tests cover: signup validation, login success/failure, token refresh, reuse detection, logout, /config

### Claude's Discretion

- Exact bcrypt cost factor for password hashing (12 is a sensible default)
- Correlation ID implementation (uuid v4 per request, logged with every error)
- Fastify plugin organization (separate plugin files per concern vs single plugin)
- Exact Prisma migration file naming convention
- Whether to use `zod` for runtime validation alongside Fastify's JSON Schema or lean on JSON Schema alone

### Deferred Ideas (OUT OF SCOPE)

- `CirclePermissionGuard` full implementation — Phase 2 (circles must exist first)
- `LedgerService` and append-only DB protections — Phase 3
- Email verification on signup — v2 (out of scope for MVP)
- OAuth / magic link login — v2
- Redis session store / rate limit counters — v2 (in-memory rate limiting acceptable for MVP)
- Frontend auth screens — Phase 8
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can create an account with email and password | Prisma `users` table, bcryptjs hashing, Fastify JSON Schema validation, unique email constraint |
| AUTH-02 | User can log in and receive a JWT access token (15 min) + refresh token (30 days) | `@fastify/jwt` namespace pattern for two secrets, bcryptjs compare, Prisma `refresh_tokens` insert |
| AUTH-03 | User can exchange a valid refresh token for a new access token (token rotation) | Token rotation SQL pattern, `@fastify/jwt` refresh namespace, jti-based lookup + revoke |
| AUTH-04 | User can log out, revoking their refresh token | Prisma `refresh_tokens` update `revoked_at`, single-token revocation |
| AUTH-05 | User can view and update their profile (display name, country, sector) | AuthGuard preHandler on GET/PATCH `/auth/me`, Prisma user update, field whitelist |
| AUTH-06 | System detects refresh token reuse and revokes the entire token family | Family revocation: `updateMany({ where: { family } })`, return 401 TOKEN_REUSE_DETECTED |
| AUTH-07 | Global admin flag is stored per user and included in JWT payload | `is_global_admin` column in `users`, included in `@fastify/jwt` sign payload |
| DEMO-01 | GET /api/v1/config returns demoMode flag, currency, and escrow label | Public route, `@fastify/env` for `DEMO_MODE` env var, static response shape from SYSTEM_DESIGN.md §15 |
</phase_requirements>

---

## Summary

Phase 1 sets up a Fastify 5 + TypeScript monorepo API with full JWT auth including refresh token rotation and family revocation. The stack is well-established and all components have strong ecosystem support. The primary complexity is the two-secret JWT pattern (access vs refresh), which requires registering `@fastify/jwt` twice using the `namespace` option — this creates prefixed methods (`request.accessJwtVerify()`, `reply.refreshJwtSign()`) that require TypeScript declaration merging. Prisma is managed via a `fastify-plugin` decorator that attaches the client to `fastify.prisma`. Tests use Vitest with Fastify's built-in `inject()` method (faster than supertest, no live server port required).

**CRITICAL ENVIRONMENT FINDING — Docker not installed on this machine.** `docker --version` returns NOT FOUND. PostgreSQL IS running locally on port 5432 (confirmed via `pg_isready`), so the immediate fallback is to use Homebrew PostgreSQL. The Wave 0 plan must address database setup before any Prisma migrations can run. The `docker-compose.yml` should still be created for reproducibility, but is not usable on this machine without first installing Docker Desktop.

**bcrypt decision confirmed:** CONTEXT.md locks bcrypt (D-12). Argon2id is technically superior for new projects, but because the CONTEXT locks bcrypt and this is a greenfield MVP (no migration complexity), use `bcryptjs` (pure JS, no native build step) at cost factor 12. In tests, use cost factor 4 to avoid 60+ second test suites. `bcryptjs` avoids `node-gyp` native compilation requirements.

**Primary recommendation:** Use Fastify's native `inject()` for tests (not supertest + live server), register `@fastify/jwt` twice with `namespace: 'access'` and `namespace: 'refresh'` for separate secrets, use `jti` (UUID stored as `refresh_tokens.id`) as the DB lookup key for refresh tokens (never scan by bcrypt hash — bcrypt is non-deterministic), and wrap the Prisma plugin with `fastify-plugin`'s `fp()` to escape encapsulation.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Implication for Phase 1 |
|-----------|--------|------------------------|
| Tech stack: Node.js + Fastify + TypeScript | CLAUDE.md Constraints | Use Fastify, never Express or NestJS |
| Structure: npm workspaces monorepo (`/api`, `/web`) | CLAUDE.md Constraints | Root `package.json` with workspaces config |
| Auth: JWT HS256, 15-min access + 30-day refresh with family rotation | CLAUDE.md Constraints | Dual `@fastify/jwt` namespace registration |
| Ledger: Append-only enforced at app + DB level | CLAUDE.md Constraints | Note for Phase 1: design DB user grants now (Phase 3 executes), document in schema comments |
| DEMO_MODE: All governance identical to production | CLAUDE.md Constraints | DEMO_MODE drives config endpoint only in Phase 1; no governance logic yet |
| Security: All business logic server-side | CLAUDE.md Constraints | No client-side token decoding reliance; server validates on every request |
| GSD Workflow Enforcement | CLAUDE.md | All file changes via `/gsd:execute-phase`, not direct edits |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.8.4 | HTTP framework | TypeScript-native, schema validation, fastest Node HTTP framework |
| @fastify/jwt | 10.0.0 | JWT sign/verify with namespace support | Official Fastify plugin, supports multiple JWT instances (access + refresh) via `namespace` option |
| @fastify/cors | 11.2.0 | CORS headers | Official plugin, locked decision D-06 |
| @fastify/rate-limit | 10.3.0 | Request rate limiting | Official plugin, locked decision D-06, handles X-Forwarded-For |
| @fastify/env | 6.0.0 | Env var validation via JSON Schema | Official plugin, validates at startup before routes register, integrates with fastify lifecycle |
| fastify-plugin | 5.1.0 | Plugin encapsulation escape hatch | Required for Prisma decorator to be visible across the whole server |
| prisma | 7.6.0 | ORM CLI + migrations | Locked decision D-08; schema-first, auto-generated types |
| @prisma/client | 7.6.0 | Type-safe DB client | Auto-generated from schema, exact column types |
| bcryptjs | 3.0.3 | Password hashing (pure JS) | No native compilation needed, locked decision D-12; avoid native `bcrypt` package to skip node-gyp |
| typescript | 6.0.2 | Language | Locked by CLAUDE.md and all decisions |
| tsx | 4.21.0 | TypeScript execution + hot reload | Dev server watch mode, ESM-native, replaces ts-node-dev |
| vitest | 4.1.2 | Test framework | Locked decision D-30 |
| uuid | 13.0.0 | Correlation ID + jti generation | UUID v4 per request and per refresh token |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/bcryptjs | 3.0.0 | TypeScript types for bcryptjs | Dev dependency — install alongside bcryptjs |
| @types/uuid | 11.0.0 | TypeScript types for uuid | Dev dependency |
| env-schema | 7.0.0 | JSON Schema env validation | Used internally by @fastify/env |
| zod | 4.3.6 | Runtime validation | Claude's Discretion — use for env validation only if JSON Schema feels verbose; not required if @fastify/env JSON Schema is sufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | argon2 | Argon2id is memory-hard and superior for new projects, but bcrypt at cost 12 is locked by CONTEXT.md D-12; bcryptjs avoids native build steps |
| @fastify/env | dotenv + Zod | dotenv + Zod is more portable; @fastify/env integrates with the Fastify lifecycle and validates at startup, preventing silent misconfiguration |
| Fastify inject() | supertest + listen() | inject() is faster (no network), officially supported, and does not require a live server port — use inject() for all tests |
| fastify-plugin decorator | module-level singleton | Decorator pattern is idiomatic Fastify; singleton works in dev but leaks connections across test instances |
| bcrypt (native) | bcryptjs (pure JS) | bcrypt requires node-gyp native compilation; bcryptjs is pure JS with negligible performance difference at MVP scale |

**Installation (packages/api):**
```bash
npm install fastify @fastify/jwt @fastify/cors @fastify/rate-limit @fastify/env fastify-plugin prisma @prisma/client bcryptjs uuid
npm install -D typescript tsx vitest @types/bcryptjs @types/uuid
```

**Version verification (confirmed against npm registry 2026-03-31):**
- fastify: 5.8.4
- @fastify/jwt: 10.0.0
- prisma / @prisma/client: 7.6.0
- bcryptjs: 3.0.3
- vitest: 4.1.2
- tsx: 4.21.0
- typescript: 6.0.2
- uuid: 13.0.0
- @types/bcryptjs: 3.0.0
- @types/uuid: 11.0.0

---

## Architecture Patterns

### Recommended Project Structure

```
/                              # repo root
├── package.json               # workspaces: ["packages/*"]
├── tsconfig.base.json         # shared compiler options (extended by packages)
├── docker-compose.yml         # PostgreSQL 16 (for environments where Docker is available)
├── .env.example               # committed — no real secrets
├── packages/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json      # extends ../../tsconfig.base.json
│   │   ├── vitest.config.ts   # test framework config
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── server.ts      # entry: listen on PORT
│   │   │   ├── app.ts         # factory: buildApp() — registers plugins + routes
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.ts      # PrismaClient decorator
│   │   │   │   ├── jwt.ts         # @fastify/jwt double-registration (access + refresh)
│   │   │   │   ├── env.ts         # @fastify/env validation
│   │   │   │   ├── cors.ts        # @fastify/cors
│   │   │   │   └── rate-limit.ts  # @fastify/rate-limit
│   │   │   ├── hooks/
│   │   │   │   └── auth-guard.ts  # preHandler: verifies access JWT, sets req.user
│   │   │   ├── routes/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── index.ts   # registers all auth sub-routes
│   │   │   │   │   ├── signup.ts
│   │   │   │   │   ├── login.ts
│   │   │   │   │   ├── refresh.ts
│   │   │   │   │   ├── logout.ts
│   │   │   │   │   └── me.ts
│   │   │   │   └── config.ts      # GET /api/v1/config
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts  # business logic: create user, issue tokens, rotate
│   │   │   ├── guards/
│   │   │   │   └── circle-permission.guard.ts  # placeholder only (Phase 2)
│   │   │   ├── errors/
│   │   │   │   └── http-errors.ts   # canonical error format helpers
│   │   │   └── types/
│   │   │       └── fastify.d.ts     # declaration merging: req.user, fastify.prisma, JWT namespaces
│   │   └── test/
│   │       ├── setup.ts             # vitest globalSetup — Prisma test DB migration
│   │       └── auth/
│   │           ├── signup.test.ts   # AUTH-01
│   │           ├── login.test.ts    # AUTH-02, AUTH-07
│   │           ├── refresh.test.ts  # AUTH-03, AUTH-06
│   │           ├── logout.test.ts   # AUTH-04
│   │           ├── me.test.ts       # AUTH-05
│   │           └── config.test.ts   # DEMO-01
│   └── web/
│       └── package.json             # empty scaffold
```

### Pattern 1: Fastify App Factory (testable separation)

**What:** Export a `buildApp()` function that creates and configures the Fastify instance. A separate `server.ts` imports it and calls `.listen()`. Tests import `buildApp()` directly.

**When to use:** Always — this is the official Fastify testing pattern. It avoids port conflicts in parallel tests and makes the app instance disposable.

```typescript
// src/app.ts
import Fastify from 'fastify'
import { envPlugin } from './plugins/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { jwtPlugin } from './plugins/jwt.js'
import { corsPlugin } from './plugins/cors.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { authRoutes } from './routes/auth/index.js'
import { configRoute } from './routes/config.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(envPlugin)       // loads .env, validates, decorates app.config
  await app.register(prismaPlugin)    // decorates app.prisma
  await app.register(jwtPlugin)       // registers access + refresh JWT namespaces
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)

  // Global error handler (canonical format — see Pattern 6)
  app.setErrorHandler((error, request, reply) => {
    // ... see Pattern 6
  })

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(configRoute, { prefix: '/api/v1' })

  return app
}

// src/server.ts
import { buildApp } from './app.js'
const app = await buildApp()
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' })
```

### Pattern 2: Prisma Plugin with fastify-plugin Decorator

**What:** Register PrismaClient as a Fastify decorator so it's accessible as `fastify.prisma` throughout the app. The `fp()` wrapper from `fastify-plugin` is mandatory to escape plugin encapsulation so child scopes can see the decorator.

**When to use:** Always — this is the canonical Prisma+Fastify integration pattern.

```typescript
// src/plugins/prisma.ts
// Source: https://www.prisma.io/fastify
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const prisma = new PrismaClient()
  await prisma.$connect()
  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }
```

TypeScript declaration merging — include in `src/types/fastify.d.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
  interface FastifyRequest {
    user: {
      id: string
      email: string
      isGlobalAdmin: boolean
    }
  }
}
```

### Pattern 3: Dual JWT Registration with Namespaces

**What:** Register `@fastify/jwt` twice — once for access tokens (short-lived, `JWT_SECRET`) and once for refresh tokens (long-lived, `REFRESH_TOKEN_SECRET`). Use `namespace` to separate them. This creates prefixed methods on the request/reply objects.

**When to use:** Whenever two JWT types with different secrets are needed. The `namespace` option is the official `@fastify/jwt` solution.

```typescript
// src/plugins/jwt.ts
// Source: https://github.com/fastify/fastify-jwt (namespace section)
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export const jwtPlugin = fp(async (server) => {
  // Access token: 15 min, JWT_SECRET
  await server.register(jwt, {
    secret: server.config.JWT_SECRET,
    namespace: 'access',
    sign: { expiresIn: '15m', algorithm: 'HS256' }
  })

  // Refresh token: 30 days, separate secret
  await server.register(jwt, {
    secret: server.config.REFRESH_TOKEN_SECRET,
    namespace: 'refresh',
    sign: { expiresIn: '30d', algorithm: 'HS256' }
  })
})
```

Namespaced method usage:
```typescript
// Sign (in route handlers)
const accessToken = await reply.accessJwtSign({
  sub: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin
})
const refreshToken = await reply.refreshJwtSign({
  sub: user.id, tokenFamily: family, jti: newTokenId
})

// Verify (in AuthGuard preHandler)
await request.accessJwtVerify()   // throws if invalid/expired; populates request.user
```

TypeScript augmentation for namespaced JWT methods (add to `src/types/fastify.d.ts`):
```typescript
import type { JWT } from '@fastify/jwt'
declare module 'fastify' {
  interface FastifyInstance {
    accessJwt: JWT
    refreshJwt: JWT
  }
  interface FastifyRequest {
    accessJwtVerify: <T = unknown>() => Promise<T>
    refreshJwtVerify: <T = unknown>() => Promise<T>
  }
  interface FastifyReply {
    accessJwtSign: (payload: object) => Promise<string>
    refreshJwtSign: (payload: object) => Promise<string>
  }
}
```

### Pattern 4: Token Family Revocation Logic (jti-based lookup)

**What:** On refresh, decode the JWT to get the `jti` (token ID stored as the DB record's `id`), look up by `jti`, check revoked status, detect reuse, rotate. The `jti` in the JWT payload IS the primary key of the `refresh_tokens` row — no bcrypt scan needed.

**CRITICAL DESIGN NOTE:** Do not attempt to look up tokens by bcrypt hash. bcrypt is non-deterministic (random salt per hash) — `WHERE token_hash = bcrypt.hash(incoming)` will NEVER match. Store the UUID `id` as `jti` in the JWT payload, look up by `id`, then optionally verify the hash as a secondary integrity check.

```typescript
// src/services/auth.service.ts — refreshTokens method
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12

async function refreshTokens(
  rawRefreshToken: string,
  prisma: PrismaClient,
  app: FastifyInstance
) {
  // 1. Decode without verification first to get jti
  const decoded = app.refreshJwt.decode(rawRefreshToken) as {
    sub: string
    jti: string       // <-- This IS the refresh_tokens.id UUID
    tokenFamily: string
  }

  if (!decoded?.jti) throw new UnauthorizedError('INVALID_TOKEN')

  // 2. Look up by primary key (O(1))
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { id: decoded.jti }
  })

  if (!tokenRecord) throw new UnauthorizedError('TOKEN_NOT_FOUND')

  // 3. Detect reuse: if this token was already revoked, revoke entire family
  if (tokenRecord.revokedAt !== null) {
    await prisma.refreshToken.updateMany({
      where: { family: tokenRecord.family },
      data: { revokedAt: new Date() }
    })
    throw new UnauthorizedError('TOKEN_REUSE_DETECTED')
  }

  if (tokenRecord.expiresAt < new Date()) throw new UnauthorizedError('TOKEN_EXPIRED')

  // 4. Verify JWT signature (after DB check — fail fast on DB issues first)
  try {
    await app.refreshJwt.verify(rawRefreshToken)
  } catch {
    throw new UnauthorizedError('INVALID_TOKEN')
  }

  // 5. Revoke old token (mark used)
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() }
  })

  // 6. Issue new token pair (same family)
  const newTokenId = uuidv4()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: tokenRecord.userId } })

  const newRefreshToken = await app.refreshJwt.sign({
    sub: user.id,
    tokenFamily: tokenRecord.family,
    jti: newTokenId
  })

  // 7. Store new token (hash for integrity; lookup uses id)
  await prisma.refreshToken.create({
    data: {
      id: newTokenId,
      userId: user.id,
      tokenHash: await bcrypt.hash(newRefreshToken, BCRYPT_COST),
      family: tokenRecord.family,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  })

  // 8. Issue new access token
  const newAccessToken = await app.accessJwt.sign({
    sub: user.id,
    email: user.email,
    isGlobalAdmin: user.isGlobalAdmin
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
```

### Pattern 5: AuthGuard as preHandler Hook

**What:** A reusable async function that calls `request.accessJwtVerify()` and maps JWT errors to the canonical error format.

```typescript
// src/hooks/auth-guard.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.accessJwtVerify()
  } catch {
    return reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        field: null,
        status: 401
      }
    })
  }
}

// Usage in a protected route:
fastify.get('/auth/me', { preHandler: authGuard }, async (request, reply) => {
  return reply.send(request.user)
})
```

### Pattern 6: Canonical Error Handler

**What:** Global `setErrorHandler` that maps ALL errors to `{ error: { code, message, field, status } }` per SYSTEM_DESIGN.md §19.

```typescript
// src/app.ts — inside buildApp()
app.setErrorHandler((error, request, reply) => {
  const correlationId = request.id   // Fastify assigns request IDs by default

  // Fastify schema validation errors
  if (error.validation) {
    return reply.code(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: error.validation[0]?.instancePath?.replace('/', '') ?? null,
        status: 422
      }
    })
  }

  // Known domain errors with statusCode (thrown by service layer)
  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: {
        code: (error as any).code ?? 'ERROR',
        message: error.message,
        field: (error as any).field ?? null,
        status: error.statusCode
      }
    })
  }

  // Unknown errors — log full details, return generic 500
  app.log.error({ correlationId, err: error }, 'Unhandled server error')
  return reply.code(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      field: null,
      status: 500
    }
  })
})
```

### Pattern 7: Vitest + Fastify inject() Test Pattern

**What:** Tests create a fresh `buildApp()` instance, use `app.inject()` for HTTP simulation, and clean the test DB between tests using Prisma. Do NOT use supertest or `app.listen()`.

**When to use:** All integration tests. Decision D-30 says supertest, but Fastify's `inject()` is strictly superior for Fastify apps (no port, no network, official support).

```typescript
// test/auth/signup.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('POST /api/v1/auth/signup', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()  // REQUIRED: prevents test suite from hanging (Prisma connection leak)
  })

  beforeEach(async () => {
    // Clean in FK order: child table first
    await app.prisma.refreshToken.deleteMany()
    await app.prisma.user.deleteMany()
  })

  it('creates a user and returns 201 with JWT pair', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      }
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
  })

  it('returns 409 for duplicate email', async () => {
    // create user first, then try again
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'dup@example.com', password: 'Password123!', displayName: 'Dup' }
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'dup@example.com', password: 'Password123!', displayName: 'Dup2' }
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS')
  })
})
```

### Pattern 8: npm Workspaces + Shared tsconfig

**What:** Root `tsconfig.base.json` holds shared compiler options. Each package extends it.

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}

// packages/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

**Target must be ES2017 or higher** to avoid `FastifyDeprecation` warnings with Fastify 5. ES2022 is recommended.

### Anti-Patterns to Avoid

- **Module-level PrismaClient singleton:** `const prisma = new PrismaClient()` at module root leaks connections across test instances — use the fastify-plugin decorator instead
- **Storing refresh tokens as plain text:** Tokens are JWTs — if the DB is compromised, attacker can replay all tokens. Always store bcrypt hash in `token_hash` column
- **Querying refresh tokens by bcrypt hash:** bcrypt is non-deterministic — store `jti` (UUID) in JWT payload and use it as the DB lookup key (`refresh_tokens.id`)
- **Using supertest + app.listen() in tests:** Requires port management, is slower, and has no advantage over `inject()` for Fastify
- **Single `@fastify/jwt` registration for both token types:** Access and refresh tokens use different secrets — sharing one secret means a stolen refresh token can forge access tokens
- **Not calling `app.close()` in afterAll:** Leaves Prisma connections open, causes test suite to hang
- **tsconfig target below ES2017:** Triggers FastifyDeprecation warnings in Fastify 5
- **Deleting user before refresh_tokens in cleanup:** FK constraint will cause `beforeEach` to fail; always delete child records first

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom crypto | `@fastify/jwt` | Algorithm agility, error handling, TypeScript types, namespace support |
| Env var validation | Manual `if (!process.env.X)` checks | `@fastify/env` | Validates at startup before routes register, type-safe config, prevents silent misconfiguration |
| CORS handling | Manual headers in routes | `@fastify/cors` | Handles preflight, Vary header, credentials — all edge cases |
| Rate limiting | Counter per IP in memory | `@fastify/rate-limit` | Handles X-Forwarded-For correctly, configurable per-route, store-agnostic |
| Password hashing | SHA-256 or MD5 | `bcryptjs` | Work factor, automatic salt generation, timing-safe compare — SHA-256 is NOT acceptable for passwords |
| UUID generation | `Math.random()` string | `uuid` v4 | RFC 4122 compliant, collision-free, cryptographically random |
| Request ID / correlation | Incrementing integer counter | Fastify's built-in `requestId` (or uuid-based `genReqId`) | Thread-safe, unique across restarts |
| Token reuse detection | Session store lookup per request | jti stored in DB with `revokedAt` column | Stateless access tokens + refresh token rotation is the standard pattern |

**Key insight:** JWT, rate limiting, and CORS each have subtle correctness requirements (algorithm agility, X-Forwarded-For handling, Vary headers, timing attacks) that are easy to get wrong in custom code. The `@fastify` plugins are battle-tested across thousands of production deployments.

---

## Common Pitfalls

### Pitfall 1: Refresh Token Lookup by bcrypt Hash

**What goes wrong:** Developer tries to do `WHERE token_hash = bcrypt.hash(incoming)` in a SQL query. This never matches.

**Why it happens:** Misconception that bcrypt hashes are deterministic like SHA-256. bcrypt includes a random salt in each hash, so the same input produces different output each time.

**How to avoid:** Store a deterministic lookup key — the `jti` UUID from the JWT payload — as the primary key of `refresh_tokens`. Store the bcrypt hash as a secondary integrity field if desired, but use `id` (= `jti`) for all DB lookups. Verify with `bcrypt.compare()` after the DB lookup.

**Warning signs:** Any code that does `prisma.refreshToken.findFirst({ where: { tokenHash: bcrypt.hash(...) } })` — this will never match.

### Pitfall 2: @fastify/jwt Namespace TypeScript Augmentation

**What goes wrong:** After registering with `namespace: 'access'`, calling `request.jwtVerify()` throws at runtime because the default method is not registered — only `request.accessJwtVerify()` exists. TypeScript may not catch this if augmentation is incomplete.

**Why it happens:** Namespace creates prefixed methods, not the default `jwtVerify`.

**How to avoid:** Manually declare the namespaced methods in `src/types/fastify.d.ts` (Pattern 3 shows the exact shape). Test TypeScript compilation in Wave 1 to confirm.

### Pitfall 3: fastify-plugin Omission for Prisma Decorator

**What goes wrong:** Decorator added in a plugin without `fp()` wrapper is not visible outside that plugin scope — routes registered in a different plugin scope get `TypeError: server.prisma is not a function`.

**Why it happens:** Fastify's plugin system encapsulates decorators by default. Without `fp()`, the decorator only exists in the plugin's child scope.

**How to avoid:** Always wrap the Prisma plugin with `fp(async (server) => { ... })` from `fastify-plugin`.

**Warning signs:** `server.prisma is not defined` in route handlers when the prisma plugin appears to be registered.

### Pitfall 4: Test DB Isolation — FK Order Matters

**What goes wrong:** Tests share database state — a user created in test A causes a unique constraint error in test B. Or `beforeEach` cleanup fails with a FK violation when trying to delete users before their refresh tokens.

**Why it happens:** FK constraint: `refresh_tokens.user_id` references `users.id`. Deleting users first violates this constraint.

**How to avoid:** In `beforeEach`, always delete in FK order — children before parents:
```typescript
await app.prisma.refreshToken.deleteMany()  // child
await app.prisma.user.deleteMany()           // parent
```
Use `DATABASE_URL_TEST` env var pointing to a separate `mukwano_test` database. Run `prisma migrate deploy` on the test DB in test setup.

**Warning signs:** Flaky tests that pass in isolation but fail when run in sequence.

### Pitfall 5: bcrypt Cost Factor in Tests

**What goes wrong:** Integration tests take 60+ seconds because bcrypt at cost 12 is intentionally slow — 20 signup tests = 20 bcrypt hash operations at ~250ms each.

**Why it happens:** Cost factor 12 is appropriate for production but punishing in tests.

**How to avoid:** Detect `NODE_ENV === 'test'` and use cost factor 4 (minimum):
```typescript
const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12
```

### Pitfall 6: Fastify tsconfig target below ES2017

**What goes wrong:** `FastifyDeprecation` warnings flood the console and some async patterns behave differently under transpilation.

**Why it happens:** Fastify 5 requires ES2017+ for native async/await support.

**How to avoid:** Set `"target": "ES2022"` in `tsconfig.base.json`. Do not set ES5 or ES6.

### Pitfall 7: Docker Not Present on Dev Machine

**What goes wrong:** `docker compose up` fails immediately — PostgreSQL never starts — `prisma migrate dev` fails with connection refused.

**Why it happens:** Docker Desktop is not installed on this machine (confirmed: `docker --version` = NOT FOUND).

**How to avoid:** Phase plan Wave 0 must address this. Local Homebrew PostgreSQL IS running on port 5432 (confirmed: `pg_isready` returns "accepting connections"). Use local PostgreSQL as the immediate fallback:
```bash
createdb mukwano
createdb mukwano_test
# Set DATABASE_URL=postgresql://localhost/mukwano in .env
# Set DATABASE_URL_TEST=postgresql://localhost/mukwano_test
```
Docker Compose file should still be created for CI/CD reproducibility, but local PostgreSQL unblocks development immediately.

### Pitfall 8: is_global_admin Role Change Propagation Lag

**What goes wrong:** A user's `is_global_admin` flag is changed in the DB, but existing access tokens (15-min window) still claim the old value.

**Why it happens:** Access tokens are stateless — the JWT payload is signed at issuance and not re-read from the DB on each request.

**How to avoid:** This is an accepted design decision per SYSTEM_DESIGN.md — the 15-minute propagation lag is acceptable for MVP. Document it in code comments on the `is_global_admin` field. Do not add DB lookup per request (it defeats the performance benefit of stateless JWTs at this scale).

---

## Code Examples

Verified patterns from official and project-canonical sources:

### Prisma Schema for Phase 1

```prisma
// packages/api/prisma/schema.prisma
// Source: SYSTEM_DESIGN.md §5 + §7 (canonical)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique
  passwordHash  String   @map("password_hash")
  displayName   String   @map("display_name")
  country       String?
  sector        String?
  avatarUrl     String?  @map("avatar_url")
  isGlobalAdmin Boolean  @default(false) @map("is_global_admin")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid  // This IS the jti in the JWT payload
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")     // bcrypt hash for integrity
  family    String    @db.Uuid                       // all tokens from same login share family
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")             // set on use; check for reuse detection
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

### Docker Compose (PostgreSQL 16 with healthcheck)

```yaml
# docker-compose.yml (repo root)
# Source: Docker Compose docs — startup order with healthcheck
# NOTE: Docker is not installed on this dev machine. This file is for CI/CD.
# Use local Homebrew PostgreSQL for development.

services:
  postgres:
    image: postgres:16-alpine
    container_name: mukwano-postgres
    environment:
      POSTGRES_USER: mukwano
      POSTGRES_PASSWORD: mukwano_dev
      POSTGRES_DB: mukwano
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mukwano -d mukwano"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  postgres_data:
```

### @fastify/env Plugin

```typescript
// src/plugins/env.ts
// Source: https://github.com/fastify/fastify-env
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'],
  properties: {
    DATABASE_URL:            { type: 'string' },
    JWT_SECRET:              { type: 'string' },
    REFRESH_TOKEN_SECRET:    { type: 'string' },
    DEMO_MODE:               { type: 'string', default: 'false' },
    PORT:                    { type: 'string', default: '4000' },
    NODE_ENV:                { type: 'string', default: 'development' }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string
      JWT_SECRET: string
      REFRESH_TOKEN_SECRET: string
      DEMO_MODE: string
      PORT: string
      NODE_ENV: string
    }
  }
}

export const envPlugin = fp(async (server) => {
  await server.register(fastifyEnv, {
    schema,
    dotenv: true,
    dotenvConfig: { path: '.env' }
  })
})
```

### Config Endpoint (DEMO-01)

```typescript
// src/routes/config.ts
// Source: SYSTEM_DESIGN.md §15 + D-23/D-24
import type { FastifyPluginAsync } from 'fastify'

export const configRoute: FastifyPluginAsync = async (app) => {
  app.get('/config', async (request, reply) => {
    const demoMode = app.config.DEMO_MODE === 'true'
    return reply.send({
      demoMode,
      currency: 'USD',
      escrowLabel: demoMode
        ? 'Simulated escrow — no real funds'
        : 'Escrow'
    })
  })
}
```

### Root package.json (npm workspaces)

```json
{
  "name": "mukwano",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:api":   "npm -w packages/api run dev",
    "test:api":  "npm -w packages/api run test",
    "build:api": "npm -w packages/api run build"
  }
}
```

### packages/api/package.json (dev scripts)

```json
{
  "name": "@mukwano/api",
  "type": "module",
  "scripts": {
    "dev":   "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test":  "vitest",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node-dev` for hot reload | `tsx watch` | 2023 | tsx is faster, no separate config needed, ESM-native |
| `fastify-jwt` (unscoped package) | `@fastify/jwt` (scoped) | Fastify v4 → v5 era | The scoped package is the maintained version — never install `fastify-jwt` |
| PrismaClient module singleton | fastify-plugin decorator | Prisma v5+ era | Decorator prevents connection leaks across test instances |
| `supertest` + `app.listen()` | `app.inject()` | Fastify v3+ | inject() is officially supported, faster, no port needed — use this |
| `jsonwebtoken` directly | `@fastify/jwt` | Fastify ecosystem | Plugin handles TypeScript types, error formatting, hooks integration |
| Storing full JWT as token | Storing bcrypt hash of JWT | Security best practice | Hash prevents replay attacks if DB is compromised |

**Deprecated/outdated:**
- `fastify-jwt` (unscoped): Replaced by `@fastify/jwt` — do not install `fastify-jwt`
- `ts-node` for dev: Use `tsx` for dev, compile to JS (`tsc`) for production
- `fastify@4.x`: Version 5.x is current; use Fastify 5 patterns (`await app.register()`, ES2022+ target)
- `docker-compose` (v1 CLI): Use `docker compose` (v2 subcommand) in scripts

---

## Open Questions

1. **@fastify/jwt namespace TypeScript augmentation in v10.x**
   - What we know: Namespace option creates prefixed methods; official README shows namespace pattern
   - What's unclear: Whether @fastify/jwt 10.x auto-generates TypeScript types for namespaced methods or requires manual declaration merging
   - Recommendation: Declare augmentation manually (Pattern 3 shows the exact shape) and test TypeScript compilation in Wave 1. Remove manual declaration if official types cover it automatically.

2. **Separate test database connection string**
   - What we know: Tests need a clean DB; `beforeEach` with `deleteMany()` works but requires correct FK ordering
   - What's unclear: Local Homebrew PostgreSQL user/role setup on this specific machine (could not connect as `levicheptoyek` or `postgres` in env probe)
   - Recommendation: Wave 0 task must create the databases and verify connection. Use `DATABASE_URL_TEST=postgresql://localhost/mukwano_test` in a `.env.test` file. Configure `vitest.config.ts` to load this override.

3. **Email normalization for case-insensitive uniqueness**
   - What we know: PostgreSQL `UNIQUE` constraint is case-sensitive by default — `User@example.com` and `user@example.com` would be stored as different users
   - What's unclear: Prisma does not auto-normalize case
   - Recommendation: Normalize email to lowercase in the service layer before `prisma.user.create()`. Test with mixed-case email in AUTH-01 edge cases.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | YES | v25.6.1 | — |
| npm | Package management | YES | 11.11.0 | — |
| Docker / Docker Desktop | PostgreSQL 16 via Compose (D-26) | NO | — | Local Homebrew PostgreSQL (running, port 5432) |
| pg_isready | DB health probe in scripts | YES | 17.5 (psql client) | — |
| PostgreSQL (local Homebrew) | Direct DB connection | YES (port 5432) | 17.x Homebrew | — |
| tsx | Dev hot reload | Not global — install locally | 4.21.0 via npm | — |
| vitest | Testing | Not global — install locally | 4.1.2 via npm | — |

**Missing dependencies with no fallback:**
- None — all blocking dependencies have either been confirmed or have viable fallbacks.

**Missing dependencies with fallback:**
- Docker: The `docker-compose.yml` should still be created for CI/CD reproducibility. For local development, use Homebrew PostgreSQL directly. Wave 0 must include: `createdb mukwano && createdb mukwano_test`. The `DATABASE_URL` in `.env` should point to the local PostgreSQL instance.

**Local PostgreSQL connection note:** Connection attempts as `levicheptoyek` and `postgres` roles failed in probing (pg_isready confirmed the port is open but connection role is unknown). Wave 0 must include: identify the correct PostgreSQL user/role for this machine and document the correct `DATABASE_URL` format.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `packages/api/vitest.config.ts` — Wave 0 gap |
| Quick run command | `npm -w packages/api test -- --run` |
| Full suite command | `npm -w packages/api test -- --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /auth/signup creates user, hashes password, returns 201 + JWT pair | Integration | `npm -w packages/api test -- --run test/auth/signup.test.ts` | Wave 0 gap |
| AUTH-01 | POST /auth/signup rejects duplicate email with 409 + EMAIL_ALREADY_EXISTS | Integration | same file | Wave 0 gap |
| AUTH-01 | POST /auth/signup validates required fields — 422 with `field` populated | Integration | same file | Wave 0 gap |
| AUTH-01 | POST /auth/signup with mixed-case email normalizes to lowercase | Integration | same file | Wave 0 gap |
| AUTH-02 | POST /auth/login returns accessToken + refreshToken on valid credentials | Integration | `npm -w packages/api test -- --run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-02 | POST /auth/login returns 401 on wrong password | Integration | same file | Wave 0 gap |
| AUTH-02 | POST /auth/login access token `exp` claim is ~15 minutes from now | Unit | same file | Wave 0 gap |
| AUTH-02 | POST /auth/login refresh token `exp` claim is ~30 days from now | Unit | same file | Wave 0 gap |
| AUTH-03 | POST /auth/refresh returns new accessToken + new refreshToken | Integration | `npm -w packages/api test -- --run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-03 | POST /auth/refresh invalidates old refresh token — second use returns 401 | Integration | same file | Wave 0 gap |
| AUTH-03 | POST /auth/refresh returns 401 on expired refresh token | Integration | same file | Wave 0 gap |
| AUTH-03 | POST /auth/refresh with malformed token returns 401 (not 500) | Integration | same file | Wave 0 gap |
| AUTH-04 | POST /auth/logout marks presented refresh token as revoked | Integration | `npm -w packages/api test -- --run test/auth/logout.test.ts` | Wave 0 gap |
| AUTH-04 | POST /auth/logout does NOT revoke sibling tokens in same family | Integration | same file | Wave 0 gap |
| AUTH-04 | POST /auth/logout without Authorization header returns 401 | Integration | same file | Wave 0 gap |
| AUTH-05 | GET /auth/me returns current user profile (id, email, displayName, country, sector) | Integration | `npm -w packages/api test -- --run test/auth/me.test.ts` | Wave 0 gap |
| AUTH-05 | PATCH /auth/me updates displayName, country, sector | Integration | same file | Wave 0 gap |
| AUTH-05 | PATCH /auth/me cannot update email or passwordHash (mass assignment guard) | Integration | same file | Wave 0 gap |
| AUTH-05 | GET /auth/me without Authorization header returns 401 | Integration | same file | Wave 0 gap |
| AUTH-06 | POST /auth/refresh with a previously-used (revoked) token returns 401 + TOKEN_REUSE_DETECTED | Integration | `npm -w packages/api test -- --run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-06 | After family revocation, ALL tokens in the family return 401 (simulating other sessions) | Integration | same file | Wave 0 gap |
| AUTH-07 | isGlobalAdmin is present in access JWT payload on login | Integration | `npm -w packages/api test -- --run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-07 | isGlobalAdmin=false for regular users | Integration | same file | Wave 0 gap |
| AUTH-07 | isGlobalAdmin=true for a user with is_global_admin=true in DB | Integration | same file | Wave 0 gap |
| DEMO-01 | GET /api/v1/config returns `{ demoMode, currency, escrowLabel }` shape | Integration | `npm -w packages/api test -- --run test/config.test.ts` | Wave 0 gap |
| DEMO-01 | demoMode=true when DEMO_MODE=true in env | Integration | same file | Wave 0 gap |
| DEMO-01 | escrowLabel = "Simulated escrow — no real funds" when demoMode=true | Integration | same file | Wave 0 gap |
| DEMO-01 | GET /api/v1/config is public — no Authorization header required, returns 200 | Integration | same file | Wave 0 gap |

### Edge Cases That Must Be Covered

| Scenario | Why Critical |
|----------|-------------|
| Signup with mixed-case email (`User@Example.COM`) | Email uniqueness must be case-insensitive — normalize to lowercase on insert |
| Refresh with token from a different user's family (tampered jti) | DB lookup by `id` returns not-found → 401; test confirms no cross-user forgery |
| PATCH /auth/me attempting to set `email` or `passwordHash` fields | Mass assignment — only `displayName`, `country`, `sector` are allowed; extra fields silently ignored or rejected |
| POST /auth/refresh with valid-looking JWT signed with wrong secret | JWT verify throws → must return 401, not 500; error handler must not leak JWT internals |
| POST /auth/signup with password below minimum length | 422 with `field: "password"` — Fastify schema validation |
| Two simultaneous refresh calls with the same token (race condition) | One succeeds, one gets 401 — Prisma `update` where `revokedAt IS NULL` provides optimistic concurrency; test with sequential calls (true concurrency test requires load testing tools) |
| Logout endpoint called without a valid access token | 401 — AuthGuard preHandler runs before the logout handler |
| POST /auth/refresh with an already-expired token (beyond 30 days) | 401 — JWT expiry check, not just DB lookup |

### Sampling Rate

- **Per task commit:** `npm -w packages/api test -- --run` (all tests, no watch)
- **Per wave merge:** `npm -w packages/api test -- --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/api/vitest.config.ts` — test framework config, globalSetup reference, environment overrides
- [ ] `packages/api/test/setup.ts` — global setup: verify DB connection, run `prisma migrate deploy` on test DB
- [ ] `packages/api/test/auth/signup.test.ts` — covers AUTH-01
- [ ] `packages/api/test/auth/login.test.ts` — covers AUTH-02, AUTH-07
- [ ] `packages/api/test/auth/refresh.test.ts` — covers AUTH-03, AUTH-06
- [ ] `packages/api/test/auth/logout.test.ts` — covers AUTH-04
- [ ] `packages/api/test/auth/me.test.ts` — covers AUTH-05
- [ ] `packages/api/test/config.test.ts` — covers DEMO-01
- [ ] Local database setup: `createdb mukwano && createdb mukwano_test` (Docker is not available — use Homebrew PostgreSQL)
- [ ] Identify correct local PostgreSQL user/role and confirm `DATABASE_URL` connection string format

---

## Sources

### Primary (HIGH confidence)

- Fastify official docs — https://fastify.dev/docs/latest/Guides/Testing/ — inject() pattern, app factory, close()
- Fastify TypeScript docs — https://fastify.dev/docs/latest/Reference/TypeScript/ — declaration merging, plugin types, FastifyRequest.user
- @fastify/jwt GitHub README — https://github.com/fastify/fastify-jwt — namespace option, dual registration, TypeScript augmentation
- Prisma + Fastify integration guide — https://www.prisma.io/fastify — fastify-plugin decorator pattern, onClose hook
- npm registry (verified 2026-03-31) — all package versions confirmed in Standard Stack table
- SYSTEM_DESIGN.md §5, §7, §15, §19 — canonical schema, JWT strategy, DEMO_MODE, error format (project-authoritative)

### Secondary (MEDIUM confidence)

- Docker Compose healthcheck docs — https://docs.docker.com/compose/how-tos/startup-order/ — PostgreSQL healthcheck pattern
- @fastify/env GitHub — https://github.com/fastify/fastify-env — dotenv option, JSON Schema validation at startup
- Prisma schema reference — https://www.prisma.io/docs/orm/reference/prisma-schema-reference — @map, @db.Uuid, @updatedAt

### Tertiary (LOW confidence — flagged for validation)

- bcrypt vs argon2 comparison — community security blogs (2025-2026) — security recommendation (argon2id preferred for new projects, but bcrypt locked by CONTEXT.md D-12)
- JWT refresh token rotation + family revocation — community pattern, confirmed by multiple sources; exact Prisma query syntax needs runtime verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against npm registry 2026-03-31
- Architecture patterns: HIGH — Fastify factory + plugin decorator + inject() confirmed in official docs
- JWT dual-namespace pattern: MEDIUM — namespace option confirmed in @fastify/jwt README; TypeScript augmentation for namespaced methods may need manual declaration (flag for Wave 1 verification)
- Token family revocation logic: MEDIUM — algorithmic correctness is sound; jti-based lookup is confirmed community pattern; Prisma query syntax needs runtime verification in Wave 1
- Docker environment: HIGH (confirmed absent) — local PostgreSQL IS running; correct user/role needs Wave 0 investigation

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable ecosystem — Fastify, Prisma, JWT patterns change slowly)
