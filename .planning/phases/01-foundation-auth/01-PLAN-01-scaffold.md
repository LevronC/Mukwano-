---
phase: 01-foundation-auth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.base.json
  - docker-compose.yml
  - .env.example
  - .gitignore
  - packages/api/package.json
  - packages/api/tsconfig.json
  - packages/api/vitest.config.ts
  - packages/api/prisma/schema.prisma
  - packages/api/src/app.ts
  - packages/api/src/server.ts
  - packages/api/src/types/fastify.d.ts
  - packages/web/package.json
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
  - AUTH-07
  - DEMO-01

must_haves:
  truths:
    - "npm install succeeds at repo root (workspaces resolve packages/api and packages/web)"
    - "docker-compose.yml exists and declares postgres:16 service on port 5432"
    - "Prisma schema declares users and refresh_tokens models with all columns from SYSTEM_DESIGN.md §5 and §7"
    - "prisma migrate dev (or db push) applies schema to the database without errors"
    - "prisma generate produces @prisma/client with User and RefreshToken types"
    - "packages/api builds without TypeScript errors: tsc --noEmit exits 0"
    - "packages/api/src/app.ts exports buildApp() with all plugins registered"
    - "vitest.config.ts exists and npm -w packages/api test -- --run exits without crash"
  artifacts:
    - path: "package.json"
      provides: "npm workspaces root"
      contains: "workspaces"
    - path: "packages/api/prisma/schema.prisma"
      provides: "users + refresh_tokens Prisma models"
      contains: "model User"
    - path: "packages/api/src/app.ts"
      provides: "buildApp() factory"
      contains: "buildApp"
    - path: "packages/api/src/types/fastify.d.ts"
      provides: "TypeScript declaration merging"
      contains: "FastifyInstance"
    - path: "docker-compose.yml"
      provides: "Local PostgreSQL 16"
      contains: "postgres:16"
  key_links:
    - from: "packages/api/package.json"
      to: "packages/api/prisma/schema.prisma"
      via: "prisma script alias"
      pattern: "prisma"
    - from: "packages/api/src/app.ts"
      to: "packages/api/src/plugins/prisma.ts"
      via: "app.register(prismaPlugin)"
      pattern: "prismaPlugin"
    - from: "packages/api/src/types/fastify.d.ts"
      to: "@prisma/client"
      via: "PrismaClient import in declaration"
      pattern: "PrismaClient"
---

<objective>
Create the monorepo skeleton and database foundation that all subsequent plans build on.

Purpose: Plans 02, 03, and 04 all depend on Prisma client types, the Fastify app factory, and project structure existing. Without this scaffold there is nothing to build auth into.

Output:
- npm workspaces root with packages/api and packages/web
- Fastify 5 app skeleton with all plugins registered (but routes empty for now)
- Prisma schema with users + refresh_tokens models, migration applied, client generated
- TypeScript declaration merging for fastify.prisma, req.user, JWT namespaces
- docker-compose.yml for PostgreSQL 16
- Vitest config
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/01-foundation-auth/1-CONTEXT.md
@.planning/phases/01-foundation-auth/01-RESEARCH.md
@SYSTEM_DESIGN.md

<interfaces>
<!-- Key contracts established by this plan — consumed by Plans 02, 03, 04 -->

Prisma models (from SYSTEM_DESIGN.md §5 and §7):

users table:
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  passwordHash  String
  displayName   String
  country       String?
  sector        String?
  avatarUrl     String?
  isGlobalAdmin Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  refreshTokens RefreshToken[]

refresh_tokens table:
  id          String    @id @db.Uuid   -- This UUID is stored as jti in JWT payload
  userId      String    @db.Uuid
  tokenHash   String    @unique        -- bcrypt hash of raw token (integrity only)
  family      String    @db.Uuid       -- token family for reuse revocation
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

Fastify app factory (from RESEARCH.md Pattern 1):
  export async function buildApp(): Promise<FastifyInstance>

