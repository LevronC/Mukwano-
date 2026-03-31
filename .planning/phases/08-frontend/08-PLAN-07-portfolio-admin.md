---
phase: 08-frontend
plan: 07
type: execute
wave: 7
depends_on: [08-06]
files_modified:
  - packages/web/src/pages/PortfolioPage.tsx
  - packages/web/src/pages/PortfolioPage.test.tsx
  - packages/web/src/pages/admin/AdminPage.tsx
  - packages/web/src/pages/admin/AdminPage.test.tsx
  - packages/web/src/router/index.tsx
autonomous: true
requirements: [FE-09, FE-10]

must_haves:
  truths:
    - "Portfolio page fetches GET /api/v1/portfolio (NOT /me/portfolio) and GET /api/v1/portfolio/summary"
    - "Portfolio summary cards show totalContributed, totalVerified, totalInProjects"
    - "Admin page is only reachable when user.isGlobalAdmin === true — non-admins see an Access Denied message"
    - "Admin page has 4 tabs via ?tab=pending|members|ledger|activity"
    - "Pending tab fetches GET /admin/contributions/pending and lists circle name, user, amount, status"
    - "Members tab fetches GET /admin/members and shows each user with a toggle for isGlobalAdmin"
    - "Toggle calls PATCH /admin/members/:id/role with { isGlobalAdmin: boolean }"
    - "Ledger tab fetches GET /admin/ledger and shows a paginated table"
    - "Activity tab fetches GET /admin/activity and shows an event feed"
  artifacts:
    - path: "packages/web/src/pages/PortfolioPage.tsx"
      provides: "Personal portfolio with summary cards and contribution list"
      exports: ["PortfolioPage"]
    - path: "packages/web/src/pages/admin/AdminPage.tsx"
      provides: "Global admin panel with 4 tabs"
      exports: ["AdminPage"]
  key_links:
    - from: "packages/web/src/pages/PortfolioPage.tsx"
      to: "GET /api/v1/portfolio"
      via: "useQuery(['portfolio']) — NOT /me/portfolio"
      pattern: "queryKey.*portfolio"
    - from: "packages/web/src/pages/PortfolioPage.tsx"
      to: "GET /api/v1/portfolio/summary"
      via: "useQuery(['portfolio', 'summary'])"
      pattern: "portfolio.*summary"
    - from: "packages/web/src/pages/admin/AdminPage.tsx"
      to: "PATCH /api/v1/admin/members/:id/role"
      via: "api.patch with { isGlobalAdmin: boolean }"
      pattern: "isGlobalAdmin.*boolean"
    - from: "packages/web/src/pages/admin/AdminPage.tsx"
      to: "user.isGlobalAdmin"
      via: "useAuth() guard — redirect or error if false"
      pattern: "isGlobalAdmin"
---

<objective>
Implement PortfolioPage (personal contribution history + summary totals) and AdminPage (global admin panel with pending contributions, member management, ledger, and activity feed).

Purpose: Closes the member-view loop (portfolio) and provides global platform oversight (admin panel). Both pages depend on reporting endpoints.
Output: Two pages with TanStack Query data fetching, correct endpoint paths, and passing tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-frontend/08-CONTEXT.md
@.planning/phases/08-frontend/08-RESEARCH.md
</context>

<interfaces>
<!-- API contracts extracted from reporting.ts and RESEARCH.md -->

GET /api/v1/portfolio:
  Correct path — NOT /me/portfolio, NOT /user/portfolio.
  Returns: Array of contributions with circle info.
  Fields per item: { id, circleId, circleName?, amount, status, currency, submittedAt }

GET /api/v1/portfolio/summary:
  Returns: { totalContributed: number, totalVerified: number, totalInProjects: number }

GET /api/v1/admin/contributions/pending (global admin only):
  Returns: array of pending contributions across all circles.
  Expected fields: { id, circleId, circleName?, userId, amount, currency, status, submittedAt,
                    user: { id, email, displayName } }

GET /api/v1/admin/members (global admin only):
  Returns: array of all users across the platform.
  Expected fields: { id, email, displayName, isGlobalAdmin, createdAt }

PATCH /api/v1/admin/members/:id/role:
  Request body: { isGlobalAdmin: boolean }   -- REQUIRED field, boolean
  Returns: updated user object

GET /api/v1/admin/ledger (global admin only):
  Returns: LedgerPage { page, pageSize, total, items: LedgerEntry[] }
  LedgerEntry fields: { id, circleId, userId, amount, runningBalance, currency, type, recordedAt }

