---
phase: quick
plan: 260409-nsw
subsystem: api-security
tags: [security, helmet, headers, fintech, hardening]
dependency_graph:
  requires: []
  provides: [security-headers]
  affects: [packages/api/src/app.ts, packages/api/src/plugins/helmet.ts]
tech_stack:
  added: ["@fastify/helmet@^11"]
  patterns: [fastify-plugin-wrapper, plugin-registration-order]
key_files:
  created:
    - packages/api/src/plugins/helmet.ts
  modified:
    - packages/api/src/app.ts
    - packages/api/package.json
    - package-lock.json
decisions:
  - Register helmet after cors but before rateLimitPlugin so CORS headers are not overwritten
  - Use strict CSP with unsafe-inline only for styleSrc — pure API server, no HTML served
  - HSTS maxAge 31536000 with includeSubDomains and preload — fintech production-ready
  - frameguard action deny — no embedding allowed in fintech context
metrics:
  duration: "~10 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Quick 260409-nsw: Install and Configure @fastify/helmet Summary

**One-liner:** Installed @fastify/helmet with fintech-appropriate CSP, HSTS (1yr + preload), X-Frame-Options DENY, noSniff, and strict-origin-when-cross-origin referrer policy on the Mukwano API server.

## What Was Done

Hardened the Mukwano API against clickjacking, MIME-sniffing, XSS, and protocol downgrade attacks by adding HTTP security headers via @fastify/helmet.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install @fastify/helmet and create helmet plugin | 52826ae | packages/api/src/plugins/helmet.ts, packages/api/package.json, package-lock.json |
| 2 | Register helmet plugin in app.ts and verify headers | be518c0 | packages/api/src/app.ts |

## Verification Results

Headers confirmed present on both `GET /` and `GET /api/v1/config`:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; script-src-attr 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- No `X-Powered-By` header present

E2E regression script passed cleanly — full happy path (signup → login → circle → contribute → verify → proposal → vote → close → project lifecycle → portfolio + dashboard).

## Decisions Made

- **Plugin registration order:** Helmet is registered after `corsPlugin` (line 30 in app.ts) but before `rateLimitPlugin`. This ensures CORS preflight headers are set by `@fastify/cors` first and helmet does not interfere with `Access-Control-*` headers.
- **CSP `styleSrc: 'unsafe-inline'`:** Kept as a conservative choice — the server returns no HTML but in the event error pages are styled, the directive prevents a hard block. Can be tightened to `'none'` if error serialization is ever changed to pure JSON-only.
- **HSTS preload:** Enabled with 1-year maxAge and `includeSubDomains` — appropriate for a fintech platform that should be on the browser preload list.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- packages/api/src/plugins/helmet.ts: FOUND
- packages/api/src/app.ts: FOUND (helmetPlugin import and register confirmed)
- Commit 52826ae: FOUND
- Commit be518c0: FOUND