TypeScript augmentations required (fastify.d.ts):
  FastifyInstance.prisma: PrismaClient
  FastifyInstance.config: { JWT_SECRET, REFRESH_TOKEN_SECRET, DEMO_MODE, PORT, DATABASE_URL, CORS_ORIGIN }
  FastifyRequest.user: { id: string, email: string, isGlobalAdmin: boolean }
  FastifyRequest.accessJwtVerify: () => Promise<unknown>
  FastifyRequest.refreshJwtVerify: () => Promise<unknown>
  FastifyReply.accessJwtSign: (payload: object) => Promise<string>
  FastifyReply.refreshJwtSign: (payload: object) => Promise<string>
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Monorepo root + packages/web scaffold</name>
  <files>
    package.json
    tsconfig.base.json
    docker-compose.yml
    .env.example
    .gitignore
    packages/web/package.json
  </files>
  <read_first>
    - SYSTEM_DESIGN.md (§17 for env vars list)
    - .planning/phases/01-foundation-auth/1-CONTEXT.md (D-01 through D-10, D-26 through D-29)
    - .planning/phases/01-foundation-auth/01-RESEARCH.md (Pattern 8: npm Workspaces + Shared tsconfig)
  </read_first>
  <action>
Create the following files with EXACT content:

**package.json (root):**
```json
{
  "name": "mukwano",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "npm -w packages/api run dev",
    "build": "npm -w packages/api run build",
    "test": "npm -w packages/api test"
  }
}
```

**tsconfig.base.json (root):**
```json
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
```
NOTE: Target must be ES2022 or higher — lower targets cause FastifyDeprecation warnings with Fastify 5 (per RESEARCH.md anti-patterns section).

**docker-compose.yml (root):**
```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: mukwano
      POSTGRES_PASSWORD: mukwano
      POSTGRES_DB: mukwano
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

**.env.example (root, committed to git):**
```
# Copy to packages/api/.env and fill in real values
DATABASE_URL=postgresql://mukwano:mukwano@localhost:5432/mukwano
JWT_SECRET=change-me-256-bits-minimum
REFRESH_TOKEN_SECRET=change-me-different-from-jwt-secret
DEMO_MODE=true
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**.gitignore (root — add if not present, or append):**
```
node_modules/
dist/
packages/api/.env
packages/api/prisma/migrations/
*.js.map
```
NOTE: .env.example is committed; packages/api/.env is NOT (per D-28).

**packages/web/package.json:**
```json
{
  "name": "@mukwano/web",
  "version": "0.0.1",
  "private": true,
  "description": "Mukwano web frontend — Phase 8 scaffold"
}
```
This is the empty web scaffold per D-03. No other files needed in packages/web for Phase 1.
  </action>
  <verify>
    <automated>
      cd /Users/levicheptoyek/MUKWANO && node -e "const p = require('./package.json'); console.assert(p.workspaces && p.workspaces[0] === 'packages/*', 'workspaces missing'); console.log('OK: workspaces configured')"
    </automated>
    <automated>
      cd /Users/levicheptoyek/MUKWANO && cat docker-compose.yml | grep -q "postgres:16" && echo "OK: postgres:16 present" || echo "FAIL: postgres:16 missing"
    </automated>
    <automated>
      cd /Users/levicheptoyek/MUKWANO && cat .env.example | grep -q "DATABASE_URL" && cat .env.example | grep -q "JWT_SECRET" && cat .env.example | grep -q "REFRESH_TOKEN_SECRET" && echo "OK: .env.example has all required vars" || echo "FAIL: .env.example incomplete"
    </automated>
  </verify>
  <acceptance_criteria>
    - grep -q '"workspaces"' /Users/levicheptoyek/MUKWANO/package.json
    - grep -q '"packages/\*"' /Users/levicheptoyek/MUKWANO/package.json
    - grep -q 'postgres:16' /Users/levicheptoyek/MUKWANO/docker-compose.yml
    - grep -q 'POSTGRES_USER: mukwano' /Users/levicheptoyek/MUKWANO/docker-compose.yml
    - grep -q 'DATABASE_URL' /Users/levicheptoyek/MUKWANO/.env.example
    - grep -q 'JWT_SECRET' /Users/levicheptoyek/MUKWANO/.env.example
    - grep -q 'REFRESH_TOKEN_SECRET' /Users/levicheptoyek/MUKWANO/.env.example
    - grep -q 'DEMO_MODE' /Users/levicheptoyek/MUKWANO/.env.example
    - File /Users/levicheptoyek/MUKWANO/tsconfig.base.json exists and contains "ES2022"
    - File /Users/levicheptoyek/MUKWANO/packages/web/package.json exists
    - /Users/levicheptoyek/MUKWANO/.gitignore contains "packages/api/.env"
  </acceptance_criteria>
  <done>Root monorepo files exist. packages/web is an empty scaffold. docker-compose.yml declares postgres:16 on 5432. .env.example has all 6 required env vars. tsconfig.base.json uses ES2022.</done>
