---
phase: 8
slug: frontend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library + MSW v2 |
| **Config file** | `packages/web/vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npm run test --workspace=packages/web -- --run` |
| **Full suite command** | `npm run test --workspace=packages/web -- --run --reporter=verbose` |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --workspace=packages/web -- --run`
- **After every plan wave:** Run full suite command above
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| Scaffold | FE-01..12 | build | `npm run build --workspace=packages/web` | ❌ W0 | ⬜ pending |
| AuthContext | FE-01 | unit | `vitest src/contexts/auth.test.tsx` | ❌ W0 | ⬜ pending |
| Login/Signup | FE-01 | component | `vitest src/pages/Login.test.tsx` | ❌ W0 | ⬜ pending |
| Token refresh | FE-01 | unit | `vitest src/lib/api.test.ts` | ❌ W0 | ⬜ pending |
| Dashboard | FE-02 | component | `vitest src/pages/Dashboard.test.tsx` | ❌ W0 | ⬜ pending |
| CircleList | FE-03 | component | `vitest src/pages/Circles.test.tsx` | ❌ W0 | ⬜ pending |
| CircleCreate | FE-03 | component | `vitest src/pages/CircleNew.test.tsx` | ❌ W0 | ⬜ pending |
| CircleDetail tabs | FE-04 | component | `vitest src/pages/CircleDetail.test.tsx` | ❌ W0 | ⬜ pending |
| ContributionForm | FE-05 | component | `vitest src/pages/ContributionNew.test.tsx` | ❌ W0 | ⬜ pending |
| ProofUpload | FE-05 | unit | `vitest src/components/ProofUpload.test.tsx` | ❌ W0 | ⬜ pending |
| VerifyReject | FE-06 | component | `vitest src/components/ContributionActions.test.tsx` | ❌ W0 | ⬜ pending |
| ProposalCreate | FE-07 | component | `vitest src/pages/ProposalNew.test.tsx` | ❌ W0 | ⬜ pending |
| VoteWidget | FE-07 | component | `vitest src/components/VoteWidget.test.tsx` | ❌ W0 | ⬜ pending |
| ProjectDetail | FE-08 | component | `vitest src/pages/ProjectDetail.test.tsx` | ❌ W0 | ⬜ pending |
| Portfolio | FE-09 | component | `vitest src/pages/Portfolio.test.tsx` | ❌ W0 | ⬜ pending |
| AdminPanel | FE-10 | component | `vitest src/pages/Admin.test.tsx` | ❌ W0 | ⬜ pending |
| DemoModeBanner | FE-11 | component | `vitest src/components/DemoModeBanner.test.tsx` | ❌ W0 | ⬜ pending |
| ErrorDisplay | FE-12 | unit | `vitest src/components/ErrorToast.test.tsx` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `packages/web/src/test/setup.ts` — RTL + MSW global setup
- [ ] `packages/web/src/test/server.ts` — MSW v2 server instance
- [ ] `packages/web/src/test/handlers.ts` — MSW handlers for all 47 API endpoints
- [ ] `packages/web/vitest.config.ts` — vitest config with jsdom environment
- [ ] All *.test.tsx stubs listed in Per-Task Verification Map above

*All test files are Wave 0 gaps — no existing test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DEMO_MODE banner visible on every screen | FE-11 | Requires live API returning demoMode=true | Start server with DEMO_MODE=true; navigate to every route; confirm amber banner present |
| Proof file upload PUT to presigned URL | FE-05 | Requires real HTTP PUT to local upload endpoint | Submit contribution, attach PDF ≤10MB, confirm upload completes and proof record created |
| Token refresh auto-retry on 401 | FE-01 | Requires real JWT expiry sequence | Wait for access token expiry (15min), make any request, confirm auto-refresh and retry |
| INSUFFICIENT_TREASURY inline error | FE-08 | Requires treasury balance state | Set treasury to 0, transition project to executing, confirm inline error message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
