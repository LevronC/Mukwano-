# Plan: Depth, integration, and production readiness (8 → 9–10)

This plan closes the gaps between a **credible internal alpha** and something we can call **production-safe**: polished flows, accessible UI, measurable performance, automated E2E confidence, staging validation, reduced structural debt, and **governance + ledger behavior** verified under realistic usage—not only “looks good.”

---

## 1. Definition of done (what “9–10” means here)

Use this table as the **contract** for “production-safe.” The **Snapshot** column is updated when evidence lands; it is allowed to lag the **Minimum bar** until exit criteria in §§3–9 are met.

| Dimension | Minimum bar | Snapshot (evidence — update as you ship) |
|-----------|-------------|-------------------------------------------|
| **Depth** | Every primary user journey has intentional empty, loading, and error states; obvious edge cases handled or explicitly surfaced. | **Inventory done** — [08-DEPTH-INVENTORY.md](./08-DEPTH-INVENTORY.md) maps routes → state matrix; filling gaps (empty/error on every journey) remains Workstream **A**. |
| **A11y** | Keyboard + focus order on auth and main app chrome; form labels and errors associated; contrast acceptable on dark theme; no `cursor: none` without reduced-motion escape (already partially done). | **Partial** — `prefers-reduced-motion` gates WebGL/cursor; **login + signup** use `label htmlFor` + `autoComplete`; keyboard audit + axe still open. |
| **Performance** | No blocking main-thread work on first paint beyond agreed budget; WebGL/cursor gated appropriately; bundle reviewed for obvious wins. | **Open** — Workstream **C** (Lighthouse / bundle baseline) not recorded. |
| **E2E** | At least one **stable** Playwright (or chosen runner) path per **critical** story (below), run in CI against API + DB. | **D1 + D2 in CI** — `packages/e2e` (Playwright), [`.github/workflows/e2e.yml`](../../../.github/workflows/e2e.yml); `npm run test:e2e` locally after `npm run build:all`. **D3–D4** still open. |
| **Integration** | Same builds/deploys exercised on a **staging** environment with real env shape (DB, JWT, DEMO_MODE). | **Doc’d** — Human smoke script: [08-STAGING-SMOKE.md](./08-STAGING-SMOKE.md). Env parity + pipeline still owner-operated per deploy target. |
| **Governance / ledger** | Documented scenarios + API tests (and/or E2E) prove server-enforced rules for balance mutations, votes, permissions—no “trust the UI.” | **API layer: in progress** — Scenarios: [`.planning/09-GOVERNANCE-SCENARIOS.md`](../../09-GOVERNANCE-SCENARIOS.md). Automated: `packages/api/test/governance/governance-scenarios.test.ts` (+ existing proposal/circle tests). **`TOKEN_EXPIRED`** on expired JWT (`auth-guard`). UI/E2E cross-check (§9) still open. |
| **Debt** | Decision recorded on **iframe landing vs React landing**; if staying iframe, document tradeoffs and test strategy; if migrating, scoped milestone with rollback. | **Recorded** — See **§11 Landing** in [`08-CONTEXT.md`](./08-CONTEXT.md); E2E starts at `/login` / `/signup` (iframe `/` optional follow-up). |

---

## 2. Critical user stories (prioritize depth + E2E here)

Order by **risk × frequency**—tune to your product, but start here:

1. **Sign up → onboarding → dashboard** (session, redirects, incomplete onboarding).
2. **Login → session refresh / logout** (token family behavior surfaced gracefully on 401).
3. **Create circle → view circle → invite/join request flow** (permissions, pending states).
4. **Contribution submit → pending → admin verify/reject** (ledger append-only narrative visible in UI copy + API reality).X
5. **Proposal create → vote → outcome** (server counts; UI read-only for tallies).
6. **Explore / list circles** (empty catalog, API errors, pagination if added later).

Everything else (portfolio, project detail, reporting) **follows** once the spine is green.

**Automated spot-check (Playwright):** `packages/e2e/tests/critical-stories.spec.ts` exercises **1, 2, 3, and 6** in one flow (signup → onboarding → dashboard → logout/login → create circle → explore). **4–5** (contribution verify, proposal vote/outcome) remain API-tested (`governance-scenarios`, `proposals`); add UI E2E when you want full D3 coverage.