</task>

<task type="auto">
  <name>Task 2: packages/api skeleton — dependencies, Prisma schema, app factory, type declarations</name>
  <files>
    packages/api/package.json
    packages/api/tsconfig.json
    packages/api/vitest.config.ts
    packages/api/prisma/schema.prisma
    packages/api/src/app.ts
    packages/api/src/server.ts
    packages/api/src/types/fastify.d.ts
    packages/api/src/plugins/prisma.ts
    packages/api/src/plugins/jwt.ts
    packages/api/src/plugins/env.ts
    packages/api/src/plugins/cors.ts
    packages/api/src/plugins/rate-limit.ts
    packages/api/src/guards/circle-permission.guard.ts
    packages/api/src/errors/http-errors.ts
    packages/api/.env
  </files>
  <read_first>
    - .planning/phases/01-foundation-auth/01-RESEARCH.md (ALL patterns 1-8, Standard Stack section with exact versions, Anti-patterns section)
    - .planning/phases/01-foundation-auth/1-CONTEXT.md (D-04 through D-22, D-25 through D-29)
    - SYSTEM_DESIGN.md §5 (users + refresh_tokens DDL), §7 (JWT strategy), §19 (error format)
  </read_first>
  <action>
Install dependencies and create all source files. Exact package versions from RESEARCH.md standard stack MUST be used.

**Step 1 — packages/api/package.json (create first, before npm install):**
```json
{
  "name": "@mukwano/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:push": "prisma db push"
  },
  "dependencies": {
    "fastify": "5.8.4",
    "@fastify/jwt": "10.0.0",
    "@fastify/cors": "11.2.0",
    "@fastify/rate-limit": "10.3.0",
    "@fastify/env": "6.0.0",
    "fastify-plugin": "5.1.0",
    "prisma": "7.6.0",
    "@prisma/client": "7.6.0",
    "bcryptjs": "3.0.3",
    "uuid": "13.0.0"
  },
  "devDependencies": {
    "typescript": "6.0.2",
    "tsx": "4.21.0",
    "vitest": "4.1.2",
    "@types/bcryptjs": "3.0.0",
    "@types/uuid": "11.0.0"
  }
}
```

**Step 2 — Install dependencies:**
Run from repo root: `npm install`
This installs all workspaces simultaneously.

**Step 3 — packages/api/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

**Step 4 — packages/api/vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000
  }
})
```

**Step 5 — packages/api/prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  passwordHash  String
  displayName   String
  country       String?
  sector        String?
  avatarUrl     String?
  isGlobalAdmin Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @db.Uuid
  userId    String    @db.Uuid
  tokenHash String    @unique
  family    String    @db.Uuid
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```
CRITICAL DESIGN NOTES (per RESEARCH.md Pattern 4 and Pitfall 1):
- RefreshToken.id is a plain UUID (not @default(uuid())) — the application ALWAYS sets this to the jti UUID from the JWT payload. Never let the DB generate this value.
- tokenHash stores a bcrypt hash for secondary integrity only. NEVER query by tokenHash. Look up by id (= jti).
- family is a plain UUID string, not auto-generated — set by application on login, inherited on rotation.

