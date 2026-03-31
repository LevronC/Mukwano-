# Phase 1: Foundation & Auth — Research

**Researched:** 2026-03-30
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
| AUTH-03 | User can exchange a valid refresh token for a new access token (token rotation) | Token rotation SQL pattern, `@fastify/jwt` refresh namespace, bcrypt hash comparison |
| AUTH-04 | User can log out, revoking their refresh token | Prisma `refresh_tokens` update `revoked_at`, single-token revocation |
| AUTH-05 | User can view and update their profile (display name, country, sector) | AuthGuard preHandler on GET/PATCH `/auth/me`, Prisma user update, field whitelist |
| AUTH-06 | System detects refresh token reuse and revokes the entire token family | Family revocation SQL pattern: `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family = ?`, return 401 |
| AUTH-07 | Global admin flag is stored per user and included in JWT payload | `is_global_admin` column in `users`, included in `@fastify/jwt` sign payload |
| DEMO-01 | GET /api/v1/config returns demoMode flag, currency, and escrow label | Public route, `@fastify/env` for `DEMO_MODE` env var, static response shape |
</phase_requirements>

---

## Summary

Phase 1 sets up a Fastify 5 + TypeScript monorepo API with full JWT auth including refresh token rotation and family revocation. The stack is well-established and all components have strong ecosystem support. The primary complexity is the two-secret JWT pattern (access vs refresh) which requires registering `@fastify/jwt` twice using the `namespace` option. Prisma is managed via a `fastify-plugin` decorator pattern that attaches the client to `fastify.prisma`. Tests use Vitest with Fastify's built-in `inject()` method (not supertest), which is faster and does not require a live server.

**IMPORTANT — Docker not installed on this machine.** Docker must be installed before Phase 1 execution. The PostgreSQL 16 Docker Compose setup is the only external dependency that blocks the implementation. Alternatively, a local PostgreSQL installation can be used during development.

**bcrypt decision confirmed:** The CONTEXT.md locks bcrypt (D-12). Argon2id is technically superior for new projects in 2025, but because the CONTEXT locks bcrypt and this is a greenfield MVP (no migration complexity), the planner should use `bcryptjs` (pure JS, no native build step) at cost factor 12. This choice is pragmatic — bcrypt at cost 12 remains secure for MVP. Argon2id should be noted as the upgrade path for production hardening.

**Primary recommendation:** Use Fastify's native `inject()` for tests (not supertest + live server), register `@fastify/jwt` twice with `namespace: 'access'` and `namespace: 'refresh'` for separate secrets, and use `fastify-plugin` + decorator for the Prisma client.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.8.4 | HTTP framework | TypeScript-native, schema validation, fastest Node HTTP framework |
| @fastify/jwt | 10.0.0 | JWT sign/verify with namespace support | Official Fastify plugin, supports multiple JWT instances (access + refresh) |
| @fastify/cors | 11.2.0 | CORS headers | Official plugin, locked decision D-06 |
| @fastify/rate-limit | 10.3.0 | Request rate limiting | Official plugin, locked decision D-06 |
| @fastify/env | 6.0.0 | Env var validation via JSON Schema | Official plugin, integrates with fastify-plugin lifecycle |
| fastify-plugin | 5.1.0 | Plugin encapsulation escape hatch | Required for Prisma decorator to be visible across the whole server |
| prisma | 7.6.0 | ORM CLI + migrations | Locked decision D-08 |
| @prisma/client | 7.6.0 | Type-safe DB client | Auto-generated from schema, exact column types |
| bcryptjs | 3.0.3 | Password hashing (pure JS) | No native compilation needed, locked decision D-12 |
| typescript | 6.0.2 | Language | Locked by CLAUDE.md and all decisions |
| tsx | 4.21.0 | TypeScript execution + hot reload | Dev server watch mode (replaces ts-node-dev) |
| vitest | 4.1.2 | Test framework | Locked decision D-30 |
| uuid | 13.0.0 | Correlation ID generation | UUID v4 per request |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/bcryptjs | latest | TS types for bcryptjs | Dev dependency |
| env-schema | 7.0.0 | JSON Schema env validation | Used internally by @fastify/env |
| zod | 4.3.6 | Runtime validation | Claude's Discretion — use for env validation only if JSON Schema feels verbose; not required if @fastify/env JSON Schema is sufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | argon2 | Argon2id is memory-hard and superior for new projects, but bcrypt at cost 12 is locked by CONTEXT.md D-12 and bcryptjs avoids native build steps |
| @fastify/env | dotenv + Zod | dotenv + Zod is more portable; @fastify/env integrates with the Fastify lifecycle and validates at startup, preventing silent misconfiguration |
| Fastify inject() | supertest | inject() is faster (no network), officially supported, and does not require a live server port |
| fastify-plugin decorator | module-level singleton | Decorator pattern is idiomatic Fastify; singleton works in dev but can leak across test instances |

