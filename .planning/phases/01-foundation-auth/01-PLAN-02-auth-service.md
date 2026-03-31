---
phase: 01-foundation-auth
plan: 02
type: execute
wave: 2
depends_on:
  - "01-PLAN-01"
files_modified:
  - packages/api/src/services/auth.service.ts
  - packages/api/src/routes/auth/index.ts
  - packages/api/src/routes/auth/signup.ts
  - packages/api/src/routes/auth/login.ts
  - packages/api/src/routes/auth/refresh.ts
  - packages/api/src/routes/auth/logout.ts
  - packages/api/src/routes/auth/me.ts
  - packages/api/src/app.ts
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
  - AUTH-07

must_haves:
  truths:
    - "POST /api/v1/auth/signup with valid email/password/displayName returns 201 with accessToken and refreshToken"
    - "POST /api/v1/auth/signup with a duplicate email returns 409 with error.code = EMAIL_ALREADY_EXISTS"
    - "POST /api/v1/auth/signup with a short password returns 422 with error.field = password"
    - "POST /api/v1/auth/login with correct credentials returns 200 with accessToken and refreshToken; accessToken payload contains isGlobalAdmin"
    - "POST /api/v1/auth/login with wrong password returns 401"
    - "POST /api/v1/auth/refresh with a valid refresh token returns 200 with new accessToken and refreshToken; old refresh token is revoked"
    - "POST /api/v1/auth/refresh with a previously-used (revoked) refresh token returns 401 and ALL tokens in that family are revoked"
    - "POST /api/v1/auth/logout with a valid refresh token returns 200; that specific token is revoked but sibling tokens remain valid"
    - "GET /api/v1/auth/me with valid Authorization header returns user profile without passwordHash"
    - "PATCH /api/v1/auth/me updates displayName, country, sector; email and passwordHash fields are silently ignored (mass assignment protection)"
    - "Email is normalized to lowercase before storage and uniqueness check"
  artifacts:
    - path: "packages/api/src/services/auth.service.ts"
      provides: "AuthService class with signup, login, refresh, logout, getMe, updateMe"
      exports: ["AuthService"]
    - path: "packages/api/src/routes/auth/signup.ts"
      provides: "POST /api/v1/auth/signup handler"
      contains: "schema"
    - path: "packages/api/src/routes/auth/refresh.ts"
      provides: "POST /api/v1/auth/refresh handler with token rotation"
      contains: "refreshTokens"
    - path: "packages/api/src/routes/auth/me.ts"
      provides: "GET + PATCH /api/v1/auth/me handlers"
      contains: "authGuard"
  key_links:
    - from: "packages/api/src/routes/auth/index.ts"
      to: "packages/api/src/services/auth.service.ts"
      via: "AuthService import"
      pattern: "AuthService"
    - from: "packages/api/src/routes/auth/signup.ts"
      to: "packages/api/src/services/auth.service.ts"
      via: "authService.signup()"
      pattern: "signup"
    - from: "packages/api/src/routes/auth/refresh.ts"
      to: "packages/api/src/services/auth.service.ts"
      via: "authService.refresh()"
      pattern: "refresh"
    - from: "packages/api/src/app.ts"
      to: "packages/api/src/routes/auth/index.ts"
      via: "app.register(authRoutes, { prefix: '/api/v1/auth' })"
      pattern: "authRoutes"
---

<objective>
Implement all 6 auth endpoints and the AuthService containing all auth business logic.

Purpose: This is the core deliverable of Phase 1. Every subsequent phase uses AuthGuard to protect routes — it must work correctly before any protected route can be built.