**Step 6 — Create packages/api/.env (NOT committed, only for local dev):**
```
DATABASE_URL=postgresql://mukwano:mukwano@localhost:5432/mukwano
JWT_SECRET=dev-jwt-secret-change-in-production-minimum-256-bits
REFRESH_TOKEN_SECRET=dev-refresh-secret-different-from-jwt-secret
DEMO_MODE=true
PORT=4000
CORS_ORIGIN=http://localhost:3000
```
NOTE: Research found Docker is NOT installed on this machine but PostgreSQL IS running locally (via Homebrew on port 5432). The DATABASE_URL above connects to the local Homebrew PostgreSQL. The docker-compose.yml is created for reproducibility but not used on this machine (per RESEARCH.md critical environment finding).

**Step 7 — Run Prisma migration:**
```bash
cd packages/api
npx prisma db push
npx prisma generate
```
Use `db push` (not `migrate dev`) for initial setup if there are no migration files yet, or use `migrate dev --name init` to create a migration file.

**Step 8 — packages/api/src/types/fastify.d.ts:**
```typescript
import type { PrismaClient } from '@prisma/client'
import type { JWT } from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    config: {
      DATABASE_URL: string
      JWT_SECRET: string
      REFRESH_TOKEN_SECRET: string
      DEMO_MODE: string
      PORT: number
      CORS_ORIGIN: string
    }
    accessJwt: JWT
    refreshJwt: JWT
  }
  interface FastifyRequest {
    user: {
      id: string
      email: string
      isGlobalAdmin: boolean
    }
    accessJwtVerify: <T = unknown>() => Promise<T>
    refreshJwtVerify: <T = unknown>() => Promise<T>
  }
  interface FastifyReply {
    accessJwtSign: (payload: object) => Promise<string>
    refreshJwtSign: (payload: object) => Promise<string>
  }
}
```

**Step 9 — packages/api/src/plugins/prisma.ts:**
```typescript
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
CRITICAL: Must use fp() from fastify-plugin. Without it, the decorator is only visible inside the plugin's scope, not to sibling plugins or route handlers (per RESEARCH.md Pattern 2 and Anti-patterns).

**Step 10 — packages/api/src/plugins/env.ts:**
```typescript
import fp from 'fastify-plugin'
import envPlugin from '@fastify/env'
import type { FastifyPluginAsync } from 'fastify'

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'],
  properties: {
    DATABASE_URL: { type: 'string' },
    JWT_SECRET: { type: 'string' },
    REFRESH_TOKEN_SECRET: { type: 'string' },
    DEMO_MODE: { type: 'string', default: 'false' },
    PORT: { type: 'integer', default: 4000 },
    CORS_ORIGIN: { type: 'string', default: 'http://localhost:3000' }
  }
}

const envPluginWrapper: FastifyPluginAsync = fp(async (server) => {
  await server.register(envPlugin, {
    schema,
    dotenv: { path: `${process.cwd()}/.env`, debug: false }
  })
})

export { envPluginWrapper as envPlugin }
```

**Step 11 — packages/api/src/plugins/jwt.ts:**
```typescript
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync } from 'fastify'

const jwtPlugin: FastifyPluginAsync = fp(async (server) => {
  // Access token: HS256, 15 min expiry, JWT_SECRET (per D-11)
  await server.register(jwt, {
    secret: server.config.JWT_SECRET,
    namespace: 'access',
    sign: { expiresIn: '15m', algorithm: 'HS256' }
  })

  // Refresh token: HS256, 30 day expiry, separate REFRESH_TOKEN_SECRET (per D-12)
  await server.register(jwt, {
    secret: server.config.REFRESH_TOKEN_SECRET,
    namespace: 'refresh',
    sign: { expiresIn: '30d', algorithm: 'HS256' }
  })
})

