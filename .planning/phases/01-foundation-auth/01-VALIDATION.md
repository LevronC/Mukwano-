# Phase 1: Foundation & Auth — Validation Strategy

**Phase:** 01
**Phase slug:** foundation-auth
**Date:** 2026-03-30

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config | `packages/api/vitest.config.ts` |
| Quick run | `npm -w packages/api test -- --run` |
| Full suite | `npm -w packages/api test -- --run --coverage` |

## Requirements → Test Map

| Req ID | Test File | Key Behaviors |
|--------|-----------|---------------|
| AUTH-01 | `test/auth/signup.test.ts` | Creates user, hashes password, returns JWT pair; rejects duplicate email (409); validates required fields (422 + field) |
| AUTH-02 | `test/auth/login.test.ts` | Returns accessToken + refreshToken; 401 on wrong password; access token exp ~15 min; isGlobalAdmin in payload |
| AUTH-03 | `test/auth/refresh.test.ts` | Returns new token pair; invalidates old token; 401 on expired token |
| AUTH-04 | `test/auth/logout.test.ts` | Marks refresh token revoked; does NOT revoke sibling tokens |
| AUTH-05 | `test/auth/me.test.ts` | GET returns profile; PATCH updates displayName/country/sector only; 401 without auth |
| AUTH-06 | `test/auth/refresh.test.ts` | Reused revoked token → 401 + full family revocation; sibling tokens also become 401 |
| AUTH-07 | `test/auth/login.test.ts` | isGlobalAdmin=false for regular users, true for admin users |
| DEMO-01 | `test/config.test.ts` | Returns { demoMode, currency, escrowLabel }; demoMode=true when DEMO_MODE=true; escrowLabel correct; public endpoint (no auth) |

## Critical Edge Cases

| Scenario | Expected |
|----------|----------|
| Email with mixed case (`User@Example.COM`) | Normalized to lowercase before unique check |
| PATCH /auth/me with email or passwordHash fields | 422 or fields silently ignored — mass assignment protection |
| Refresh token signed with wrong secret | 401, no JWT error details leaked in response |
| Signup with password below minimum length | 422 with `field: "password"` |
| Two simultaneous refresh calls (same token) | One succeeds, one gets 401 — DB unique constraint handles race |
| POST /auth/logout without auth header | 401 |

## Sampling Rate

- **Per task commit:** `npm -w packages/api test -- --run`
- **Per wave:** `npm -w packages/api test -- --run --coverage`
- **Phase gate:** Full suite green before verification