**Installation (packages/api):**
```bash
npm install fastify @fastify/jwt @fastify/cors @fastify/rate-limit @fastify/env fastify-plugin prisma @prisma/client bcryptjs uuid
npm install -D typescript tsx vitest @types/bcryptjs @types/uuid ts-node
```

**Version verification (confirmed against npm registry 2026-03-30):**
- fastify: 5.8.4
- @fastify/jwt: 10.0.0
- prisma / @prisma/client: 7.6.0
- bcryptjs: 3.0.3
- vitest: 4.1.2
- tsx: 4.21.0
- typescript: 6.0.2

---

## Architecture Patterns

### Recommended Project Structure

```
/                              # repo root
├── package.json               # workspaces: ["packages/*"]
├── tsconfig.base.json         # shared compiler options (extended by packages)
├── docker-compose.yml         # PostgreSQL 16
├── .env.example               # committed — no real secrets
├── packages/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json      # extends ../../tsconfig.base.json
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
│   │   │   │   │   ├── signup.ts
│   │   │   │   │   ├── login.ts
│   │   │   │   │   ├── refresh.ts
│   │   │   │   │   ├── logout.ts
│   │   │   │   │   └── me.ts
│   │   │   │   └── config.ts      # GET /api/v1/config
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts  # business logic: create user, issue tokens, rotate
│   │   │   ├── guards/
│   │   │   │   └── circle-permission.guard.ts  # placeholder (Phase 2)
│   │   │   ├── errors/
│   │   │   │   └── http-errors.ts   # canonical error format helpers
│   │   │   └── types/
│   │   │       └── fastify.d.ts     # declaration merging for req.user, fastify.prisma
│   │   └── test/
│   │       ├── setup.ts             # vitest globalSetup — Prisma test DB
│   │       └── auth/
│   │           ├── signup.test.ts
│   │           ├── login.test.ts
│   │           ├── refresh.test.ts
│   │           ├── logout.test.ts
│   │           ├── me.test.ts
│   │           └── config.test.ts
│   └── web/
│       └── package.json             # empty scaffold
```

### Pattern 1: Fastify App Factory (testable separation)

**What:** Export a `buildApp()` function that creates and configures the Fastify instance. A separate `server.ts` imports it and calls `.listen()`. Tests import `buildApp()` directly.

**When to use:** Always — this is the official Fastify testing pattern. It avoids port conflicts in parallel tests and makes the app instance disposable.