export { jwtPlugin }
```
CRITICAL: Two separate registrations with different secrets is REQUIRED (per D-11, D-12). A single registration would mean a stolen refresh token could forge access tokens.

**Step 12 — packages/api/src/plugins/cors.ts:**
```typescript
import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = fp(async (server) => {
  await server.register(cors, {
    origin: server.config.CORS_ORIGIN,
    credentials: true
  })
})

export { corsPlugin }
```

**Step 13 — packages/api/src/plugins/rate-limit.ts:**
```typescript
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'

const rateLimitPlugin: FastifyPluginAsync = fp(async (server) => {
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })
})

export { rateLimitPlugin }
```

**Step 14 — packages/api/src/errors/http-errors.ts:**
```typescript
// Canonical error helpers — format from SYSTEM_DESIGN.md §19
// Error format: { error: { code, message, field, status } }

export class HttpError extends Error {
  statusCode: number
  code: string
  field: string | null

  constructor(statusCode: number, code: string, message: string, field: string | null = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

export class UnauthorizedError extends HttpError {
  constructor(code: string = 'UNAUTHORIZED', message: string = 'Authentication required') {
    super(401, code, message)
  }
}

export class ForbiddenError extends HttpError {
  constructor(code: string = 'FORBIDDEN', message: string = 'Insufficient permissions') {
    super(403, code, message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends HttpError {
  constructor(code: string, message: string) {
    super(409, code, message)
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, field: string | null = null) {
    super(422, 'VALIDATION_ERROR', message, field)
  }
}

export class InternalError extends HttpError {
  constructor(message: string = 'An unexpected error occurred') {
    super(500, 'INTERNAL_SERVER_ERROR', message)
  }
}
```

**Step 15 — packages/api/src/guards/circle-permission.guard.ts:**
```typescript
// CirclePermissionGuard — Phase 1 placeholder (per D-19)
// Phase 2 will implement the actual role check against circle_memberships table
// Exported here so Phase 2 can import and replace without changing callers

import type { FastifyRequest, FastifyReply } from 'fastify'

export type CircleRole = 'member' | 'contributor' | 'creator' | 'admin'

/**
 * PLACEHOLDER — Phase 2 will replace the body of this function.
 * Currently allows all authenticated requests through (AuthGuard handles auth).
 * When wired in Phase 2: checks circle_memberships for (circleId, userId) and
 * verifies role >= requiredRole in hierarchy member < contributor < creator < admin.
 */
export function circlePermissionGuard(requiredRole: CircleRole) {
  return async function (_request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    // Phase 1: no-op placeholder — Phase 2 wires real check
    // Role hierarchy: member < contributor < creator < admin
    // Global admins bypass circle-level checks (check req.user.isGlobalAdmin)
    void requiredRole
  }
}
```

**Step 16 — packages/api/src/app.ts:**
```typescript
import Fastify from 'fastify'
import { envPlugin } from './plugins/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { jwtPlugin } from './plugins/jwt.js'
import { corsPlugin } from './plugins/cors.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info'
    },
    genReqId: () => crypto.randomUUID()
  })

  // Plugins — registered in order: env first (others depend on server.config)
  await app.register(envPlugin)
  await app.register(prismaPlugin)
  await app.register(jwtPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)

  // Global error handler — canonical format per SYSTEM_DESIGN.md §19 (per D-20, D-21, D-22)
  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.id

    // Fastify schema validation errors (per D-21)
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

    // Known domain errors with statusCode (per D-20)
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: {
          code: (error as any).code ?? 'ERROR',
          message: error.message,
          field: (error as any).field ?? null,
          status: error.statusCode
        }
      })
    }

    // Unknown / 5xx errors — log full details, return generic response (per D-22)
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

  // Routes registered in Plan 02 and Plan 03 — placeholder comment
  // await app.register(authRoutes, { prefix: '/api/v1/auth' })
  // await app.register(configRoute, { prefix: '/api/v1' })

  return app
}
```

**Step 17 — packages/api/src/server.ts:**
```typescript
import { buildApp } from './app.js'

