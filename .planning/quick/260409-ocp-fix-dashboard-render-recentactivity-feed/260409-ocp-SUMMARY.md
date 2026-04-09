---
phase: quick
plan: 260409-ocp
subsystem: web/dashboard
tags: [dashboard, activity-feed, progress-bars, ui]
dependency_graph:
  requires: []
  provides: [dashboard-activity-feed, dashboard-progress-bars]
  affects: [DashboardPage, Progress component]
tech_stack:
  added: []
  patterns: [useQueries for parallel per-circle treasury fetches, relative time helper, activity type icon mapping]
key_files:
  created: []
  modified:
    - packages/web/src/pages/DashboardPage.tsx
    - packages/web/src/components/ui/progress.tsx
decisions:
  - "Used useQueries for parallel treasury fetches rather than sequential to avoid waterfall"
  - "Progress label uses currency from circle object rather than hardcoding USD"
metrics:
  duration: ~8 minutes
  completed: 2026-04-09
  tasks_completed: 2
  files_changed: 2
---

# Phase quick Plan 260409-ocp: Fix Dashboard Render Recent Activity Feed Summary

**One-liner:** Wired the existing `recentActivity` API array and per-circle treasury balances into the dashboard as an icon-labeled timestamped feed and gold progress bars.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Restyle Progress component for dark Mukwano theme | 4b604a3 | packages/web/src/components/ui/progress.tsx |
| 2 | Add Recent Activity feed and circle progress bars to DashboardPage | 381cbe6 | packages/web/src/pages/DashboardPage.tsx |

## What Was Built

**Progress component (packages/web/src/components/ui/progress.tsx):**
- Gold gradient fill (`var(--mk-gold)` to `var(--mk-gold2)`) on a dark glass track (`rgba(190,201,195,0.10)`)
- Optional `label` prop rendered above the bar in muted color
- Optional `percentage` boolean prop (default `true`) showing rounded numeric percent
- `rounded-full` on both track and fill, `h-2` height preserved

**DashboardPage (packages/web/src/pages/DashboardPage.tsx):**
- Typed the `DashboardData` response to include `goalAmount: number` and `currency: string` on circles, and a proper `ActivityItem` array for `recentActivity`
- Added `useQueries` parallel fetch for each circle's `/circles/:id/treasury` endpoint; built a `Map<circleId, balance>` for O(1) lookup
- Each circle card now renders a `Progress` bar with the label `{currency} {balance} / {currency} {goalAmount} goal`
- New "Recent Activity" section renders the last 10 `recentActivity` items with:
  - `activityIcon()` helper mapping 10 activity types to Material Symbols icons + colors
  - `formatActivityType()` that splits on `_` and title-cases each word
  - `timeAgo()` inline helper covering minutes, hours, days, weeks
  - Dividers between items via inline `borderBottom` style; last item has no border
  - Empty state with `info` icon when no activity exists

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - treasury balance and recentActivity are live API data.

## Self-Check: PASSED

- packages/web/src/pages/DashboardPage.tsx: exists
- packages/web/src/components/ui/progress.tsx: exists
- Commit 4b604a3: exists
- Commit 381cbe6: exists
- TypeScript: compiles cleanly (0 errors)