---

## 3. Workstream A — Depth (empty, loading, error, edge cases)

**Approach:** Per page (or per route group), add a tiny **state matrix**: `loading | empty | error | success`.

**Tasks**

- [x] **Inventory:** [08-DEPTH-INVENTORY.md](./08-DEPTH-INVENTORY.md) — routes vs `loading | empty | error | success` (spot-check; not all gaps closed).
- [ ] **Dashboard:** Empty circles, API failure, partial data; copy aligned with governance messaging.
- [ ] **Circles list / detail:** No members, no contributions, no proposals; 403/404 from API.
- [ ] **Forms (new circle, contribution, proposal):** Validation errors from API (`field` mapping); network failure; success navigation.
- [ ] **Admin:** Empty pending queue; mutation failures; confirm destructive actions where applicable.
- [ ] **Global:** Consistent **toast** or inline error pattern; avoid silent failures.

**Exit:** For each critical story (§2), at least one reviewer can walk the matrix without hitting a blank screen or misleading message.

---

## 4. Workstream B — Accessibility (a11y)

**Tasks**

- [ ] **Keyboard:** Tab through login, signup, main nav, primary forms; fix traps and missing focus styles on custom-styled controls.
- [ ] **Forms:** Ensure every input has a visible label; associate `aria-describedby` for field errors where used. *(Login + signup: `htmlFor` / `id` + `autoComplete` done.)*
- [ ] **Custom cursor:** Keep `prefers-reduced-motion` path; ensure interactive elements remain usable with screen magnification (hit targets ≥ 44px where feasible).
- [ ] **Headings:** Logical `h1` → `h2` on major pages for screen readers.
- [ ] **Automated pass:** Add `@axe-core/playwright` (or eslint-plugin-jsx-a11y on CI) on a subset of routes—not full coverage at first.

**Exit:** Auth + dashboard + one circle flow pass axe with **no critical** violations; keyboard-only completion of signup → dashboard smoke.

---

## 5. Workstream C — Performance

**Tasks**

- [ ] **Baseline:** Lighthouse (or Web Vitals in staging) on `/`, `/login`, `/dashboard` with throttling.
- [ ] **WebGL background:** Confirm single instance, resize cleanup, no duplicate listeners; document “off” for low-power if needed.
- [ ] **Bundle:** `vite build --report` or analyzer; lazy-load heavy routes if any chunk > agreed threshold.
- [ ] **Images:** Logo and static assets sized appropriately; `loading="lazy"` where relevant.

**Exit:** Documented baseline + one measurable improvement (e.g. LCP or JS bundle size) or explicit “good enough” note with numbers.

---

## 6. Workstream D — E2E confidence (automated)

**Stack:** Prefer **Playwright** against `web` + `api` with a **test database** (seed script or Prisma reset). Run in CI on PR.

**Phased delivery**

| Phase | Scope |
|-------|--------|
| **D1** | CI job spins API + web + DB; one test: health or login page renders. |
| **D2** | **Happy path:** register (or seed user) → login → land on dashboard. |
| **D3** | **Governance path:** seed circle + contribution → admin verify → assert balance/ledger via API or UI contract. *(Partial: API tests + contribution copy on circle detail; full UI E2E for verify/vote optional next.)* |
| **D4** | Expand to proposal vote if API stable. |

**Tasks**

- [x] `packages/e2e` — Playwright, `vite preview` + API `dist/server.js`, relative `/api` proxy (see `packages/web/vite.config.ts` `preview.proxy`).
- [x] **Seed:** `global-setup.ts` calls `POST /api/v1/auth/signup` (throwaway user per run).
- [x] **GitHub Actions:** `.github/workflows/e2e.yml` — Postgres service, `prisma db push`, build api+web, Playwright Chromium.
- [x] Flake policy: `retries: 2` in CI, `trace: on-first-retry`.

**Exit:** D2 green on main; D3 green before calling staging “production-safe.” *(D1+D2 implemented; D3+ pending.)*

---

## 7. Workstream E — Integration & staging

**Tasks**

