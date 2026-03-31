---
phase: 01-foundation-auth
plan: 03
type: execute
wave: 2
depends_on:
  - "01-PLAN-01"
files_modified:
  - packages/api/src/routes/config.ts
  - packages/api/src/app.ts
autonomous: true
requirements:
  - DEMO-01

must_haves:
  truths:
    - "GET /api/v1/config returns 200 with { demoMode: true, currency: 'USD', escrowLabel: 'Simulated escrow — no real funds' } when DEMO_MODE=true"
    - "GET /api/v1/config returns 200 with { demoMode: false, currency: 'USD', escrowLabel: 'Live escrow' } when DEMO_MODE=false"
    - "GET /api/v1/config returns 200 without any Authorization header (public endpoint, no authGuard)"
  artifacts:
    - path: "packages/api/src/routes/config.ts"
      provides: "GET /api/v1/config endpoint"
      contains: "demoMode"
    - path: "packages/api/src/app.ts"
      provides: "configRoute registered"
      contains: "configRoute"
  key_links:
    - from: "packages/api/src/routes/config.ts"
      to: "fastify.config.DEMO_MODE"
      via: "app.config.DEMO_MODE check"
      pattern: "DEMO_MODE"
    - from: "packages/api/src/app.ts"
      to: "packages/api/src/routes/config.ts"
      via: "app.register(configRoute, { prefix: '/api/v1' })"
      pattern: "configRoute"
---

<objective>
Implement the GET /api/v1/config endpoint (DEMO-01) and wire it into buildApp().

Purpose: This plan is parallel with Plan 02 (both are Wave 2, both depend only on Plan 01). The config endpoint is the single public source of truth for the client's DEMO_MODE awareness — required by Phase 7 and Phase 8.

Output:
- GET /api/v1/config route: public, no auth, returns { demoMode, currency, escrowLabel }
- configRoute registered in buildApp() at prefix /api/v1
- DEMO_MODE=true → escrowLabel = "Simulated escrow — no real funds" (exact string from SYSTEM_DESIGN.md §15)
- DEMO_MODE=false → escrowLabel = "Live escrow"
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-auth/1-CONTEXT.md
@SYSTEM_DESIGN.md
@.planning/phases/01-foundation-auth/01-PLAN-01-SUMMARY.md

<interfaces>
<!-- Contracts from Plan 01 that this plan builds on -->

From packages/api/src/types/fastify.d.ts:
  FastifyInstance.config.DEMO_MODE: string  -- "true" or "false" (string from env, not boolean)

SYSTEM_DESIGN.md §15 exact response shape:
  GET /api/v1/config response when DEMO_MODE=true:
  {
    "demoMode": true,
    "currency": "USD",
    "escrowLabel": "Simulated escrow — no real funds"
  }

CONTEXT.md D-23: Public endpoint — no auth required (no authGuard)
CONTEXT.md D-24: DEMO_MODE env var (string) drives demoMode (boolean); escrowLabel changes with it
CONTEXT.md D-25: Route prefix is /api/v1
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: GET /api/v1/config route + registration in buildApp()</name>
  <files>
    packages/api/src/routes/config.ts
    packages/api/src/app.ts
  </files>
  <read_first>
    - packages/api/src/app.ts (current state after Plan 02 — need to add configRoute import + registration)
    - packages/api/src/types/fastify.d.ts (fastify.config.DEMO_MODE type)
    - SYSTEM_DESIGN.md §15 (exact response shape and escrowLabel strings)
    - .planning/phases/01-foundation-auth/1-CONTEXT.md (D-23, D-24, D-25)
    - .planning/phases/01-foundation-auth/01-VALIDATION.md (DEMO-01 test expectations)
  </read_first>
  <action>
Create packages/api/src/routes/config.ts:

```typescript
// GET /api/v1/config — public endpoint, no auth required (per D-23)
// Returns DEMO_MODE status for client-side rendering decisions (per D-24)
// Response shape from SYSTEM_DESIGN.md §15

import type { FastifyPluginAsync } from 'fastify'

export const configRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/config', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            demoMode: { type: 'boolean' },
            currency: { type: 'string' },
            escrowLabel: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    // DEMO_MODE env var is a string ("true" / "false") — convert to boolean
    const demoMode = fastify.config.DEMO_MODE === 'true'

    return reply.send({
      demoMode,
      currency: 'USD',
      escrowLabel: demoMode
        ? 'Simulated escrow \u2014 no real funds'   // exact string from SYSTEM_DESIGN.md §15
        : 'Live escrow'
    })
  })
}
```

CRITICAL: The escrowLabel when demoMode=true MUST be exactly "Simulated escrow — no real funds" (with em dash U+2014). This is the exact string from SYSTEM_DESIGN.md §15. VALIDATION.md tests will match against this string.

CRITICAL: DEMO_MODE from env is a STRING "true" or "false" — always compare with === 'true', never coerce with Boolean(fastify.config.DEMO_MODE) (which would be true for any non-empty string including "false").

Then update packages/api/src/app.ts:
- Add import: `import { configRoute } from './routes/config.js'`
- Find the commented-out line: `// await app.register(configRoute, { prefix: '/api/v1' })`
- Replace with: `await app.register(configRoute, { prefix: '/api/v1' })`

The app.ts should now register BOTH authRoutes and configRoute. After this plan, app.ts route registrations look like:
```typescript
await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(configRoute, { prefix: '/api/v1' })
```
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit 2>&1 | head -10</automated>
    <automated>grep -q 'configRoute' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts && echo "OK: configRoute registered" || echo "FAIL: configRoute not in app.ts"</automated>
    <automated>grep -q 'Simulated escrow' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts && echo "OK: exact escrowLabel present" || echo "FAIL: escrowLabel string missing"</automated>
    <automated>grep -q "=== 'true'" /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts && echo "OK: string comparison for DEMO_MODE" || echo "FAIL: DEMO_MODE comparison wrong"</automated>
  </verify>
  <acceptance_criteria>
    - File /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts exists
    - grep -q 'demoMode' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts
    - grep -q 'currency' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts
    - grep -q 'escrowLabel' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts
    - grep -q "Simulated escrow" /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts (exact escrowLabel value)
    - grep -q "=== 'true'" /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts (string comparison, not Boolean coercion)
    - Route does NOT have preHandler: authGuard (it is public per D-23)
    - grep -q 'configRoute' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - grep -q "prefix: '/api/v1'" /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts
    - tsc --noEmit exits 0
  </acceptance_criteria>
  <done>GET /api/v1/config returns { demoMode: boolean, currency: "USD", escrowLabel: string }. No authGuard on route. Registered in buildApp() at /api/v1. escrowLabel is exact string from SYSTEM_DESIGN.md §15. tsc --noEmit exits 0.</done>
</task>

</tasks>

<verification>
After task completes:

```bash
# 1. TypeScript clean
cd /Users/levicheptoyek/MUKWANO/packages/api && npx tsc --noEmit

# 2. Config route exists and has correct content
cat /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts

# 3. App registers both routes
grep 'register' /Users/levicheptoyek/MUKWANO/packages/api/src/app.ts | grep 'api/v1'

# 4. No authGuard on config route
grep -v 'authGuard' /Users/levicheptoyek/MUKWANO/packages/api/src/routes/config.ts
```
</verification>

<success_criteria>
- GET /api/v1/config route exists in packages/api/src/routes/config.ts
- Route has NO authGuard (public endpoint)
- demoMode is derived from DEMO_MODE === 'true' (string comparison)
- escrowLabel is "Simulated escrow — no real funds" when demoMode=true
- configRoute registered in buildApp() at prefix /api/v1
- tsc --noEmit exits 0 after both Plan 02 and Plan 03 changes land in app.ts
</success_criteria>

<output>
After completion, create `/Users/levicheptoyek/MUKWANO/.planning/phases/01-foundation-auth/01-PLAN-03-SUMMARY.md` using the summary template.
</output>