```typescript
// src/app.ts
import Fastify from 'fastify'
import { prismaPlugin } from './plugins/prisma.js'
import { jwtPlugin } from './plugins/jwt.js'
import { envPlugin } from './plugins/env.js'
import { authRoutes } from './routes/auth/index.js'
import { configRoute } from './routes/config.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(envPlugin)     // loads .env, validates, decorates app.config
  await app.register(prismaPlugin)  // decorates app.prisma
  await app.register(jwtPlugin)     // registers access + refresh JWT namespaces
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)

  // Global error handler (canonical format)
  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.id
    app.log.error({ correlationId, err: error }, 'Unhandled error')
    // ... map to canonical format
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

**What:** Register PrismaClient as a Fastify decorator so it's accessible as `fastify.prisma` throughout the app.

**When to use:** Always — this is the canonical Prisma+Fastify integration pattern. `fastify-plugin` is required to escape plugin encapsulation so child scopes can see the decorator.

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

TypeScript declaration merging (in `src/types/fastify.d.ts`):
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

**What:** Register `@fastify/jwt` twice — once for access tokens (short-lived, `JWT_SECRET`) and once for refresh tokens (long-lived, `REFRESH_TOKEN_SECRET`). Use `namespace` to separate them.

**When to use:** Whenever two JWT types with different secrets are needed. The `namespace` option is the official `@fastify/jwt` solution for this.

```typescript
// src/plugins/jwt.ts
// Source: https://github.com/fastify/fastify-jwt README (namespace section)
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

Usage:
```typescript
// Sign
const accessToken = await reply.accessJwtSign({ sub: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin })
const refreshToken = await reply.refreshJwtSign({ sub: user.id, tokenFamily: family })

// Verify in AuthGuard
await request.accessJwtVerify()   // throws if invalid/expired; populates request.user
```

### Pattern 4: Token Family Revocation Logic

**What:** On refresh, verify the presented token, check it is not revoked, issue a new one, mark the old one revoked. On reuse detection (revoked token presented), revoke the entire family.

**When to use:** The exact SQL pattern for the refresh route.

```typescript
// src/services/auth.service.ts — refreshTokens method
async function refreshTokens(rawRefreshToken: string, prisma: PrismaClient) {
  // 1. Find the token record by comparing bcrypt hash of incoming token
  //    NOTE: You cannot query by hash directly — must scan active tokens for user
  //    PATTERN: Store tokenId in the JWT payload, look up by tokenId
  const decoded = server.refreshJwtDecode(rawRefreshToken) as { sub: string; jti: string; tokenFamily: string }

  const tokenRecord = await prisma.refreshToken.findUnique({ where: { id: decoded.jti } })

  if (!tokenRecord) throw new UnauthorizedError('TOKEN_NOT_FOUND')

  // 2. Check for family reuse (theft detection)
  if (tokenRecord.revokedAt !== null) {
    // This token was already used — revoke entire family
    await prisma.refreshToken.updateMany({
      where: { family: tokenRecord.family },
      data: { revokedAt: new Date() }
    })
    throw new UnauthorizedError('TOKEN_REUSE_DETECTED')
  }

  if (tokenRecord.expiresAt < new Date()) throw new UnauthorizedError('TOKEN_EXPIRED')

  // 3. Revoke old token
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() }
  })

  // 4. Issue new token pair (same family)
  const newRefreshToken = await reply.refreshJwtSign({
    sub: tokenRecord.userId,
    tokenFamily: tokenRecord.family,
    jti: newTokenId
  })

  // 5. Store new token hash
  await prisma.refreshToken.create({
    data: {
      id: newTokenId,
      userId: tokenRecord.userId,
      tokenHash: await bcrypt.hash(newRefreshToken, 12),
      family: tokenRecord.family,
      expiresAt: addDays(new Date(), 30)
    }
  })

  // 6. Issue new access token
  const user = await prisma.user.findUniqueOrThrow({ where: { id: tokenRecord.userId } })
  const newAccessToken = await reply.accessJwtSign({
    sub: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
```

**IMPORTANT NOTE on token lookup strategy:** Storing token hash and bcrypt-comparing all active tokens per user is O(N) and leaks timing information. The recommended pattern is to store the token ID (`jti`) in the JWT payload and look up by `jti` in the DB. Hash is then stored as a secondary integrity check. This pattern is confirmed by community consensus and avoids the O(N) scan.