Output:
- AuthService: signup, login, refresh (with rotation + family revocation), logout, getMe, updateMe
- 6 route files: signup, login, refresh, logout, me (GET+PATCH)
- All routes registered at /api/v1/auth/* in buildApp()
- Token family revocation (reuse detection) fully working
- Email normalization to lowercase
- Password minimum length validation (8 chars)
- Mass assignment protection on PATCH /auth/me
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-auth/1-CONTEXT.md
@.planning/phases/01-foundation-auth/01-RESEARCH.md
@SYSTEM_DESIGN.md
@.planning/phases/01-foundation-auth/01-PLAN-01-SUMMARY.md

<interfaces>
<!-- Contracts from Plan 01 that this plan builds on -->

From packages/api/src/types/fastify.d.ts:
  FastifyInstance.prisma: PrismaClient
  FastifyInstance.config: { JWT_SECRET, REFRESH_TOKEN_SECRET, DEMO_MODE, PORT, DATABASE_URL, CORS_ORIGIN }
  FastifyRequest.user: { id: string, email: string, isGlobalAdmin: boolean }
  FastifyRequest.accessJwtVerify: () => Promise<unknown>
  FastifyRequest.refreshJwtVerify: () => Promise<unknown>
  FastifyReply.accessJwtSign: (payload: object) => Promise<string>
  FastifyReply.refreshJwtSign: (payload: object) => Promise<string>

From packages/api/src/errors/http-errors.ts:
  class UnauthorizedError(code?: string, message?: string)  -- 401
  class ConflictError(code: string, message: string)        -- 409
  class ValidationError(message: string, field?: string)    -- 422

From packages/api/prisma/schema.prisma:
  model User { id, email, passwordHash, displayName, country, sector, avatarUrl, isGlobalAdmin, ... }
  model RefreshToken { id, userId, tokenHash, family, expiresAt, revokedAt, ... }

  CRITICAL: RefreshToken.id is set by the application (= jti UUID from JWT payload)
  CRITICAL: Never query by tokenHash — query by id (jti). bcrypt is non-deterministic.

AuthGuard pattern (from RESEARCH.md Pattern 5):
  export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await request.accessJwtVerify()
    } catch {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', field: null, status: 401 } })
    }
  }

Token rotation logic (from RESEARCH.md Pattern 4):
  1. Decode JWT to get jti (= refresh_tokens.id) WITHOUT verifying signature first
  2. Look up refresh_tokens record by id = jti (O(1) lookup)
  3. If revokedAt != null → revoke entire family (updateMany WHERE family = tokenRecord.family) → throw 401 TOKEN_REUSE_DETECTED
  4. If expiresAt < now → throw 401 TOKEN_EXPIRED
  5. Verify JWT signature (after DB check)
  6. Revoke old token (update revokedAt = now)
  7. Issue new token pair with same family, new jti UUID
  8. Store new refresh token with id = new jti, tokenHash = bcrypt.hash(newToken)

BCRYPT_COST: process.env.NODE_ENV === 'test' ? 4 : 12
  (Cost 4 in tests prevents 60+ second test suites — per RESEARCH.md)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: AuthService — signup, login, refresh, logout, getMe, updateMe</name>
  <files>
    packages/api/src/services/auth.service.ts
    packages/api/src/hooks/auth-guard.ts
  </files>
  <read_first>
    - packages/api/src/types/fastify.d.ts (all augmentations from Plan 01)
    - packages/api/src/errors/http-errors.ts (error classes from Plan 01)
    - packages/api/prisma/schema.prisma (exact field names — passwordHash not password_hash)
    - .planning/phases/01-foundation-auth/01-RESEARCH.md (Pattern 4 token rotation, Pattern 5 authGuard, Pitfall 1 bcrypt non-determinism, Anti-patterns)
    - .planning/phases/01-foundation-auth/1-CONTEXT.md (D-11 through D-16 — all auth business rules)
    - SYSTEM_DESIGN.md §7 (token payloads, refresh_tokens table structure)
  </read_first>
  <behavior>
    - signup('User@Example.COM', ...) → email stored as 'user@example.com' (normalized)
    - signup with existing email → throws ConflictError('EMAIL_ALREADY_EXISTS', ...)
    - signup with password < 8 chars → throws ValidationError('Password must be at least 8 characters', 'password')
    - login with wrong password → throws UnauthorizedError('INVALID_CREDENTIALS')
    - login returns { accessToken, refreshToken, user: { id, email, displayName, isGlobalAdmin } }
    - accessToken payload: { sub: userId, email, isGlobalAdmin }
    - refreshToken payload: { sub: userId, tokenFamily: uuid, jti: uuid } where jti === refresh_tokens.id
    - refresh with valid token → returns new { accessToken, refreshToken }; old refresh_tokens record has revokedAt set
    - refresh with revoked token → updateMany sets revokedAt on ALL rows WHERE family = tokenRecord.family; throws UnauthorizedError('TOKEN_REUSE_DETECTED')
    - logout revokes ONLY the presented token (updates revokedAt WHERE id = jti); sibling tokens in same family are NOT revoked
    - getMe returns { id, email, displayName, country, sector, avatarUrl, isGlobalAdmin } — no passwordHash
    - updateMe accepts { displayName?, country?, sector? } ONLY — email and passwordHash fields are silently ignored
  </behavior>
  <action>
Create packages/api/src/services/auth.service.ts with an AuthService class. Inject FastifyInstance into the constructor so the service has access to app.prisma, app.accessJwt, and app.refreshJwt.

```typescript
// packages/api/src/services/auth.service.ts
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { FastifyInstance } from 'fastify'
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError } from '../errors/http-errors.js'

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  // AUTH-01 (per D-11, D-12, D-16)
  async signup(rawEmail: string, password: string, displayName: string) {
    const email = rawEmail.toLowerCase().trim()  // normalize per VALIDATION.md edge case

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password')
    }

    // Check duplicate email (per AUTH-01)
    const existing = await this.app.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists')

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
    const user = await this.app.prisma.user.create({
      data: { email, passwordHash, displayName }
    })

    return this.issueTokenPair(user)
  }

  // AUTH-02, AUTH-07
  async login(rawEmail: string, password: string) {
    const email = rawEmail.toLowerCase().trim()
    const user = await this.app.prisma.user.findUnique({ where: { email } })

    // Use same error for "user not found" and "wrong password" — prevents email enumeration
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    return this.issueTokenPair(user)
  }

  // AUTH-03, AUTH-06 (token rotation + family revocation)
  async refresh(rawRefreshToken: string) {
    // Step 1: Decode WITHOUT verifying — get jti for DB lookup
    // CRITICAL: Do NOT verify first — decode is safe and gives us the lookup key
    const decoded = this.app.refreshJwt.decode(rawRefreshToken) as {
      sub: string
      jti: string
      tokenFamily: string
      exp: number
    } | null

    if (!decoded?.jti) throw new UnauthorizedError('INVALID_TOKEN', 'Invalid refresh token')

    // Step 2: Look up by primary key (jti = refresh_tokens.id)
    const tokenRecord = await this.app.prisma.refreshToken.findUnique({
      where: { id: decoded.jti },
      include: { user: true }
    })

    if (!tokenRecord) throw new UnauthorizedError('TOKEN_NOT_FOUND', 'Refresh token not found')

    // Step 3: Reuse detection (AUTH-06) — revoke entire family
    if (tokenRecord.revokedAt !== null) {
      await this.app.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family, revokedAt: null },
        data: { revokedAt: new Date() }
      })
      throw new UnauthorizedError('TOKEN_REUSE_DETECTED', 'Token reuse detected — all sessions revoked')
    }

    // Step 4: Check expiry
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('TOKEN_EXPIRED', 'Refresh token has expired')
    }

    // Step 5: Verify JWT signature (after DB checks — fail fast on DB issues first)
    try {
      await this.app.refreshJwt.verify(rawRefreshToken)
    } catch {
      throw new UnauthorizedError('INVALID_TOKEN', 'Invalid refresh token signature')
    }

    // Step 6: Revoke old token (AUTH-13)
    await this.app.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() }
    })

    // Step 7: Issue new pair — same family, new jti
    return this.issueTokenPair(tokenRecord.user, tokenRecord.family)
  }

  // AUTH-04 (single token revocation — NOT the entire family)
  async logout(rawRefreshToken: string) {
    const decoded = this.app.refreshJwt.decode(rawRefreshToken) as { jti?: string } | null

    if (!decoded?.jti) {
      // Graceful: if token is malformed, treat as already logged out
      return
    }

    await this.app.prisma.refreshToken.updateMany({
      where: { id: decoded.jti, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }

  // AUTH-05
  async getMe(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        country: true,
        sector: true,
        avatarUrl: true,
        isGlobalAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })
    if (!user) throw new NotFoundError('User not found')
    return user  // passwordHash is NEVER selected
  }

  // AUTH-05 — mass assignment protection: only allowlisted fields
  async updateMe(userId: string, body: Record<string, unknown>) {
    const allowed = {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      country: typeof body.country === 'string' ? body.country : undefined,
      sector: typeof body.sector === 'string' ? body.sector : undefined
    }
    // Remove undefined fields
    const data = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined))

    const user = await this.app.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, displayName: true,
        country: true, sector: true, avatarUrl: true,
        isGlobalAdmin: true, createdAt: true, updatedAt: true
      }
    })
    return user
  }

  // Private: issue access + refresh token pair (AUTH-11, AUTH-12)
  private async issueTokenPair(
    user: { id: string; email: string; isGlobalAdmin: boolean },
    existingFamily?: string
  ) {
    const family = existingFamily ?? uuidv4()  // new family on login, same family on rotation
    const jti = uuidv4()  // this UUID becomes the refresh_tokens.id primary key

    // Access token payload: { sub, email, isGlobalAdmin } (per D-11)
    const accessToken = await this.app.accessJwt.sign({
      sub: user.id,
      email: user.email,
      isGlobalAdmin: user.isGlobalAdmin
    })

    // Refresh token payload: { sub, tokenFamily, jti } (per D-12)
    const refreshToken = await this.app.refreshJwt.sign({
      sub: user.id,
      tokenFamily: family,
      jti
    })

    // Store refresh token — id = jti (lookup key), tokenHash = bcrypt (integrity only)
    await this.app.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, BCRYPT_COST),
        family,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days
      }
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, isGlobalAdmin: user.isGlobalAdmin }
    }
  }
}
```

Also create packages/api/src/hooks/auth-guard.ts (per D-17, D-18):
```typescript
// src/hooks/auth-guard.ts
// AuthGuard preHandler — verifies access JWT signature + expiry, attaches req.user
// Usage: fastify.get('/protected', { preHandler: authGuard }, handler)
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // accessJwtVerify() populates request.user automatically via @fastify/jwt namespace
    await request.accessJwtVerify()
  } catch {
    // Do NOT leak JWT error details — return canonical 401 format (per D-18, D-20)
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
```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit 2>&1 | head -20</automated>
    <automated>grep -q 'TOKEN_REUSE_DETECTED' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts && echo "OK: reuse detection present" || echo "FAIL: missing reuse detection"</automated>
    <automated>grep -q 'updateMany' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts && echo "OK: updateMany (family revocation) present" || echo "FAIL: missing family revocation"</automated>
    <automated>grep -q 'toLowerCase' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts && echo "OK: email normalization present" || echo "FAIL: missing email normalization"</automated>
  </verify>
  <acceptance_criteria>
    - tsc --noEmit exits 0
    - grep -q 'class AuthService' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts
    - grep -q 'TOKEN_REUSE_DETECTED' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts
    - grep -q 'updateMany' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts (family revocation)
    - grep -q 'toLowerCase' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts (email normalization)
    - grep -q 'BCRYPT_COST' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts
    - grep -q "process.env.NODE_ENV === 'test' ? 4 : 12" /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts
    - grep -q 'passwordHash' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts (field name matches Prisma model)
    - grep -q 'authGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/hooks/auth-guard.ts
    - grep -q 'accessJwtVerify' /Users/levicheptoyek/MUKWANO/packages/api/src/hooks/auth-guard.ts
    - PATCH /auth/me code: email and passwordHash are NOT in the `data` object sent to prisma.user.update
  </acceptance_criteria>
  <done>AuthService implements all 7 auth business rules (signup, login, refresh with rotation, logout, getMe, updateMe, reuse detection). authGuard hook exists. Email normalization present. BCRYPT_COST is 4 in test, 12 in production. tsc --noEmit exits 0.</done>
</task>

<task type="auto">
  <name>Task 2: Auth route handlers + registration in buildApp()</name>
  <files>
    packages/api/src/routes/auth/index.ts
    packages/api/src/routes/auth/signup.ts
    packages/api/src/routes/auth/login.ts
    packages/api/src/routes/auth/refresh.ts
    packages/api/src/routes/auth/logout.ts
    packages/api/src/routes/auth/me.ts
    packages/api/src/app.ts
  </files>
  <read_first>
    - packages/api/src/services/auth.service.ts (AuthService methods just created)
    - packages/api/src/hooks/auth-guard.ts (authGuard hook just created)
    - packages/api/src/app.ts (current state — needs authRoutes registered, comment removed)
    - SYSTEM_DESIGN.md §6 (API endpoints) and §19 (error format)
    - .planning/phases/01-foundation-auth/01-VALIDATION.md (test expectations — schema must match)
  </read_first>
  <action>
Create 5 route files and one index router. Then update app.ts to register them.

All routes use Fastify JSON Schema for request validation (body schema required on POST/PATCH).
Validation schema fields must match exactly what VALIDATION.md tests expect.

**packages/api/src/routes/auth/signup.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'

export const signupRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          displayName: { type: 'string', minLength: 1, maxLength: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, displayName } = request.body as {
      email: string; password: string; displayName: string
    }
    const result = await authService.signup(email, password, displayName)
    return reply.code(201).send(result)
  })
}
```
NOTE: Fastify JSON Schema minLength: 8 on password provides the first layer; AuthService also validates as defense-in-depth.

**packages/api/src/routes/auth/login.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'

export const loginRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    const result = await authService.login(email, password)
    return reply.send(result)
  })
}
```

**packages/api/src/routes/auth/refresh.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'

export const refreshRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    const result = await authService.refresh(refreshToken)
    return reply.send(result)
  })
}
```

**packages/api/src/routes/auth/logout.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const logoutRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/logout', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    await authService.logout(refreshToken)
    return reply.code(200).send({ message: 'Logged out successfully' })
  })
}
```
NOTE: logout requires auth (valid access token) per D-17. Without authGuard, unauthenticated POST /logout would return 200 (VALIDATION.md edge case: "POST /auth/logout without auth header → 401").

**packages/api/src/routes/auth/me.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const meRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  // GET /auth/me — returns current user profile (per AUTH-05)
  fastify.get('/me', { preHandler: authGuard }, async (request, reply) => {
    const user = await authService.getMe(request.user.id)
    return reply.send(user)
  })

  // PATCH /auth/me — updates profile fields (per AUTH-05)
  fastify.patch('/me', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 100 },
          country: { type: 'string', maxLength: 100 },
          sector: { type: 'string', maxLength: 100 }
        },
        additionalProperties: false  // Reject unknown fields at schema level
      }
    }
  }, async (request, reply) => {
    // Even with additionalProperties: false, explicitly whitelist in service (defense-in-depth)
    const user = await authService.updateMe(request.user.id, request.body as Record<string, unknown>)
    return reply.send(user)
  })
}
```
CRITICAL: `additionalProperties: false` in schema + explicit field selection in AuthService.updateMe() provides double protection against mass assignment of email or passwordHash (per VALIDATION.md edge case).

**packages/api/src/routes/auth/index.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify'
import { signupRoute } from './signup.js'
import { loginRoute } from './login.js'
import { refreshRoute } from './refresh.js'
import { logoutRoute } from './logout.js'
import { meRoute } from './me.js'

// Registers all auth sub-routes. Prefix /api/v1/auth applied by buildApp().
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(signupRoute)
  await fastify.register(loginRoute)
  await fastify.register(refreshRoute)
  await fastify.register(logoutRoute)
  await fastify.register(meRoute)
}
```

**Update packages/api/src/app.ts — uncomment the authRoutes registration:**
Read the current app.ts first. Find the commented-out block:
```
// await app.register(authRoutes, { prefix: '/api/v1/auth' })
// await app.register(configRoute, { prefix: '/api/v1' })
```
Replace with:
```typescript
import { authRoutes } from './routes/auth/index.js'
// Add import at top of file

// In buildApp():
await app.register(authRoutes, { prefix: '/api/v1/auth' })
// configRoute will be added in Plan 03
```
The configRoute line stays commented out until Plan 03 creates that file.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit 2>&1 | head -20</automated>
    <automated>grep -q 'authRoutes' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts && echo "OK: authRoutes registered" || echo "FAIL: authRoutes not in app.ts"</automated>
    <automated>grep -q 'additionalProperties.*false' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/me.ts && echo "OK: mass assignment protection in schema" || echo "FAIL: missing additionalProperties: false"</automated>
    <automated>grep -q 'preHandler.*authGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/logout.ts && echo "OK: logout requires auth" || echo "FAIL: logout missing authGuard"</automated>
  </verify>
  <acceptance_criteria>
    - tsc --noEmit exits 0
    - All 5 route files exist: signup.ts, login.ts, refresh.ts, logout.ts, me.ts in packages/api/src/routes/auth/
    - grep -q 'authRoutes' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q "prefix: '/api/v1/auth'" /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q 'preHandler.*authGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/logout.ts
    - grep -q 'preHandler.*authGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/me.ts (appears twice: GET and PATCH)
    - grep -q 'additionalProperties.*false' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/me.ts
    - grep -q "format: 'email'" /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/signup.ts
    - All 5 routes imported in packages/api/src/routes/auth/index.ts
  </acceptance_criteria>
  <done>All 6 auth endpoints exist (signup, login, refresh, logout, GET /me, PATCH /me). Routes registered at /api/v1/auth/* in buildApp(). logout and both /me routes require authGuard. PATCH /me has additionalProperties: false. tsc --noEmit exits 0.</done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# 1. TypeScript clean
cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit

# 2. All auth route files exist
ls /Users/levicheptoyek/MUKWANO/packages/api/src/routes/auth/

# 3. AuthService has all methods
grep -n 'async ' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts

# 4. Family revocation present
grep -n 'updateMany' /Users/levicheptoyek/MUKWANO/packages/api/src/services/auth.service.ts

# 5. App registers auth routes
grep 'authRoutes\|/api/v1/auth' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
```
</verification>

<success_criteria>
- tsc --noEmit exits 0
- AuthService has: signup, login, refresh, logout, getMe, updateMe, issueTokenPair
- refresh() detects reuse: revokedAt != null → updateMany WHERE family → 401 TOKEN_REUSE_DETECTED
- logout() only revokes the presented token's id; does NOT touch siblings
- Email normalized to lowercase before DB query and storage
- BCRYPT_COST = 4 in test, 12 in production
- PATCH /me ignores email and passwordHash (additionalProperties: false + service whitelist)
- All routes registered at /api/v1/auth/* in buildApp()
- authGuard applied to: GET /auth/me, PATCH /auth/me, POST /auth/logout
</success_criteria>

<output>
After completion, create `/Users/levicheptoyek/MUKWANO/.planning/phases/01-foundation-auth/01-PLAN-02-SUMMARY.md` using the summary template.
</output>
