---
phase: quick
plan: 260407-jmz
subsystem: deployment
tags: [vercel, prisma, deployment, serverless]
dependency_graph:
  requires: []
  provides: [vercel-api-serverless-config, prisma-vercel-binaries]
  affects: [api-deployment]
tech_stack:
  added: []
  patterns: [vercel-functions-config, prisma-binary-targets]
key_files:
  created: []
  modified:
    - packages/api/vercel.json
    - packages/api/prisma/schema.prisma
decisions:
  - "Use @vercel/node@3 runtime with includeFiles to bundle src/ and prisma/ into serverless function"
  - "Add rhel-openssl-3.0.x binaryTarget for Vercel serverless (Amazon Linux 2023) alongside native for local dev"
metrics:
  duration: "1 minute"
  completed: "2026-04-07"
---

# Quick Task 260407-jmz: Fix Vercel API Deployment Summary

**One-liner:** Vercel serverless config with @vercel/node@3 functions block and Prisma binaryTargets for rhel-openssl-3.0.x to fix mukwano-api build and runtime on Vercel.

## What Was Done

Fixed two blocking issues preventing the mukwano-api from deploying on Vercel:

1. **vercel.json** was missing a `functions` block, so Vercel did not know to compile `api/index.ts` as a serverless function. Added the block with `@vercel/node@3` runtime and `includeFiles` to bundle `src/**` and `prisma/**` alongside the function. Also corrected the rewrite destination from `/api/index.ts` (a file path, which Vercel rejects) to `/api` (the route path Vercel maps to `api/index.ts`).

2. **prisma/schema.prisma** had no `binaryTargets`, so `prisma generate` during Vercel build only produced a native macOS binary. Added `rhel-openssl-3.0.x` for the Vercel serverless environment (Node 18+/20 on Amazon Linux 2023) alongside `native` for local development.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Fix vercel.json functions config and rewrites | a8364bf | packages/api/vercel.json |
| 2 | Add Prisma binaryTargets for Vercel serverless runtime | ff6d8e9 | packages/api/prisma/schema.prisma |

## Verification

- `vercel.json` has `functions["api/index.ts"]` with `@vercel/node@3` runtime: PASS
- `vercel.json` rewrites destination is `/api` (not `/api/index.ts`): PASS
- `schema.prisma` generator includes `native` and `rhel-openssl-3.0.x` binaryTargets: PASS
- `tsconfig.json` unchanged: PASS
- `package.json` unchanged: PASS
- No `.env` files committed: PASS

## Post-Deploy Manual Steps (for user)

After pushing and Vercel redeploys:
1. Hit `https://<api-domain>/` and confirm JSON response: `{ name: "Mukwano API", ... }`
2. Confirm CORS works: frontend at production URL can call API without blocked-by-CORS errors
3. Ensure these env vars are set in Vercel project settings for mukwano-api: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and optionally `CORS_ORIGIN` (has sensible defaults already)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- packages/api/vercel.json: FOUND
- packages/api/prisma/schema.prisma: FOUND
- Commit a8364bf: FOUND
- Commit ff6d8e9: FOUND
