---
phase: quick
plan: 260409-hfk
subsystem: web/ui
tags: [explore-page, custom-cursor, landing-page, responsive, mobile, touch-device]
dependency_graph:
  requires: []
  provides: [balanced-explore-layout, touch-safe-cursor, mobile-responsive-landing]
  affects: [packages/web/src/pages/ExplorePage.tsx, packages/web/src/components/theme/CustomCursor.tsx, packages/web/src/index.css, packages/web/public/avator-landing.html]
tech_stack:
  added: []
  patterns: [media-query-pointer-fine, react-hooks-ordering, responsive-mobile-first]
key_files:
  created: []
  modified:
    - packages/web/src/pages/ExplorePage.tsx
    - packages/web/src/components/theme/CustomCursor.tsx
    - packages/web/src/index.css
    - packages/web/public/avator-landing.html
decisions:
  - "Used module-level hasFinePointer constant (evaluated once at load) instead of useState to avoid hook ordering violations — early return placed after useEffect call"
  - "Chose lg:grid-cols-5 (3/2 split) over lg:grid-cols-2 for explore hero: gives slightly more text weight without extreme asymmetry"
metrics:
  duration: ~12 minutes
  completed: 2026-04-09T16:37:27Z
  tasks_completed: 3
  files_modified: 4
---

# Phase quick Plan 260409-hfk: Fix 4 UI Issues — Explore Page Layout, Custom Cursor Touch Gating, Landing Page Mobile Responsiveness

**One-liner:** Balanced explore hero grid (5-col 3/2 split), compact side-by-side card buttons, touch device cursor suppression via matchMedia pointer:fine, and full 768px + 480px mobile breakpoints on the landing page.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix Explore page layout alignment and card proportions | 3ef89b6 | packages/web/src/pages/ExplorePage.tsx |
| 2 | Gate custom cursor to pointer:fine devices only | 933eab7 | packages/web/src/components/theme/CustomCursor.tsx, packages/web/src/index.css |
| 3 | Fix landing page mobile/tablet responsiveness | 7963bd9 | packages/web/public/avator-landing.html |

## What Was Built

### Task 1: Explore page hero grid and card proportions

- Changed hero section from `lg:grid-cols-12` with 7/5 col-span to `lg:grid-cols-5` with 3/2 col-span — less extreme left-heaviness, better visual balance
- Reduced card padding from `p-6` to `p-5` and internal gap from `gap-4` to `gap-3`
- Moved both action buttons (Open/Sign up + Request to Join/Sign up to join) into a shared `flex flex-wrap gap-2` wrapper so they sit side-by-side on the same row
- Updated card grid gap from `gap-5` to `gap-6` for breathing room

### Task 2: Custom cursor touch device gating

- Added module-level `hasFinePointer` constant: `window.matchMedia('(hover: hover) and (pointer: fine)').matches`
- Guards `useEffect` body — listeners (mousemove, pointerover, pointerout) never registered on touch devices
- Early return `null` from render placed **after** `useEffect` call to comply with React rules of hooks
- Wrapped `cursor: none` CSS in `@media (hover: hover) and (pointer: fine)` in `index.css` so the native cursor is never suppressed on touch browsers

### Task 3: Landing page mobile responsiveness

- Extended 768px `@media` query with: compact nav CTAs, stacked hero buttons (full-width, max 280px), reduced feature card padding (52px → 32px), reduced section padding to 60px/20px for features/showcase/values/cta, stacked CTA buttons, condensed footer padding
- Added 480px small-phone query: tighter nav/hero padding, font-size reductions for hero title (36px), script (16px), section title (28px), showcase title (30px), CTA title (36px), and smaller logo scene (140px)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React rules of hooks violation in CustomCursor**
- **Found during:** Task 2
- **Issue:** Plan's suggested implementation placed `if (!hasFinePointer) return null` before `useEffect`, which violates React's rule that hooks must always be called unconditionally in the same order
- **Fix:** Moved the early return to after the `useEffect` call; added the `hasFinePointer` guard inside the `useEffect` body so listeners never register on touch devices; the DOM elements are still not rendered (null return) on touch devices
- **Files modified:** packages/web/src/components/theme/CustomCursor.tsx
- **Commit:** 933eab7

## Known Stubs

None — all changes are UI/CSS fixes with no data stubs or placeholder text introduced.

## Self-Check: PASSED

Files exist:
- packages/web/src/pages/ExplorePage.tsx: FOUND
- packages/web/src/components/theme/CustomCursor.tsx: FOUND
- packages/web/src/index.css: FOUND
- packages/web/public/avator-landing.html: FOUND

Commits exist:
- 3ef89b6: FOUND (explore page layout)
- 933eab7: FOUND (custom cursor touch gating)
- 7963bd9: FOUND (landing page mobile)
