# Depth inventory — route state matrix

Companion to [08-PLAN-08-depth-production-readiness.md](./08-PLAN-08-depth-production-readiness.md) Workstream **A**.

Legend: **Y** = intentional UI for that state, **P** = partial / implicit only, **—** = not applicable (static or mutation-only), **N** = gap to close.

| Route | Page | Loading | Empty | Error | Notes |
|-------|------|---------|-------|-------|--------|
| `/` | `SplashPage` | — | — | — | Marketing / iframe; no data fetch |
| `/login` | `LoginPage` | — | — | P | Submit errors → toast |
| `/signup` | `SignupPage` | — | — | P | Field + toast on API validation |
| `/dashboard` | `DashboardPage` | Y | Y | Y | Empty “No circles” block |
| `/onboarding/sector` | `OnboardingSectorPage` | P | — | P | `isPending` on CTA |
| `/onboarding/country` | `OnboardingCountryPage` | P | P | P | Empty search grid edge case |
| `/onboarding/complete` | `OnboardingCompletePage` | — | — | — | Static success |
| `/circles` | `CirclesListPage` | Y | Y | Y | |
| `/circles/new` | `NewCirclePage` | P | — | P | Mutation pending + toast |
| `/circles/:id` | `CircleDetailPage` | N | P | N | Relies on undefined data; 403/404 not dedicated screens |
| `/circles/:id/contributions/new` | `NewContributionPage` | P | — | P | |
| `/circles/:id/proposals/new` | `NewProposalPage` | P | — | P | |
| `/circles/:id/proposals/:pid` | `ProposalDetailPage` | P | P | P | |
| `/circles/:id/projects/:projId` | `ProjectDetailPage` | P | P | P | |
| `/portfolio` | `PortfolioPage` | Y | P | Y | |
| `/explore` | `ExplorePage` | Y | P | Y | |
| `/admin` | `AdminPage` | Y | P | Y | Tabbed lists |
| `/profile` | `ProfilePage` | P | — | P | |

**Next actions (highest leverage):** `CircleDetailPage` loading/error + explicit 403/404 for invalid circle id; align “empty” copy with §2 critical stories.

*Generated from `packages/web/src/router/index.tsx` and page sources; update when routes change.*
