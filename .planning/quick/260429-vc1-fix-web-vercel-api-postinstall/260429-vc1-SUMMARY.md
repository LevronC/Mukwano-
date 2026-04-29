---
phase: quick
plan: 260429-vc1
subsystem: deploy
tags: [vercel, npm-workspaces, prisma]

requires: []
provides:
  - Web Vercel installs no longer fail on API Prisma postinstall without DATABASE_URL
affects: [vercel-web, api-install]

key-files:
  created:
    - .planning/quick/260429-vc1-fix-web-vercel-api-postinstall/260429-vc1-PLAN.md
  modified:
    - packages/api/package.json

completed: 2026-04-29
---

# Quick Task 260429-vc1: Fix Web Vercel API Postinstall

## Accomplishments

- Restored the API workspace `postinstall` guard so `prisma generate` only runs when `DATABASE_URL` is present.
- Kept explicit API build behavior unchanged; `prebuild` still runs `npm run prisma:generate`.

## Verification

- Parsed `packages/api/package.json` with Node successfully.
- `npm run build:api` passed.