const app = await buildApp()
const port = Number(app.config.PORT ?? 4000)

await app.listen({ port, host: '0.0.0.0' })
app.log.info(`Mukwano API listening on port ${port}`)
```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm install 2>&1 | tail -5</automated>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm -w packages/api run prisma:push 2>&1 | tail -10</automated>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm -w packages/api run prisma:generate 2>&1 | tail -5</automated>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - npm install exits 0 at repo root
    - grep -q 'model User' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'model RefreshToken' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'passwordHash' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'isGlobalAdmin' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'revokedAt' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'tokenHash' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - grep -q 'family' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma
    - prisma db push exits 0 (tables created in database)
    - prisma generate exits 0 (client generated)
    - tsc --noEmit exits 0 (no TypeScript errors)
    - grep -q 'buildApp' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q 'setErrorHandler' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q 'VALIDATION_ERROR' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q 'FastifyInstance' /Users/levicheptoyek/MUKWANO/packages/api/src/types/fastify.d.ts
    - grep -q 'prisma: PrismaClient' /Users/levicheptoyek/MUKWANO/packages/api/src/types/fastify.d.ts
    - grep -q 'accessJwtVerify' /Users/levicheptoyek/MUKWANO/packages/api/src/types/fastify.d.ts
    - grep -q 'circlePermissionGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/guards/circle-permission.guard.ts
    - grep -q 'namespace.*access' /Users/levicheptoyek/MUKWANO/packages/api/src/plugins/jwt.ts
    - grep -q 'namespace.*refresh' /Users/levicheptoyek/MUKWANO/packages/api/src/plugins/jwt.ts
  </acceptance_criteria>
  <done>packages/api has all source files. npm install succeeds. Prisma schema has users + refresh_tokens with correct columns. prisma db push and prisma generate succeed. tsc --noEmit exits 0. buildApp() exists in app.ts with global error handler and all plugins registered.</done>
</task>

</tasks>

<verification>
After both tasks complete, run the full verification sequence:

```bash
# 1. Workspace structure
ls /Users/levicheptoyek/MUKWANO/packages/

# 2. TypeScript clean
cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit

# 3. Schema verification
grep -E 'model (User|RefreshToken)' /Users/levicheptoyek/MUKWANO/packages/api/prisma/schema.prisma

# 4. DB tables exist
cd /Users/levicheptoyek/MUKWANO && npm -w packages/api run prisma:push

# 5. Test runner initializes (no test files yet — expect 0 tests, no crash)
cd /Users/levicheptoyek/MUKWANO && npm -w packages/api test -- --run 2>&1 | tail -5
```
</verification>

<success_criteria>
- packages/api and packages/web directories exist
- npm install exits 0 at repo root
- tsc --noEmit exits 0 in packages/api
- prisma/schema.prisma has model User with: id, email, passwordHash, displayName, country, sector, avatarUrl, isGlobalAdmin, createdAt, updatedAt
- prisma/schema.prisma has model RefreshToken with: id, userId, tokenHash, family, expiresAt, revokedAt, createdAt
- prisma db push succeeds (tables created)
- prisma generate succeeds (@prisma/client ready)
- buildApp() in src/app.ts registers envPlugin, prismaPlugin, jwtPlugin, corsPlugin, rateLimitPlugin
- global error handler maps validation errors to VALIDATION_ERROR 422, domain errors to statusCode, unknowns to 500
- CirclePermissionGuard placeholder is exported from src/guards/circle-permission.guard.ts
- fastify.d.ts augments FastifyInstance.prisma, FastifyInstance.config, req.user, accessJwtVerify, refreshJwtVerify, accessJwtSign, refreshJwtSign
</success_criteria>

<output>
After completion, create `/Users/levicheptoyek/MUKWANO/.planning/phases/01-foundation-auth/01-PLAN-01-SUMMARY.md` using the summary template.
</output>
