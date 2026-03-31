---
phase: 08-frontend
plan: 04
type: execute
wave: 4
depends_on: [08-03]
files_modified:
  - packages/web/src/pages/circles/CircleDetailPage.tsx
  - packages/web/src/pages/circles/CircleDetailPage.test.tsx
  - packages/web/src/router/index.tsx
autonomous: true
requirements: [FE-04, FE-06]

must_haves:
  truths:
    - "Circle detail page renders 4 tabs controlled by ?tab=overview|contributions|proposals|projects"
    - "Default tab when no ?tab param is 'overview'"
    - "Overview tab shows circle name, governance config, treasury balanceLabel (not raw balance), and member list"
    - "Contributions tab lists contributions with status badges; circle admins (role creator|admin) see inline Verify and Reject buttons"
    - "Verify calls PATCH /circles/:id/contributions/:cid/verify (not POST); Reject calls PATCH with { reason: string }"
    - "Proposals tab lists proposals; Open proposals show a Vote link to /circles/:id/proposals/:pid; admins see Close button"
    - "Projects tab lists projects with a StatusBadge for each"
    - "A user with role creator or admin sees inline Verify, Reject, and Close buttons; a user with role member does not see these buttons"
  artifacts:
    - path: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      provides: "Tabbed circle detail: overview, contributions, proposals, projects"
      exports: ["CircleDetailPage"]
    - path: "packages/web/src/pages/circles/CircleDetailPage.test.tsx"
      provides: "Tests for tab routing, role gating, verify/reject PATCH calls"
  key_links:
    - from: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      to: "GET /api/v1/circles/:id"
      via: "useQuery(['circle', id])"
      pattern: "queryKey.*'circle'"
    - from: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      to: "GET /api/v1/circles/:id/members"
      via: "useQuery(['members', id]) to determine current user role"
      pattern: "queryKey.*'members'"
    - from: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      to: "PATCH /api/v1/circles/:id/contributions/:cid/verify"
      via: "useMutation calling api.patch (not api.post)"
      pattern: "api\\.patch.*verify"
    - from: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      to: "PATCH /api/v1/circles/:id/contributions/:cid/reject"
      via: "useMutation calling api.patch with { reason: string }"
      pattern: "api\\.patch.*reject"
    - from: "packages/web/src/pages/circles/CircleDetailPage.tsx"
      to: "GET /api/v1/circles/:id/treasury"
      via: "useQuery(['treasury', id]) — displays balanceLabel field"
      pattern: "balanceLabel"
---

<objective>
Implement the Circle Detail page with 4 URL-driven tabs (overview, contributions, proposals, projects), role-gated inline admin actions for verify/reject/close, and treasury balance display.

