---
phase: quick
plan: 260409-djc
subsystem: web-frontend, api
tags: [ux, mobile, compliance, legal, auth, public-routes]
dependency_graph:
  requires: []
  provides: [mobile-nav, public-explore, legal-pages, demo-mode-banner]
  affects: [AppLayout, ExplorePage, circles-route, router, SignupPage]
tech_stack:
  added: []
  patterns: [conditional-auth-rendering, per-route-preHandler, public-routes-in-router]
key_files:
  created:
    - packages/web/src/pages/legal/TermsPage.tsx
    - packages/web/src/pages/legal/PrivacyPage.tsx
  modified:
    - packages/web/src/components/layout/AppLayout.tsx
    - packages/web/src/router/index.tsx
    - packages/web/src/pages/ExplorePage.tsx
    - packages/web/src/pages/auth/SignupPage.tsx
    - packages/api/src/routes/circles.ts
    - packages/web/public/avator-landing.html
decisions:
  - Per-route preHandler instead of plugin-level authGuard so GET /circles stays public without restructuring plugin
  - ExplorePage renders its own minimal header/footer for unauthenticated users since it lives outside ProtectedLayout
  - DEMO MODE banner placed between header and main content in AppLayout (always visible when demoMode config is true)
metrics:
  duration: ~25 minutes
  completed: 2026-04-09
  tasks_completed: 5
  files_modified: 8
---

# Quick Task 260409-djc: Critical UX and Compliance Fix Summary

**One-liner:** Mobile hamburger nav, public explore page, KYC false claim removal, Terms/Privacy legal pages, and DEMO_MODE compliance disclaimers added throughout.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add mobile hamburger menu to AppLayout | 8f6746a | AppLayout.tsx |
| 2 | Enable public circle browsing without auth | 975b0ab | circles.ts, router/index.tsx, ExplorePage.tsx |
| 3 | Fix KYC false claim in landing page | 5896fb9 | avator-landing.html |
| 4 | Create Terms of Service and Privacy Policy pages | cf8b7ed | TermsPage.tsx, PrivacyPage.tsx |
| 5 | Add compliance disclaimers to signup page | 094d5ad | SignupPage.tsx |

## What Was Built

### Task 1: Mobile Navigation
- Added `mobileMenuOpen` state with `useLocation`-based auto-close on route change
- Hamburger (`menu`) / close (`close`) Material Symbols icon, visible only on mobile (`md:hidden`)
- Slide-out drawer with all nav links (Dashboard, My Circles, Explore, Portfolio, conditional Admin), Profile, and Logout
- Active state styling: gold color + left border accent
- DEMO MODE banner between header and main content, visible when `config.demoMode` is true
- Footer with Terms/Privacy links and copyright added to AppLayout

### Task 2: Public Explore Page
- Removed plugin-level `fastify.addHook('preHandler', authGuard)` from circles route
- Added `preHandler: [authGuard]` to every route except `GET /circles` (public)
- Moved `/explore` route outside `ProtectedLayout` in router (now alongside login/signup)
- Added `enabled: !!user` to my-requests query in ExplorePage
- Unauthenticated users see "Sign up to join" CTAs instead of join-request buttons
- Hero CTAs link to `/signup` for unauthenticated users
- ExplorePage renders a minimal branded header + footer when user is not authenticated

### Task 3: KYC False Claim Removal
- Replaced "Automated KYC verification, compliance monitoring, and admin oversight keeps every circle operating at 99.8% governance health." with "Server-enforced governance rules, contribution verification, and admin oversight keeps every circle accountable and transparent."
- Zero KYC mentions remain in the landing page

### Task 4: Legal Pages
- `TermsPage.tsx`: 8 sections including prominent gold border-left DEMO MODE DISCLAIMER at top; accessible at `/terms` without auth
- `PrivacyPage.tsx`: 9 sections including prominent DEMO MODE NOTICE; accessible at `/privacy` without auth
- Both pages styled consistently with app dark theme (navy background, gold accents, Inter/Outfit fonts)
- Cross-linked in footers; both pages also linked from AppLayout footer and SignupPage

### Task 5: Signup Compliance Disclaimer
- Added small-text disclaimer below the Continue button: "This platform is in demo mode. No real funds are collected or processed. By signing up, you agree to our Terms of Service and Privacy Policy."
- Terms of Service and Privacy Policy are React Router `Link` elements styled in gold

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all pages and functionality are fully wired.

## Verification

- TypeScript compiles without errors: confirmed (clean output)
- KYC check: `grep -c "KYC" packages/web/public/avator-landing.html` returns `0`
- All 5 task commits present: 8f6746a, 975b0ab, 5896fb9, cf8b7ed, 094d5ad

## Self-Check: PASSED

Files verified:
- packages/web/src/components/layout/AppLayout.tsx — FOUND
- packages/web/src/router/index.tsx — FOUND
- packages/web/src/pages/ExplorePage.tsx — FOUND
- packages/web/src/pages/auth/SignupPage.tsx — FOUND
- packages/api/src/routes/circles.ts — FOUND
- packages/web/public/avator-landing.html — FOUND
- packages/web/src/pages/legal/TermsPage.tsx — FOUND
- packages/web/src/pages/legal/PrivacyPage.tsx — FOUND

Commits verified: 8f6746a, 975b0ab, 5896fb9, cf8b7ed, 094d5ad — all present in git log.