- [ ] **Staging env:** Same `NODE_ENV`, `DATABASE_URL`, JWT secrets shape as prod (not values); `DEMO_MODE` explicit.
- [ ] **Deploy pipeline:** Web + API versions pinned; migrations run automatically or documented one-command.
- [x] **Smoke checklist:** [08-STAGING-SMOKE.md](./08-STAGING-SMOKE.md) — human script mirroring §2.
- [ ] **Observability:** API logs for 4xx/5xx on critical routes; optional Sentry later.

**Exit:** Non-dev runs smoke checklist on staging after each release candidate without blockers.

---

## 8. Workstream F — Technical debt (theme + landing iframe)

**Decision checkpoint (week 1–2)**

| Option | Pros | Cons |
|--------|------|------|
| **Keep iframe landing** | Zero migration; design frozen | Harder E2E across `/`, duplicate cursor/fonts, SEO |
| **Port landing to React** | One router, one theme, full tests | Upfront cost; must preserve design fidelity |

**Tasks**

- [x] Document current decision in `08-CONTEXT.md` (§11 Landing).
- [x] If **keep iframe:** E2E starts at `/login` / `/signup`; splash `/` out of scope for D1/D2 (documented in context).
- [ ] If **port:** Milestone “Landing parity” with visual checklist against `avator-landing.html`.

**Theme debt**

- [ ] Replace remaining one-off `style={{}}` hex with tokens over time (lint rule or grep in CI optional).
- [ ] Align `mukwano-*` utilities with Tailwind `@theme` so new pages default correctly.

---

## 9. Workstream G — Governance & ledger (backend truth)

This is what moves the **rating** most: pixels are necessary; **correctness** is sufficient for trust.

**Tasks**

- [x] **Scenario doc:** [`.planning/09-GOVERNANCE-SCENARIOS.md`](../../09-GOVERNANCE-SCENARIOS.md) — routes under `/api/v1`, test status, resolved open questions.
- [x] **API tests:** `packages/api/test/governance/governance-scenarios.test.ts` (S-01–S-04, S-07, S-09, S-10, S-02, S-03); plus existing `circles` / `proposals` tests. Remaining manual items called out in scenario doc (S-05, S-06, S-08).
- [ ] **Cross-check:** One E2E or integration test that asserts **UI cannot** perform a forbidden action (e.g. expect API 403, UI shows error).
- [ ] **Manual:** Admin verifies contribution → DB ledger row count / immutability (if you have DB triggers, document expected error on UPDATE).

**Exit:** Scenario doc complete; every scenario has **automated** or **documented manual** evidence updated when behavior changes.

---

## 10. Suggested sequencing (calendar-agnostic)

1. **Sprint 1 — Spine:** Workstreams **G** (scenario list + tests) + **D1/D2** (E2E boots + login path) + **E** (staging smoke doc).
2. **Sprint 2 — Depth:** **A** on critical stories only + **B** keyboard/axe on same routes.
3. **Sprint 3 — Trust:** **D3** governance E2E + **G** hardening from failures.
4. **Sprint 4 — Polish:** **C** performance + **F** decision (iframe vs React) + remaining **A/B**.

Adjust lengths to team size; do not start **F** port until **D2** and **G** core scenarios are green.

---

## 11. Tracking

- Link PRs to this file or to Linear/Jira epics: `Depth`, `A11y`, `Perf`, `E2E`, `Staging`, `Debt`, `Governance`.
- Update **`08-VALIDATION.md`** (or `STATE.md`) when a workstream hits its exit criteria.

---

## 12. Quick reference checklist (copy for release candidates)

- [ ] Critical stories (§2) smoke on **staging** (use [08-STAGING-SMOKE.md](./08-STAGING-SMOKE.md))
- [x] E2E **D2** (min) green on CI — `.github/workflows/e2e.yml`
- [x] Governance scenarios (§9) **core API** coverage — see [09-GOVERNANCE-SCENARIOS.md](../../09-GOVERNANCE-SCENARIOS.md); E2E cross-check still open
- [ ] No critical axe violations on auth + dashboard
- [ ] Known debt (§8) documented with owner and date

---

*Last updated: 2026-03-31 — E2E D1/D2 (`packages/e2e` + CI), depth inventory, staging smoke doc, landing decision in context, auth label wiring.*
