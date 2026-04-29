---
phase: quick
plan: 260429-ci1
subsystem: web
tags: [react, auth, onboarding, e2e]

requires: []
provides:
  - Stable auth context refresh before guarded onboarding navigation
affects: [onboarding, auth, e2e]

key-files:
  created:
    - .planning/quick/260429-ci1-fix-onboarding-complete-ci-race/260429-ci1-PLAN.md
  modified:
    - packages/web/src/contexts/AuthContext.tsx

completed: 2026-04-29
---

# Quick Task 260429-ci1: Fix Onboarding Complete CI Race

## Accomplishments

- Updated `refreshUser()` to flush the refreshed user into React context synchronously after `/auth/me` resolves.
- This keeps awaited onboarding saves from navigating into route guards while those guards still see stale pre-save user data.

## Verification

- `npm -w @mukwano/web run typecheck` passed.
- `npm run build:web` passed.
- `npm -w @mukwano/web test` passed.

## E2E Note

- `npm run test:e2e:critical` could not complete locally because Postgres was not running on `localhost:5432`; after an elevated retry the API failed with `ECONNREFUSED`.