Add `jti` field to `refresh_tokens` Prisma schema (or use `id` as the `jti` — same UUID).

### Pattern 5: AuthGuard as preHandler Hook

**What:** A reusable async function that calls `request.accessJwtVerify()` and maps JWT errors to the canonical error format.

```typescript
// src/hooks/auth-guard.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.accessJwtVerify()
  } catch (err) {
    reply.code(401).send({
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

**What:** Global `setErrorHandler` that maps all errors to `{ error: { code, message, field, status } }`.

```typescript
// src/app.ts
app.setErrorHandler((error, request, reply) => {
  const correlationId = request.id  // Fastify assigns UUID-based IDs by default

  // Fastify validation errors (JSON Schema failures)
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

  // Known domain errors (thrown by service layer)
  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code ?? 'ERROR',
        message: error.message,
        field: (error as any).field ?? null,
        status: error.statusCode
      }
    })
  }

  // Unknown errors — log and return generic 500
  app.log.error({ correlationId, err: error }, 'Unhandled server error')
  reply.code(500).send({
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

**What:** Tests create a fresh `buildApp()` instance, use `app.inject()` for HTTP simulation, and clean the test DB between tests using Prisma.

**When to use:** All integration tests. Do NOT use supertest + listen() — inject() is faster and officially supported.

```typescript
// test/auth/signup.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('POST /api/v1/auth/signup', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean relevant tables between tests
    await app.prisma.refreshToken.deleteMany()
    await app.prisma.user.deleteMany()
  })

  it('creates a user and returns 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'test@example.com', password: 'Password123!', displayName: 'Test User' }
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
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

**Target must be ES2017 or higher** to avoid `FastifyDeprecation` warnings with Fastify 5.

### Anti-Patterns to Avoid

- **Module-level PrismaClient singleton:** `const prisma = new PrismaClient()` at module root leaks connections across test instances — use the fastify-plugin decorator instead
- **Storing refresh tokens as plain text:** Tokens are JWTs — if the DB is compromised, attacker can replay all tokens. Always store bcrypt hash
- **Using supertest + app.listen() in tests:** Requires port management, is slower, and has no advantage over `inject()` for Fastify
- **Single `@fastify/jwt` registration for both token types:** Access and refresh tokens use different secrets — using one registration means they share the same secret, which is a security gap
- **Scanning all refresh tokens with bcrypt.compare() per request:** O(N) per auth — store `jti` (UUID) in JWT payload and use it as the DB lookup key
- **Not calling `app.close()` in afterAll:** Leaves Prisma connections open, causes test suite to hang
- **tsconfig target below ES2017:** Triggers FastifyDeprecation warnings

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom crypto | `@fastify/jwt` | Algorithm agility, error handling, TypeScript types |
| Env var validation | Manual `if (!process.env.X)` | `@fastify/env` | Validates at startup before routes register, type-safe config |
| CORS handling | Manual headers | `@fastify/cors` | Handles preflight, vary headers, and credentials correctly |
| Rate limiting | Counter per IP in memory | `@fastify/rate-limit` | Handles distributed headers (X-Forwarded-For), configurable per-route |
| Password hashing | SHA-256 or MD5 | `bcryptjs` | Work factor, salt generation, timing-safe compare — DO NOT use crypto.createHash |
| UUID generation | Math.random() | `uuid` v4 | RFC 4122 compliant, collision-free |
| Request ID / correlation | incrementing counter | Fastify's built-in `requestId` | Thread-safe, configurable format |

**Key insight:** JWT, rate limiting, and CORS each have subtle correctness requirements (algorithm agility, X-Forwarded-For handling, Vary headers) that are easy to get wrong in custom code. The `@fastify` plugins are battle-tested across thousands of production deployments.

---

## Common Pitfalls

### Pitfall 1: Refresh Token Lookup by bcrypt Hash

**What goes wrong:** Developer tries to do `WHERE token_hash = bcrypt.hash(incoming)` in a SQL query. This does not work — bcrypt is non-deterministic (random salt per hash).

**Why it happens:** Misconception that bcrypt hashes are deterministic like SHA-256.

**How to avoid:** Store a deterministic lookup key (the `jti` UUID from the JWT payload) as the primary key. Store the bcrypt hash as a secondary integrity field if desired, but use `jti` for the DB lookup. Then verify the incoming token against the stored hash with `bcrypt.compare()`.

**Warning signs:** Any code that does `prisma.refreshToken.findFirst({ where: { tokenHash: someHash } })` — this will never match because bcrypt output is non-deterministic.

### Pitfall 2: @fastify/jwt Namespace TypeScript Augmentation

**What goes wrong:** After registering with `namespace: 'access'`, calling `request.jwtVerify()` throws at runtime because the default method is not registered; only `request.accessJwtVerify()` exists.

**Why it happens:** Namespace creates prefixed methods, not the default `jwtVerify`.

**How to avoid:** Always use the namespaced methods. Declare augmented types:

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    accessJwt: JWT
    refreshJwt: JWT
  }
  interface FastifyRequest {
    accessJwtVerify: () => Promise<void>
    refreshJwtVerify: () => Promise<void>
    user: { id: string; email: string; isGlobalAdmin: boolean }
  }
}
```

### Pitfall 3: fastify-plugin Omission for Prisma Decorator

**What goes wrong:** Decorator added in a plugin without `fp()` wrapper is not visible outside that plugin scope — routes registered in a different plugin scope get `TypeError: server.prisma is not a function`.

**Why it happens:** Fastify's plugin system encapsulates decorators by default.

**How to avoid:** Always wrap the Prisma plugin with `fp(async (server) => { ... })` from `fastify-plugin`.

**Warning signs:** `server.prisma is not defined` error in route handlers when the prisma plugin appears to be registered.

### Pitfall 4: Prisma Test DB Isolation

**What goes wrong:** Tests share database state — a user created in test A causes a unique constraint error in test B.

**Why it happens:** Tests run against the same PostgreSQL DB, and the `beforeEach` cleanup is missing or only partially cleans.

**How to avoid:** In `beforeEach`, call `prisma.refreshToken.deleteMany()` before `prisma.user.deleteMany()` (due to FK constraints). Use `TEST_DATABASE_URL` env var pointing to a separate `mukwano_test` database. Run `prisma migrate deploy` on the test DB in the test setup.

**Warning signs:** Flaky tests that pass in isolation but fail when run together.

### Pitfall 5: bcrypt Cost Factor in Tests

**What goes wrong:** Integration tests take 60+ seconds because bcrypt at cost 12 is intentionally slow — running 20 signup tests means 20 bcrypt hash operations.

**Why it happens:** Cost factor 12 is appropriate for production but not for tests.

**How to avoid:** In the test environment, detect `NODE_ENV === 'test'` and use cost factor 4 (minimum). The security property is tested structurally, not by actually being slow.

```typescript
const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12
```

### Pitfall 6: Fastify target below ES2017

**What goes wrong:** `FastifyDeprecation` warnings flood the console and some async patterns behave differently.

**Why it happens:** Fastify 5 requires ES2017+ for async/await without transpilation overhead.

**How to avoid:** Set `"target": "ES2022"` in `tsconfig.base.json`.

### Pitfall 7: Docker Not Present on Dev Machine

**What goes wrong:** `docker compose up` fails immediately — PostgreSQL never starts — `prisma migrate dev` fails.

**Why it happens:** Docker Desktop not installed (confirmed: not available on this machine).

**How to avoid:** Phase plan must include a Wave 0 task: "Install Docker Desktop or configure local PostgreSQL fallback." If Docker is unavailable, set `DATABASE_URL` to a local PostgreSQL instance (Homebrew: `brew install postgresql@16`). `pg_isready` is confirmed available at `/opt/homebrew/bin/pg_isready` (version 17.5).

---

## Code Examples

Verified patterns from official sources:

### Prisma Schema for Phase 1

```prisma
// packages/api/prisma/schema.prisma
// Source: SYSTEM_DESIGN.md §5 + §7

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
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash")
  family     String    @db.Uuid
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

### Docker Compose (PostgreSQL 16 with healthcheck)

```yaml
# docker-compose.yml (repo root)
# Source: Docker Compose docs + healthcheck guide
version: '3.9'

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
    dotenv: true,           // reads .env file
    dotenvConfig: { path: '.env' }
  })
})
```

### Root package.json (npm workspaces)

```json
{
  "name": "mukwano",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:api": "npm -w packages/api run dev",
    "test:api": "npm -w packages/api run test",
    "build:api": "npm -w packages/api run build"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node-dev` for hot reload | `tsx watch` | 2023 | tsx is faster, no separate config needed, ESM-native |
| `fastify-jwt` (unscoped) | `@fastify/jwt` (scoped) | Fastify v4 → v5 era | The scoped package is the maintained version |
| PrismaClient module singleton | fastify-plugin decorator | Prisma v5+ era | Decorator prevents connection leaks across test instances |
| `supertest` + `app.listen()` | `app.inject()` | Fastify v3+ | inject() is officially supported, faster, no port needed |
| `jsonwebtoken` directly | `@fastify/jwt` | Fastify ecosystem | Plugin handles TypeScript types, error formatting, hooks integration |

**Deprecated/outdated:**
- `fastify-jwt` (unscoped): Replaced by `@fastify/jwt` — do not install `fastify-jwt`
- `ts-node` for production builds: Use `tsx` for dev, compile to JS for production
- `fastify@4`: Version 5.x is current; ensure Fastify 5 patterns are used (e.g., `await app.register()` instead of callbacks)

---

## Open Questions

1. **Separate test database setup**
   - What we know: Tests need a clean DB; `beforeEach` with `deleteMany()` works but requires correct FK ordering
   - What's unclear: Whether to use a dedicated `mukwano_test` database or the same database with table truncation in transactions
   - Recommendation: Use `DATABASE_URL_TEST` environment variable pointing to `mukwano_test` database. Add a `vitest.config.ts` that sets `process.env.DATABASE_URL = process.env.DATABASE_URL_TEST` via `setupFiles`. This prevents test runs from wiping the dev database.

2. **@fastify/jwt namespace TypeScript declaration merging**
   - What we know: Namespace option creates prefixed methods (`request.accessJwtVerify()`)
   - What's unclear: The exact TypeScript augmentation for namespaced methods in @fastify/jwt 10.x may require manually declaring the prefixed methods in `fastify.d.ts`
   - Recommendation: Declare augmentation manually and test TypeScript compilation in Wave 1; if the official types expose namespaced methods automatically, remove the manual declaration.

3. **bcryptjs vs bcrypt (native)**
   - What we know: `bcryptjs` 3.0.3 is pure JS (no native compilation); `bcrypt` 6.0.0 requires node-gyp build
   - What's unclear: Whether the build environment supports native addons
   - Recommendation: Use `bcryptjs` — eliminates native build dependency with negligible performance difference for MVP scale.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | YES | v25.6.1 | — |
| npm | Package management | YES | 11.11.0 | — |
| Docker / Docker Desktop | PostgreSQL 16 via Compose | NO | — | Local PostgreSQL (Homebrew) |
| pg_isready | DB health probe in scripts | YES | 17.5 (Homebrew) | — |
| PostgreSQL (local) | Direct DB connection | YES (port 5432 open) | 17.x (Homebrew) | — |
| tsx | Dev hot reload | Not global (install locally) | 4.21.0 via npm | — |
| vitest | Testing | Not global (install locally) | 4.1.2 via npm | — |

**Missing dependencies with no fallback:**
- Docker — required for `docker compose up` pattern in D-26. Must either install Docker Desktop or use local PostgreSQL. Port 5432 is already accepting connections (Homebrew PostgreSQL is running), so local PostgreSQL IS available as an immediate fallback.

**Missing dependencies with fallback:**
- Docker: Use local Homebrew PostgreSQL. Create database manually: `createdb mukwano && createdb mukwano_test`. Update `DATABASE_URL` in `.env` to point to local instance. Docker Compose file should still be created for reproducibility but does not need to be used during initial development.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `packages/api/vitest.config.ts` — Wave 0 gap |
| Quick run command | `npm -w packages/api test -- --run` |
| Full suite command | `npm -w packages/api test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /auth/signup creates user, hashes password, returns JWT pair | Integration | `vitest run test/auth/signup.test.ts` | Wave 0 gap |
| AUTH-01 | POST /auth/signup rejects duplicate email (409) | Integration | `vitest run test/auth/signup.test.ts` | Wave 0 gap |
| AUTH-01 | POST /auth/signup validates required fields (422 with field) | Integration | `vitest run test/auth/signup.test.ts` | Wave 0 gap |
| AUTH-02 | POST /auth/login returns accessToken + refreshToken on valid creds | Integration | `vitest run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-02 | POST /auth/login returns 401 on wrong password | Integration | `vitest run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-02 | POST /auth/login access token expires in ~15 min (check `exp` claim) | Unit | `vitest run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-03 | POST /auth/refresh returns new accessToken + new refreshToken | Integration | `vitest run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-03 | POST /auth/refresh invalidates old refresh token (cannot reuse) | Integration | `vitest run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-03 | POST /auth/refresh returns 401 on expired refresh token | Integration | `vitest run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-04 | POST /auth/logout marks refresh token as revoked | Integration | `vitest run test/auth/logout.test.ts` | Wave 0 gap |
| AUTH-04 | POST /auth/logout does NOT revoke sibling tokens in same family | Integration | `vitest run test/auth/logout.test.ts` | Wave 0 gap |
| AUTH-05 | GET /auth/me returns current user profile | Integration | `vitest run test/auth/me.test.ts` | Wave 0 gap |
| AUTH-05 | PATCH /auth/me updates displayName, country, sector | Integration | `vitest run test/auth/me.test.ts` | Wave 0 gap |
| AUTH-05 | GET /auth/me returns 401 without Authorization header | Integration | `vitest run test/auth/me.test.ts` | Wave 0 gap |
| AUTH-06 | POST /auth/refresh with revoked token returns 401 AND revokes whole family | Integration | `vitest run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-06 | After family revocation, sibling tokens (other sessions) also return 401 | Integration | `vitest run test/auth/refresh.test.ts` | Wave 0 gap |
| AUTH-07 | isGlobalAdmin field is present in JWT payload on login | Integration | `vitest run test/auth/login.test.ts` | Wave 0 gap |
| AUTH-07 | isGlobalAdmin=false for regular users, true for admin users | Integration | `vitest run test/auth/login.test.ts` | Wave 0 gap |
| DEMO-01 | GET /api/v1/config returns { demoMode, currency, escrowLabel } | Integration | `vitest run test/config.test.ts` | Wave 0 gap |
| DEMO-01 | demoMode=true when DEMO_MODE=true in env | Integration | `vitest run test/config.test.ts` | Wave 0 gap |
| DEMO-01 | escrowLabel = "Simulated escrow — no real funds" when demoMode=true | Integration | `vitest run test/config.test.ts` | Wave 0 gap |
| DEMO-01 | GET /api/v1/config is public (no auth header required) | Integration | `vitest run test/config.test.ts` | Wave 0 gap |

### Edge Cases That Must Be Covered

| Scenario | Why Critical |
|----------|-------------|
| Signup with `email` that has mixed case (`User@Example.COM`) | Email uniqueness must be case-insensitive — either normalize to lowercase on insert or add `LOWER(email)` unique index |
| Refresh token from a different user's family | JWT signature prevents cross-user forgery, but test explicitly confirms this |
| PATCH /auth/me attempting to update `email` or `passwordHash` | Mass assignment — must whitelist only `displayName`, `country`, `sector` |
| POST /auth/refresh with a valid-looking JWT signed with wrong secret | Should return 401, not 500 — error handler must not leak JWT error details |
| POST /auth/signup with password below minimum length | 422 with `field: "password"` — schema validation |
| Two simultaneous refresh calls with the same token (race condition) | One succeeds, one gets 401 — DB unique constraint on new token prevents duplicate issuance; Prisma transaction isolation handles this |
| POST /auth/logout without a valid access token | 401 — logout itself requires authentication |

### Sampling Rate

- **Per task commit:** `npm -w packages/api test -- --run` (all tests, no watch)
- **Per wave merge:** `npm -w packages/api test -- --run --coverage` (full suite + coverage)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/api/vitest.config.ts` — framework config, test DB URL, globals
- [ ] `packages/api/test/setup.ts` — global setup: run Prisma migrate on test DB, seed if needed
- [ ] `packages/api/test/auth/signup.test.ts` — covers AUTH-01
- [ ] `packages/api/test/auth/login.test.ts` — covers AUTH-02, AUTH-07
- [ ] `packages/api/test/auth/refresh.test.ts` — covers AUTH-03, AUTH-06
- [ ] `packages/api/test/auth/logout.test.ts` — covers AUTH-04
- [ ] `packages/api/test/auth/me.test.ts` — covers AUTH-05
- [ ] `packages/api/test/config.test.ts` — covers DEMO-01
- [ ] Framework install: `npm -w packages/api install vitest` — if not already in package.json

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
| GSD Workflow Enforcement | CLAUDE.md | All file changes via GSD execute-phase, not direct edits |

---

## Sources

### Primary (HIGH confidence)

- Fastify official docs — https://fastify.dev/docs/latest/Guides/Testing/ — inject() pattern, app factory, close()
- Fastify TypeScript docs — https://fastify.dev/docs/latest/Reference/TypeScript/ — declaration merging, plugin types, FastifyRequest.user
- @fastify/jwt GitHub README — https://github.com/fastify/fastify-jwt — namespace option, dual registration, TypeScript augmentation
- Prisma + Fastify — https://www.prisma.io/fastify — fastify-plugin decorator pattern
- npm registry (verified 2026-03-30) — all package versions listed in Standard Stack table

### Secondary (MEDIUM confidence)

- Docker Compose healthcheck docs — https://docs.docker.com/compose/how-tos/startup-order/ — PostgreSQL healthcheck pattern
- @fastify/env GitHub — https://github.com/fastify/fastify-env — dotenv option, JSON Schema validation
- SYSTEM_DESIGN.md §5, §7, §15, §19 — canonical schema, error format, token strategy (project-authoritative)

### Tertiary (LOW confidence — needs validation)

- bcrypt vs argon2 comparison — https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/ — security recommendation (argon2id preferred, but bcrypt locked by CONTEXT)
- JWT refresh token rotation pattern — https://dev.to/devforgedev/jwt-refresh-token-rotation-in-nodejs-the-complete-implementation-2f2b — family revocation implementation pattern (verify against actual Prisma query behavior)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against npm registry 2026-03-30
- Architecture: HIGH — Fastify factory + plugin decorator patterns confirmed in official docs
- JWT dual-namespace pattern: MEDIUM — namespace option confirmed in @fastify/jwt README; TypeScript augmentation for namespaced methods needs validation in Wave 1 implementation
- Token family revocation logic: MEDIUM — algorithmic logic is sound; jti-based lookup is confirmed community pattern; exact Prisma query syntax needs runtime verification
- Docker environment: HIGH — Docker confirmed absent; local PostgreSQL confirmed running on port 5432

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable ecosystem — Fastify, Prisma, JWT patterns change slowly)