Purpose: The circle detail is the primary governance hub. Members view state; admins act inline. Role is derived from GET /circles/:id/members (not the circle overview, which does not expose the current user's role).
Output: CircleDetailPage.tsx with full tab UI, TanStack Query data fetching, inline admin mutations, and a passing test suite.
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
<!-- Exact API response shapes extracted from source code -->

GET /api/v1/circles/:id (circle.service.ts getCircleOverview):
  Returns Prisma circle + include: { governanceConfig: true }
  Fields: { id, name, description, goalAmount, currency, status, createdBy, createdAt, updatedAt, governanceConfig: { id, circleId, minContribution, votingModel, quorumPercent, approvalPercent, proposalDurationDays, whoCanPropose, requireProof } }
  NOTE: Does NOT include the current user's role. Role requires a separate call.

GET /api/v1/circles/:id/members (circle.service.ts listMembers):
  Returns: Array<{ circleId, userId, role: 'member'|'contributor'|'creator'|'admin', joinedAt, user: { id, email, displayName, country, sector, isGlobalAdmin } }>
  Use this to find current user's role: members.find(m => m.userId === user.id)?.role

GET /api/v1/circles/:id/contributions (contribution.service.ts listContributions):
  ADMIN ONLY — only circle admins can call this endpoint.
  Returns: Array<{ id, circleId, userId, amount, note, status: 'pending'|'verified'|'rejected', currency, submittedAt, verifiedAt?, verifiedBy?, rejectionReason?, user: { id, email, displayName }, proofDocuments: ProofDocument[] }>

PATCH /api/v1/circles/:id/contributions/:cid/verify:
  No request body required.
  Response: { contribution: updated, ledgerEntry }

PATCH /api/v1/circles/:id/contributions/:cid/reject:
  Request body: { reason: string }  -- required, min 1, max 1000
  Response: updated contribution

GET /api/v1/circles/:id/proposals (from proposals.ts):
  Returns array of proposals for the circle.
  Proposal fields: { id, circleId, createdBy, title, description, requestedAmount, currency, status: 'open'|'closed_passed'|'closed_failed'|'cancelled', votingDeadline, createdAt }

POST /api/v1/circles/:id/proposals/:pid/close:
  No request body. Admin only. Closes the proposal.

GET /api/v1/circles/:id/projects:
  Returns: Array<{ id, circleId, proposalId, createdBy, title, description, budget, currency, status: 'approved'|'executing'|'complete'|'cancelled', createdAt, completedAt?, updates: ProjectUpdate[] }>

GET /api/v1/circles/:id/treasury:
  Returns: { circleId, balance, currency, balanceLabel }
  ALWAYS display balanceLabel — never the raw balance number alone.

Imports available from Wave 1:
  import { api } from '../../api/client'
  import type { Circle, Contribution, Proposal, Project, CircleMembership, Treasury } from '../../api/types'
  import { StatusBadge } from '../../components/shared/StatusBadge'
  import { useAuth } from '../../hooks/useAuth'
</interfaces>

<tasks>

<task id="04-01" name="Implement CircleDetailPage with 4 tabs and data fetching">
  <read_first>
    - packages/web/src/api/types.ts (type definitions)
    - packages/web/src/api/client.ts (api helper)
    - packages/web/src/router/index.tsx (stub to replace)
    - packages/web/src/components/shared/StatusBadge.tsx
    - packages/web/src/hooks/useAuth.ts
  </read_first>
  <action>
    Create packages/web/src/pages/circles/CircleDetailPage.tsx.

    The page uses React Router useParams to get the circle id and useSearchParams for tab state.
    Tab state: const tab = searchParams.get('tab') ?? 'overview'
    Valid tabs: 'overview' | 'contributions' | 'proposals' | 'projects'

    Data fetching (all TanStack Query):
    - queryKey: ['circle', id]  → GET /circles/:id
    - queryKey: ['members', id] → GET /circles/:id/members  (to determine current user's role)
    - queryKey: ['treasury', id] → GET /circles/:id/treasury  (overview tab only — fetched lazily when tab='overview')
    - queryKey: ['contributions', id] → GET /circles/:id/contributions  (contributions tab only)
    - queryKey: ['proposals', id] → GET /circles/:id/proposals  (proposals tab only)
    - queryKey: ['projects', id] → GET /circles/:id/projects  (projects tab only)

    Role gating pattern:
    ```typescript
    const { user } = useAuth()
    const myMembership = members?.find(m => m.userId === user?.id)
    const isCircleAdmin = myMembership?.role === 'creator' || myMembership?.role === 'admin'
    ```

    Tab navigation uses setSearchParams({ tab: t }) — each tab button calls this.
    Apply Tailwind: active tab has border-b-2 border-primary font-semibold.

    Overview tab content:
    - Show circle name, description (if any), status badge
    - GovernanceConfig section: quorumPercent, approvalPercent, proposalDurationDays, whoCanPropose, requireProof
    - Treasury card: display treasury.balanceLabel (not treasury.balance raw number)
    - Members list: each member as a row with displayName, role badge. Use the same members query data (no second fetch needed).
    - Join/Leave button: if user is not a member show "Join Circle" button (POST /circles/:id/join); if member (non-creator) show "Leave Circle" button (POST /circles/:id/leave). Creator cannot leave.

    Contributions tab content:
    - Only rendered when isCircleAdmin is true (non-admins see "You need admin access to view contributions." message)
    - List contributions: each row shows user.displayName, amount, currency, status (StatusBadge), submittedAt date
    - If status === 'pending' AND isCircleAdmin: show inline Verify button and Reject button
    - Verify mutation: api.patch(`/circles/${id}/contributions/${cid}/verify`) — no body
      - onSuccess: invalidate ['contributions', id] and ['treasury', id]
      - onError: toast error
    - Reject mutation: api.patch(`/circles/${id}/contributions/${cid}/reject`, { reason }) — body required
      - Rejection requires a reason — show a small inline form with a text input that appears when admin clicks "Reject"
      - The inline form has a text input for reason (required, min 1 char) and a "Confirm Reject" button
      - onSuccess: invalidate ['contributions', id]
      - onError: toast error
    - If status === 'rejected': show rejectionReason text in muted style

    Proposals tab content:
    - List all proposals: each row shows title, requestedAmount, currency, status (StatusBadge), votingDeadline date
    - If proposal.status === 'open': show a "Vote" link to /circles/:id/proposals/:pid
    - If proposal.status === 'open' AND isCircleAdmin: show a "Close" button
    - Close proposal mutation: api.post(`/circles/${id}/proposals/${pid}/close`)
      - onSuccess: invalidate ['proposals', id]
      - onError: toast error
    - "Create Proposal" button (links to /circles/:id/proposals/new) — only show when isCircleAdmin

    Projects tab content:
    - List all projects: each row shows title, budget, currency, StatusBadge for status, createdAt
    - Each project row links to /circles/:id/projects/:projId
    - "Create Project" button only visible to admins — it links to a note: project creation requires a closed_passed proposal. For MVP show button that navigates to a stub or handle in ProjectDetail (out of scope for this plan).
    - Do NOT implement project creation form in this plan — that is handled by ProjectDetail page.

    Full component structure:
    ```tsx
    import { useParams, useSearchParams, Link } from 'react-router-dom'
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
    import { useState } from 'react'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Circle, CircleMembership, Contribution, Proposal, Project, Treasury } from '../../api/types'
    import { useAuth } from '../../hooks/useAuth'
    import { StatusBadge } from '../../components/shared/StatusBadge'
    import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
    import { Button } from '../../components/ui/button'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
    import { Badge } from '../../components/ui/badge'
    import { Input } from '../../components/ui/input'

    export function CircleDetailPage() {
      const { id } = useParams<{ id: string }>()
      const [searchParams, setSearchParams] = useSearchParams()
      const tab = (searchParams.get('tab') ?? 'overview') as 'overview'|'contributions'|'proposals'|'projects'
      const { user } = useAuth()
      const qc = useQueryClient()

      // Always-loaded queries
      const { data: circle, isLoading: circleLoading } = useQuery<Circle & { governanceConfig: any }>({
        queryKey: ['circle', id],
        queryFn: () => api.get(`/circles/${id}`),
        enabled: !!id,
      })
      const { data: members } = useQuery<CircleMembership[]>({
        queryKey: ['members', id],
        queryFn: () => api.get(`/circles/${id}/members`),
        enabled: !!id,
      })
      const myMembership = members?.find(m => m.userId === user?.id)
      const isCircleAdmin = myMembership?.role === 'creator' || myMembership?.role === 'admin'

      // Tab-specific queries
      const { data: treasury } = useQuery<Treasury>({
        queryKey: ['treasury', id],
        queryFn: () => api.get(`/circles/${id}/treasury`),
        enabled: !!id && tab === 'overview',
      })
      const { data: contributions } = useQuery<Contribution[]>({
        queryKey: ['contributions', id],
        queryFn: () => api.get(`/circles/${id}/contributions`),
        enabled: !!id && tab === 'contributions' && isCircleAdmin,
      })
      const { data: proposals } = useQuery<Proposal[]>({
        queryKey: ['proposals', id],
        queryFn: () => api.get(`/circles/${id}/proposals`),
        enabled: !!id && tab === 'proposals',
      })
      const { data: projects } = useQuery<Project[]>({
        queryKey: ['projects', id],
        queryFn: () => api.get(`/circles/${id}/projects`),
        enabled: !!id && tab === 'projects',
      })

      // Mutations
      const verifyMutation = useMutation({
        mutationFn: (cid: string) => api.patch(`/circles/${id}/contributions/${cid}/verify`),
        onSuccess: () => {
          toast.success('Contribution verified')
          qc.invalidateQueries({ queryKey: ['contributions', id] })
          qc.invalidateQueries({ queryKey: ['treasury', id] })
        },
        onError: (err: any) => toast.error(err.error?.message ?? 'Failed to verify'),
      })

      const [rejectingId, setRejectingId] = useState<string | null>(null)
      const [rejectReason, setRejectReason] = useState('')
      const rejectMutation = useMutation({
        mutationFn: ({ cid, reason }: { cid: string; reason: string }) =>
          api.patch(`/circles/${id}/contributions/${cid}/reject`, { reason }),
        onSuccess: () => {
          toast.success('Contribution rejected')
          qc.invalidateQueries({ queryKey: ['contributions', id] })
          setRejectingId(null)
          setRejectReason('')
        },
        onError: (err: any) => toast.error(err.error?.message ?? 'Failed to reject'),
      })

      const closeMutation = useMutation({
        mutationFn: (pid: string) => api.post(`/circles/${id}/proposals/${pid}/close`),
        onSuccess: () => {
          toast.success('Proposal closed')
          qc.invalidateQueries({ queryKey: ['proposals', id] })
        },
        onError: (err: any) => toast.error(err.error?.message ?? 'Failed to close proposal'),
      })

      const joinMutation = useMutation({
        mutationFn: () => api.post(`/circles/${id}/join`),
        onSuccess: () => { toast.success('Joined circle'); qc.invalidateQueries({ queryKey: ['members', id] }) },
        onError: (err: any) => toast.error(err.error?.message ?? 'Failed to join'),
      })
      const leaveMutation = useMutation({
        mutationFn: () => api.post(`/circles/${id}/leave`),
        onSuccess: () => { toast.success('Left circle'); qc.invalidateQueries({ queryKey: ['members', id] }) },
        onError: (err: any) => toast.error(err.error?.message ?? 'Failed to leave'),
      })

      if (circleLoading) return <LoadingSpinner />
      if (!circle) return <div className="p-4 text-red-500">Circle not found</div>

      const TABS = ['overview', 'contributions', 'proposals', 'projects'] as const

      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{circle.name}</h1>
              {circle.description && <p className="text-muted-foreground mt-1">{circle.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={circle.status} />
              {!myMembership && (
                <Button size="sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
                  Join Circle
                </Button>
              )}
              {myMembership && myMembership.role !== 'creator' && (
                <Button size="sm" variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                  Leave
                </Button>
              )}
            </div>
          </div>

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

          {/* Tab content */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Treasury */}
              {treasury && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Treasury</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{Number(treasury.balance).toLocaleString()} {treasury.currency}</p>
                    <p className="text-xs text-muted-foreground mt-1">{treasury.balanceLabel}</p>
                  </CardContent>
                </Card>
              )}
              {/* Governance */}
              {circle.governanceConfig && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Governance</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>Voting model: <span className="font-medium">{circle.governanceConfig.votingModel}</span></div>
                    <div>Quorum: <span className="font-medium">{circle.governanceConfig.quorumPercent}%</span></div>
                    <div>Approval: <span className="font-medium">{circle.governanceConfig.approvalPercent}%</span></div>
                    <div>Proposal duration: <span className="font-medium">{circle.governanceConfig.proposalDurationDays} days</span></div>
                    <div>Who can propose: <span className="font-medium">{circle.governanceConfig.whoCanPropose}</span></div>
                    <div>Proof required: <span className="font-medium">{circle.governanceConfig.requireProof ? 'Yes' : 'No'}</span></div>
                  </CardContent>
                </Card>
              )}
              {/* Members */}
              <Card>
                <CardHeader><CardTitle className="text-base">Members ({members?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {members?.map(m => (
                      <li key={m.userId} className="flex items-center justify-between text-sm">
                        <span>{m.user?.displayName ?? m.user?.email ?? m.userId}</span>
                        <Badge variant="outline" className="capitalize">{m.role}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'contributions' && (
            <div className="space-y-3">
              {!isCircleAdmin ? (
                <p className="text-muted-foreground">You need admin access to view contributions.</p>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="font-semibold">Contributions</h2>
                    <Button size="sm" asChild>
                      <Link to={`/circles/${id}/contributions/new`}>New Contribution</Link>
                    </Button>
                  </div>
                  {!contributions?.length && <p className="text-muted-foreground text-sm">No contributions yet.</p>}
                  {contributions?.map(c => (
                    <Card key={c.id}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{c.user?.displayName ?? c.userId}</p>
                            <p className="text-sm">{Number(c.amount).toLocaleString()} {c.currency}</p>
                            {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                            <p className="text-xs text-muted-foreground">{new Date(c.submittedAt).toLocaleDateString()}</p>
                          </div>
                          <StatusBadge status={c.status} />
                        </div>
                        {c.status === 'rejected' && c.rejectionReason && (
                          <p className="text-xs text-red-600">Rejected: {c.rejectionReason}</p>
                        )}
                        {c.status === 'pending' && isCircleAdmin && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => verifyMutation.mutate(c.id)} disabled={verifyMutation.isPending}>
                                Verify
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRejectingId(c.id); setRejectReason('') }}>
                                Reject
                              </Button>
                            </div>
                            {rejectingId === c.id && (
                              <div className="flex gap-2">
                                <Input
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  placeholder="Rejection reason (required)"
                                  className="text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                                  onClick={() => rejectMutation.mutate({ cid: c.id, reason: rejectReason })}
                                >
                                  Confirm Reject
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'proposals' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Proposals</h2>
                {isCircleAdmin && (
                  <Button size="sm" asChild>
                    <Link to={`/circles/${id}/proposals/new`}>New Proposal</Link>
                  </Button>
                )}
              </div>
              {!proposals?.length && <p className="text-muted-foreground text-sm">No proposals yet.</p>}
              {proposals?.map(p => (
                <Card key={p.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{Number(p.requestedAmount).toLocaleString()} {p.currency}</p>
                        <p className="text-xs text-muted-foreground">Deadline: {new Date(p.votingDeadline).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      {p.status === 'open' && (
                        <Button size="sm" asChild>
                          <Link to={`/circles/${id}/proposals/${p.id}`}>Vote</Link>
                        </Button>
                      )}
                      {p.status === 'open' && isCircleAdmin && (
                        <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(p.id)} disabled={closeMutation.isPending}>
                          Close
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Projects</h2>
              {!projects?.length && <p className="text-muted-foreground text-sm">No projects yet.</p>}
              {projects?.map(p => (
                <Link key={p.id} to={`/circles/${id}/projects/${p.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{p.title}</p>
                          <p className="text-sm text-muted-foreground">{Number(p.budget).toLocaleString()} {p.currency}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }
    ```

    Update packages/web/src/router/index.tsx: replace stub('CircleDetail') with `<CircleDetailPage />`.
    Add import: `import { CircleDetailPage } from '../pages/circles/CircleDetailPage'`
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `searchParams.get('tab') ?? 'overview'`
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `queryKey: ['members', id]` (to get role)
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `myMembership?.role === 'creator' || myMembership?.role === 'admin'`
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `api.patch` for verify (not api.post)
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `api.patch` for reject with `{ reason }`
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `balanceLabel`
    - packages/web/src/pages/circles/CircleDetailPage.tsx contains `queryKey: ['treasury', id]`
    - packages/web/src/router/index.tsx imports CircleDetailPage (no stub)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <done>CircleDetailPage renders 4 URL-controlled tabs; admin role gating works; verify calls PATCH not POST; balanceLabel displayed</done>
</task>

<task id="04-02" name="Write CircleDetailPage tests for tabs, role gating, and verify/reject mutations">
  <read_first>
    - packages/web/src/pages/circles/CircleDetailPage.tsx (just created)
    - packages/web/src/test/test-utils.tsx (renderWithProviders)
    - packages/web/src/test/handlers.ts (MSW handlers to extend)
  </read_first>
  <action>
    Create packages/web/src/pages/circles/CircleDetailPage.test.tsx.

    Use renderWithProviders from test-utils.tsx and MSW for API mocking.

    Test cases required:

    1. "renders overview tab by default" — renders without ?tab param, shows circle name and balanceLabel text
    2. "switching to contributions tab updates URL param" — click contributions tab, URL contains tab=contributions
    3. "non-admin does not see verify/reject buttons" — mock members so user has role='member', render contributions tab, expect no 'Verify' or 'Reject' buttons
    4. "admin sees Verify and Reject buttons for pending contributions" — mock members with role='creator', mock contributions with one pending item, render contributions tab, expect Verify and Reject buttons to be present
    5. "verify contribution calls PATCH not POST" — capture the request method; after clicking Verify, assert the intercepted MSW request was PATCH /circles/:id/contributions/:cid/verify
    6. "reject contribution sends reason in body" — click Reject, fill in reason input, click Confirm Reject, assert MSW received PATCH /circles/:id/contributions/:cid/reject with { reason: 'test reason' }
    7. "proposals tab shows Vote link for open proposals" — render with proposal status='open', see Vote link
    8. "admin sees Close button for open proposals" — render with admin role and proposal status='open', see Close button

    Test data fixtures:
    ```typescript
    const CIRCLE_ID = 'circle-1'
    const USER_ID = 'user-1'

    const mockCircle = {
      id: CIRCLE_ID, name: 'Test Circle', status: 'open',
      goalAmount: 10000, currency: 'USD', createdBy: USER_ID,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      governanceConfig: { quorumPercent: 51, approvalPercent: 51, proposalDurationDays: 7, votingModel: 'one_member_one_vote', whoCanPropose: 'contributor', requireProof: true }
    }
    const mockTreasury = { circleId: CIRCLE_ID, balance: 5000, currency: 'USD', balanceLabel: 'Treasury balance (simulated)' }
    const mockMembersAdmin = [{ circleId: CIRCLE_ID, userId: USER_ID, role: 'creator', joinedAt: new Date().toISOString(), user: { id: USER_ID, email: 'test@test.com', displayName: 'Test User', isGlobalAdmin: false } }]
    const mockMembersMember = [{ circleId: CIRCLE_ID, userId: USER_ID, role: 'member', joinedAt: new Date().toISOString(), user: { id: USER_ID, email: 'test@test.com', displayName: 'Test User', isGlobalAdmin: false } }]
    const mockContributions = [{ id: 'c-1', circleId: CIRCLE_ID, userId: USER_ID, amount: 100, currency: 'USD', status: 'pending', submittedAt: new Date().toISOString(), user: { id: USER_ID, email: 'test@test.com', displayName: 'Test User' }, proofDocuments: [] }]
    const mockProposals = [{ id: 'p-1', circleId: CIRCLE_ID, createdBy: USER_ID, title: 'Test Proposal', description: 'desc', requestedAmount: 500, currency: 'USD', status: 'open', votingDeadline: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString() }]
    ```

    MSW handler setup per test: use server.use(http.get(...), ...) to override handlers for each test.

    Auth context: mock user with id === USER_ID so that members.find(m => m.userId === user.id) resolves correctly.
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/circles/CircleDetailPage.test.tsx exists
    - File contains at least 6 test cases (describe/it blocks)
    - Test file contains `'PATCH'` string (verifying PATCH method assertion)
    - Test file contains `balanceLabel` string (verifying balanceLabel display test)
    - `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/circles/CircleDetailPage.test.tsx` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/circles/CircleDetailPage.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <done>CircleDetailPage tests pass: tab routing, role gating, PATCH verify, reject with reason, balanceLabel display all verified</done>
</task>

</tasks>

## Verification Criteria

- `grep 'searchParams.get' packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `grep 'queryKey.*members' packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `grep "api\.patch.*verify" packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `grep "api\.patch.*reject" packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `grep 'balanceLabel' packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `grep 'myMembership.*role.*creator' packages/web/src/pages/circles/CircleDetailPage.tsx` returns match
- `npm run build --workspace=packages/web` exits 0
- `cd packages/web && npx vitest --run src/pages/circles/CircleDetailPage.test.tsx` exits with 0 failures

## must_haves

- Tab switching updates the URL `?tab=` query parameter and each tab fetches only its own data
- Treasury section shows `balanceLabel` text (e.g. "Treasury balance (simulated)") — not just the raw number
- Verify button triggers PATCH `/circles/:id/contributions/:cid/verify` with no body — not POST
- Reject button shows an inline input for reason; submits PATCH `/circles/:id/contributions/:cid/reject` with `{ reason: string }`
- Contributions tab is hidden (with explanatory message) for non-admin users
- Admin role is derived from `GET /circles/:id/members` response — `members.find(m => m.userId === user.id)?.role`
- Open proposals show a Vote link to `/circles/:id/proposals/:pid`
- Circle admins see a Close button on open proposals

<output>
After completion, create `.planning/phases/08-frontend/08-04-SUMMARY.md`
</output>
