---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/api/vercel.json
  - packages/api/prisma/schema.prisma
autonomous: true
must_haves:
  truths:
    - "Vercel deployment of mukwano-api builds and starts without errors"
    - "API responds to requests through the serverless function entry point"
    - "Prisma Client generates with correct binary for Vercel runtime"
  artifacts:
    - path: "packages/api/vercel.json"
      provides: "Correct Vercel serverless config with functions block and rewrites"
    - path: "packages/api/prisma/schema.prisma"
      provides: "Prisma generator with Vercel-compatible binaryTargets"
  key_links:
    - from: "packages/api/vercel.json"
      to: "packages/api/api/index.ts"
      via: "Vercel functions config and rewrites"
      pattern: "functions.*api/index\\.ts"
---

<objective>
Fix Vercel API deployment so the mukwano-api project builds and serves requests.

Purpose: The API fails on Vercel because (1) vercel.json lacks a `functions` block telling Vercel how to build `api/index.ts`, (2) Prisma schema has no `binaryTargets` for the Vercel serverless runtime. The CORS config and prisma generate in prebuild are already correct.

Output: Working Vercel deployment config for the API service.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/api/vercel.json
@packages/api/api/index.ts
@packages/api/prisma/schema.prisma
@packages/api/package.json
@packages/api/tsconfig.json
@packages/api/src/plugins/env.ts

Notes on current state:
- `api/index.ts` is outside `src/` and NOT compiled by `tsc` (tsconfig includes only `src/`). This is fine — Vercel's `@vercel/node` runtime compiles it natively using esbuild.
- `api/index.ts` imports `../src/app.js` — Vercel's esbuild-based builder resolves `.js` to `.ts` source.
- `package.json` already has `"prebuild": "npm run prisma:generate"` so Prisma Client is generated before `tsc`. The `build` script (`tsc`) compiles `src/` to `dist/` which is used for non-Vercel deploys (e.g., Railway `start: node dist/server.js`). The Vercel serverless function does NOT use `dist/` — it uses Vercel's own bundler on `api/index.ts`.
- CORS plugin already reads `CORS_ORIGIN` env var, defaults include production URLs. No code change needed — user just needs the env var set in Vercel project settings.
- `tsconfig.json` does NOT need changes. We are NOT compiling `api/index.ts` with `tsc`. Vercel handles it.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix vercel.json functions config and rewrites</name>
  <files>packages/api/vercel.json</files>
  <action>
Replace the current `packages/api/vercel.json` with a corrected version:

1. Add a `functions` block that tells Vercel to use `@vercel/node` for `api/index.ts` with `includeFiles` to bundle the `src/**` and `prisma/**` directories (Vercel's builder needs access to source files and the Prisma schema):

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "functions": {
    "api/index.ts": {
      "runtime": "@vercel/node@3",
      "includeFiles": "src/**,prisma/**"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

Key changes:
- Added `functions` block specifying `@vercel/node@3` runtime for `api/index.ts`. This tells Vercel to compile the TS file with its built-in esbuild pipeline.
- `includeFiles` ensures `src/` (imported by api/index.ts) and `prisma/` (schema needed at runtime by Prisma) are bundled into the serverless function.
- Changed rewrite destination from `/api/index.ts` to `/api`. Vercel's file-system routing maps `/api` to `api/index.ts` automatically. Pointing directly to the `.ts` file is incorrect — Vercel expects the route path, not the file path, in rewrite destinations.

Do NOT change `buildCommand` or `installCommand` — they are correct. The `build` script runs `prisma generate` (via prebuild) then `tsc`. Even though Vercel's serverless function does not use `dist/`, the build step still generates the Prisma Client which the function DOES use at runtime.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && node -e "const v = require('./packages/api/vercel.json'); const ok = v.functions?.['api/index.ts']?.runtime?.startsWith('@vercel/node') && v.rewrites?.[0]?.destination === '/api'; console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1)"</automated>
  </verify>
  <done>vercel.json has functions block with @vercel/node runtime for api/index.ts, rewrites destination is /api (not /api/index.ts), includeFiles covers src/** and prisma/**</done>
</task>

<task type="auto">
  <name>Task 2: Add Prisma binaryTargets for Vercel serverless runtime</name>
  <files>packages/api/prisma/schema.prisma</files>
  <action>
Update the `generator client` block in `packages/api/prisma/schema.prisma` to include binaryTargets for both local development and Vercel's serverless runtime (Amazon Linux 2 / AL2023 with OpenSSL 3.0):

Change:
```prisma
generator client {
  provider = "prisma-client-js"
}
```

To:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

- `native` — local dev machine (macOS, Linux, etc.)
- `rhel-openssl-3.0.x` — Vercel serverless functions (Node 18+/20 on Amazon Linux 2023)

Do NOT change anything else in schema.prisma. Do NOT touch the datasource or any models.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && grep -q 'rhel-openssl-3.0.x' packages/api/prisma/schema.prisma && grep -q 'native' packages/api/prisma/schema.prisma && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>Prisma schema generator block includes both "native" and "rhel-openssl-3.0.x" binaryTargets</done>
</task>

</tasks>

<verification>
1. `packages/api/vercel.json` contains `functions` block with `@vercel/node@3` runtime
2. `packages/api/vercel.json` rewrites destination is `/api` (not `/api/index.ts`)
3. `packages/api/prisma/schema.prisma` generator has `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
4. `packages/api/tsconfig.json` is UNCHANGED (still includes only `src/`)
5. `packages/api/package.json` is UNCHANGED
6. No `.env` files committed

Post-deploy verification (manual, by user):
- After pushing and Vercel redeploys, hit `https://<api-domain>/` and confirm JSON response: `{ name: "Mukwano API", ... }`
- Confirm CORS works: frontend at production URL can call API without blocked-by-CORS errors
- User must ensure these env vars are set in Vercel project settings for mukwano-api: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and optionally `CORS_ORIGIN` (has sensible defaults already)
</verification>

<success_criteria>
- vercel.json correctly configures the serverless function with runtime, includeFiles, and proper rewrite destination
- Prisma generates binaries compatible with Vercel's serverless runtime
- No unrelated files changed
</success_criteria>

<output>
After completion, create `.planning/quick/260407-jmz-fix-vercel-api-deployment-compile-api-in/260407-jmz-SUMMARY.md`
</output>