GET /api/v1/admin/activity (global admin only):
  Returns: array of activity events.
  Expected fields: { id, type, description, createdAt }

isGlobalAdmin guard:
  Read from useAuth() → user.isGlobalAdmin
  If false: render an Access Denied card — do NOT redirect (user might be on /admin by accident)
</interfaces>

<tasks>

<task id="07-01" name="Implement PortfolioPage and AdminPage">
  <read_first>
    - packages/web/src/api/types.ts
    - packages/web/src/api/client.ts
    - packages/web/src/hooks/useAuth.ts
    - packages/web/src/router/index.tsx
    - packages/web/src/components/shared/StatusBadge.tsx
  </read_first>
  <action>
    Create packages/web/src/pages/PortfolioPage.tsx:
    ```tsx
    import { useQuery } from '@tanstack/react-query'
    import { api } from '../api/client'
    import type { Portfolio, PortfolioSummary } from '../api/types'
    import { StatusBadge } from '../components/shared/StatusBadge'
    import { LoadingSpinner } from '../components/shared/LoadingSpinner'
    import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

    export function PortfolioPage() {
      // CRITICAL: endpoint is /portfolio NOT /me/portfolio
      const { data: contributions, isLoading: listLoading } = useQuery<Portfolio[]>({
        queryKey: ['portfolio'],
        queryFn: () => api.get('/portfolio'),
      })
      const { data: summary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
        queryKey: ['portfolio', 'summary'],
        queryFn: () => api.get('/portfolio/summary'),
      })

      if (listLoading || summaryLoading) return <LoadingSpinner />

      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">My Portfolio</h1>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-primary">
                    {Number(summary.totalContributed).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Contributed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-green-600">
                    {Number(summary.totalVerified).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Verified</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-blue-600">
                    {Number(summary.totalInProjects).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">In Active Projects</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contribution list */}
          <div className="space-y-3">
            <h2 className="font-semibold">Contributions</h2>
            {(!contributions || contributions.length === 0) && (
              <p className="text-sm text-muted-foreground">No contributions yet.</p>
            )}
            {contributions?.map(c => (
              <Card key={c.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    {c.circleName && (
                      <p className="text-sm font-medium">{c.circleName}</p>
                    )}
                    <p className="text-sm">{Number(c.amount).toLocaleString()} {c.currency}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }
    ```

    Create packages/web/src/pages/admin/AdminPage.tsx:
    ```tsx
    import { useSearchParams } from 'react-router-dom'
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import { useAuth } from '../../hooks/useAuth'
    import { StatusBadge } from '../../components/shared/StatusBadge'
    import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
    import { Button } from '../../components/ui/button'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
    import { Badge } from '../../components/ui/badge'

    type AdminTab = 'pending' | 'members' | 'ledger' | 'activity'
    const TABS: AdminTab[] = ['pending', 'members', 'ledger', 'activity']

    export function AdminPage() {
      const { user } = useAuth()
      const [searchParams, setSearchParams] = useSearchParams()
      const tab = (searchParams.get('tab') ?? 'pending') as AdminTab
      const qc = useQueryClient()

      // Global admin guard
      if (!user?.isGlobalAdmin) {
        return (
          <Card className="max-w-md mx-auto mt-16">
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-semibold text-red-600">Access Denied</p>
              <p className="text-sm text-muted-foreground mt-2">
                This page requires global admin access.
              </p>
            </CardContent>
          </Card>
        )
      }

      const { data: pendingContribs, isLoading: pendingLoading } = useQuery<any[]>({
        queryKey: ['admin', 'pending'],
        queryFn: () => api.get('/admin/contributions/pending'),
        enabled: tab === 'pending',
      })
      const { data: members, isLoading: membersLoading } = useQuery<any[]>({
        queryKey: ['admin', 'members'],
        queryFn: () => api.get('/admin/members'),
        enabled: tab === 'members',
      })
      const { data: ledger, isLoading: ledgerLoading } = useQuery<any>({
        queryKey: ['admin', 'ledger'],
        queryFn: () => api.get('/admin/ledger'),
        enabled: tab === 'ledger',
      })
      const { data: activity, isLoading: activityLoading } = useQuery<any[]>({
        queryKey: ['admin', 'activity'],
        queryFn: () => api.get('/admin/activity'),
        enabled: tab === 'activity',
      })

      const toggleAdminMutation = useMutation({
        mutationFn: ({ id, isGlobalAdmin }: { id: string; isGlobalAdmin: boolean }) =>
          api.patch(`/admin/members/${id}/role`, { isGlobalAdmin }),
        onSuccess: () => {
          toast.success('Role updated')
          qc.invalidateQueries({ queryKey: ['admin', 'members'] })
        },
        onError: (err: any) => toast.error(err?.error?.message ?? 'Failed to update role'),
      })

      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Admin Panel</h1>

          {/* Tab bar */}
          <div className="flex border-b gap-6">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setSearchParams({ tab: t })}
                className={`pb-2 text-sm capitalize transition-colors ${tab === t ? 'border-b-2 border-primary font-semibold text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Pending contributions tab */}
          {tab === 'pending' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Pending Contributions</h2>
              {pendingLoading && <LoadingSpinner />}
              {!pendingLoading && (!pendingContribs || pendingContribs.length === 0) && (
                <p className="text-sm text-muted-foreground">No pending contributions.</p>
              )}
              {pendingContribs?.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      {c.circleName && <p className="text-xs text-muted-foreground">{c.circleName}</p>}
                      <p className="text-sm font-medium">{c.user?.displayName ?? c.userId}</p>
                      <p className="text-sm">{Number(c.amount).toLocaleString()} {c.currency}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Members tab */}
          {tab === 'members' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Members</h2>
              {membersLoading && <LoadingSpinner />}
              {members?.map((m: any) => (
                <Card key={m.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{m.displayName ?? m.email}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.isGlobalAdmin && (
                        <Badge className="bg-purple-100 text-purple-800">Global Admin</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAdminMutation.mutate({
                          id: m.id,
                          isGlobalAdmin: !m.isGlobalAdmin,
                        })}
                        disabled={toggleAdminMutation.isPending}
                      >
                        {m.isGlobalAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Ledger tab */}
          {tab === 'ledger' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Global Ledger</h2>
              {ledgerLoading && <LoadingSpinner />}
              {ledger && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {ledger.total} entries (page {ledger.page} of {Math.ceil(ledger.total / ledger.pageSize)})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Amount</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.items?.map((entry: any) => (
                          <tr key={entry.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 text-xs">{new Date(entry.recordedAt).toLocaleDateString()}</td>
                            <td className="py-2 px-3">{entry.type}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {Number(entry.amount) >= 0 ? '+' : ''}{Number(entry.amount).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {Number(entry.runningBalance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Activity tab */}
          {tab === 'activity' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Activity Feed</h2>
              {activityLoading && <LoadingSpinner />}
              {(!activity || activity.length === 0) && !activityLoading && (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
              {activity?.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                  <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  <div>
                    <p className="text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    ```

    Update packages/web/src/router/index.tsx:
    - Replace stub('Portfolio') with `<PortfolioPage />`
    - Replace stub('Admin') with `<AdminPage />`
    Add imports:
      import { PortfolioPage } from '../pages/PortfolioPage'
      import { AdminPage } from '../pages/admin/AdminPage'
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/PortfolioPage.tsx contains `queryKey: ['portfolio']` with path `/portfolio` (not `/me/portfolio`)
    - packages/web/src/pages/PortfolioPage.tsx contains `queryKey: ['portfolio', 'summary']`
    - packages/web/src/pages/PortfolioPage.tsx renders `totalContributed`, `totalVerified`, `totalInProjects`
    - packages/web/src/pages/admin/AdminPage.tsx contains `user?.isGlobalAdmin` guard
    - packages/web/src/pages/admin/AdminPage.tsx contains all 4 tabs: pending, members, ledger, activity
    - packages/web/src/pages/admin/AdminPage.tsx contains `{ isGlobalAdmin: boolean }` in PATCH body
    - packages/web/src/router/index.tsx imports PortfolioPage and AdminPage (no stubs)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <done>PortfolioPage shows summary cards + contribution list; AdminPage guards on isGlobalAdmin and provides 4 admin tabs</done>
</task>

<task id="07-02" name="Write tests for PortfolioPage and AdminPage">
  <read_first>
    - packages/web/src/pages/PortfolioPage.tsx (just created)
    - packages/web/src/pages/admin/AdminPage.tsx (just created)
    - packages/web/src/test/test-utils.tsx
    - packages/web/src/test/handlers.ts
  </read_first>
  <action>
    Create packages/web/src/pages/PortfolioPage.test.tsx:

    Test cases:
    1. "renders portfolio summary cards with correct totals"
       MSW mock GET /api/v1/portfolio → []
       MSW mock GET /api/v1/portfolio/summary → { totalContributed: 1500, totalVerified: 1000, totalInProjects: 500 }
       Assert: '1,500' visible, '1,000' visible, '500' visible

    2. "fetches /portfolio not /me/portfolio"
       Set up MSW handler for /api/v1/portfolio that records it was called.
       Also set up /api/v1/me/portfolio to return 404.
       Render PortfolioPage.
       Assert: /api/v1/portfolio was requested (not the /me/portfolio path).

    3. "renders contribution list with status badges"
       MSW mock GET /api/v1/portfolio → [{ id: 'c-1', circleName: 'Test Circle', amount: 200, currency: 'USD', status: 'verified', submittedAt: new Date().toISOString() }]
       Assert: 'Test Circle' and 'verified' status badge visible

    4. "empty state shows no contributions message"
       MSW mock GET /api/v1/portfolio → []
       Assert: 'No contributions yet.' visible

    Create packages/web/src/pages/admin/AdminPage.test.tsx:

    Test cases:
    1. "non-global-admin user sees Access Denied"
       Render with user.isGlobalAdmin = false
       Assert: 'Access Denied' text visible

    2. "global admin user sees the admin panel with tabs"
       Render with user.isGlobalAdmin = true
       Assert: tabs 'pending', 'members', 'ledger', 'activity' all visible

    3. "pending tab shows contributions list"
       Render with admin user, tab=pending
       MSW mock GET /api/v1/admin/contributions/pending → [{ id: 'c-1', userId: 'u-1', amount: 100, currency: 'USD', status: 'pending', submittedAt: new Date().toISOString(), user: { id: 'u-1', email: 'a@b.com', displayName: 'Alice' } }]
       Assert: 'Alice' and '100' visible

    4. "members tab shows users with toggle button"
       Render with admin user, click members tab (setSearchParams)
       MSW mock GET /api/v1/admin/members → [{ id: 'u-2', email: 'bob@b.com', displayName: 'Bob', isGlobalAdmin: false }]
       Assert: 'Bob' visible, 'Make Admin' button visible

    5. "toggle admin calls PATCH /admin/members/:id/role with { isGlobalAdmin: boolean }"
       Click 'Make Admin' for a member
       Assert MSW captured: PATCH /api/v1/admin/members/u-2/role with body { isGlobalAdmin: true }
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/PortfolioPage.test.tsx exists with at least 3 test cases
    - packages/web/src/pages/admin/AdminPage.test.tsx exists with at least 4 test cases
    - AdminPage test file contains assertion on `isGlobalAdmin: true` PATCH body
    - PortfolioPage test file contains assertion that `/portfolio` path was called (not `/me/portfolio`)
    - `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/PortfolioPage.test.tsx src/pages/admin/AdminPage.test.tsx` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/PortfolioPage.test.tsx src/pages/admin/AdminPage.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <done>Portfolio and Admin tests pass: correct API paths, isGlobalAdmin guard, admin toggle PATCH body verified</done>
</task>

</tasks>

## Verification Criteria

- `grep "api.get('/portfolio')" packages/web/src/pages/PortfolioPage.tsx` returns match (not /me/portfolio)
- `grep "portfolio.*summary" packages/web/src/pages/PortfolioPage.tsx` returns match
- `grep 'totalContributed' packages/web/src/pages/PortfolioPage.tsx` returns match
- `grep 'isGlobalAdmin' packages/web/src/pages/admin/AdminPage.tsx` returns match (guard)
- `grep "isGlobalAdmin.*boolean" packages/web/src/pages/admin/AdminPage.tsx` returns match (PATCH body)
- `grep "pending.*members.*ledger.*activity" packages/web/src/pages/admin/AdminPage.tsx` returns match
- `npm run build --workspace=packages/web` exits 0
- `cd packages/web && npx vitest --run src/pages/PortfolioPage.test.tsx src/pages/admin/AdminPage.test.tsx` exits with 0 failures

## must_haves

- Portfolio page fetches `/portfolio` endpoint — NOT `/me/portfolio` or any other path
- Portfolio shows three summary cards: totalContributed, totalVerified, totalInProjects
- Admin page immediately shows Access Denied content for non-global-admin users
- Admin members tab toggle calls PATCH `/admin/members/:id/role` with body `{ isGlobalAdmin: boolean }` — the boolean field is the exact API contract
- All four admin tabs (pending, members, ledger, activity) are reachable via `?tab=` URL param

<output>
After completion, create `.planning/phases/08-frontend/08-07-SUMMARY.md`
</output>
