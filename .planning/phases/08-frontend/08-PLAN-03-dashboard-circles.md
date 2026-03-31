---
phase: 08-frontend
plan: 03
type: execute
wave: 3
depends_on: [08-02]
files_modified:
  - packages/web/src/pages/DashboardPage.tsx
  - packages/web/src/pages/circles/CirclesListPage.tsx
  - packages/web/src/pages/circles/NewCirclePage.tsx
  - packages/web/src/router/index.tsx
  - packages/web/src/pages/DashboardPage.test.tsx
  - packages/web/src/pages/circles/CirclesListPage.test.tsx
  - packages/web/src/pages/circles/NewCirclePage.test.tsx
autonomous: true
requirements: [FE-02, FE-03]

must_haves:
  truths:
    - "Dashboard renders user's circles, pending contribution count, unvoted proposal count, and recent activity feed"
    - "Circle list shows all circles from GET /api/v1/circles"
    - "Create Circle form posts name + goalAmount (REQUIRED number) to POST /api/v1/circles"
    - "Successful circle creation redirects to /circles/:id"
    - "Circle list page has a 'Create Circle' button linking to /circles/new"
  artifacts:
    - path: "packages/web/src/pages/DashboardPage.tsx"
      provides: "Dashboard screen using GET /dashboard"
    - path: "packages/web/src/pages/circles/CirclesListPage.tsx"
      provides: "Circle list screen using GET /circles"
    - path: "packages/web/src/pages/circles/NewCirclePage.tsx"
      provides: "Create circle form using POST /circles"
  key_links:
    - from: "packages/web/src/pages/circles/NewCirclePage.tsx"
      to: "POST /api/v1/circles"
      via: "api.post('/circles', { name, goalAmount })"
      pattern: "goalAmount"
    - from: "packages/web/src/pages/DashboardPage.tsx"
      to: "GET /api/v1/dashboard"
      via: "useQuery(['dashboard'])"
      pattern: "queryKey.*dashboard"
---

<objective>
Implement Dashboard, Circle List, and New Circle pages — the first data-driven screens after authentication.

Purpose: These are the primary landing screens after login. Dashboard surfaces pending action counts; Circle list is the hub for all circle activity.
Output: Three working screens with TanStack Query data fetching and tests.
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
<!-- API contracts for these screens -->

GET /api/v1/dashboard (from packages/api/src/routes/reporting.ts):
  Response: {
    circles: Array<Circle>,
    pendingContributions: number,
    unvotedProposals: number,
    recentActivity: Array<{ id, type, description, createdAt }>
  }

GET /api/v1/circles (from packages/api/src/routes/circles.ts):
  Response: Array<{
    id, name, description, goalAmount, currency, status,
    createdBy, createdAt, updatedAt
  }>
  Note: does NOT include membership role — that requires GET /circles/:id

POST /api/v1/circles (from packages/api/src/routes/circles.ts):
  Request:  { name: string, goalAmount: number, description?: string, governance?: {...} }
  REQUIRED: name (min 1, max 120), goalAmount (number > 0)
  Response: 201 { id, name, goalAmount, currency, status, createdAt, ... }

Zod schemas:
  NewCircle: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    goalAmount: z.number({ required_error: 'Goal amount is required' }).positive('Must be > 0'),
    description: z.string().max(2000).optional(),
  })

Wave 1 imports to use:
  - import { api } from '../../api/client'
  - import type { Circle, DashboardData } from '../../api/types'
  - import { StatusBadge } from '../../components/shared/StatusBadge'

TanStack Query keys:
  - ['circles'] — circle list
  - ['dashboard'] — dashboard data
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement DashboardPage and CirclesListPage</name>
  <files>
    packages/web/src/pages/DashboardPage.tsx
    packages/web/src/pages/circles/CirclesListPage.tsx
    packages/web/src/router/index.tsx
  </files>
  <read_first>
    packages/web/src/api/types.ts
    packages/web/src/api/client.ts
    packages/web/src/router/index.tsx
    packages/web/src/components/shared/StatusBadge.tsx
  </read_first>
  <behavior>
    DashboardPage:
    - Fetches GET /api/v1/dashboard with queryKey: ['dashboard']
    - Shows a summary row with pendingContributions count and unvotedProposals count as action items
    - Shows list of user's circles as cards linking to /circles/:id
    - Shows last 20 activity items in a feed list
    - Loading state: show LoadingSpinner
    - Error state: show error.error.message in an alert

    CirclesListPage:
    - Fetches GET /api/v1/circles with queryKey: ['circles']
    - Renders circles as cards (name, status badge, goalAmount)
    - Each card links to /circles/:id
    - "Create Circle" button links to /circles/new
    - Empty state: "No circles yet. Create one to get started."
  </behavior>
  <action>
    Create packages/web/src/pages/DashboardPage.tsx:
    ```tsx
    import { useQuery } from '@tanstack/react-query'
    import { api } from '../api/client'
    import type { DashboardData } from '../api/types'
    import { Link } from 'react-router-dom'
    import { LoadingSpinner } from '../components/shared/LoadingSpinner'
    import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
    import { Badge } from '../components/ui/badge'
    import { formatDistanceToNow } from 'date-fns' // use built-in Date or date-fns if needed; fallback to Intl.DateTimeFormat

    export function DashboardPage() {
      const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['dashboard'],
        queryFn: () => api.get('/dashboard'),
      })
      if (isLoading) return <LoadingSpinner />
      if (error) return <div className="text-red-500 p-4">{(error as any).error?.message ?? 'Failed to load dashboard'}</div>
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {/* Action counts */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(data?.pendingContributions ?? 0) > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-amber-600">{data?.pendingContributions}</p>
                  <p className="text-sm text-muted-foreground">Pending contributions</p>
                </CardContent>
              </Card>
            )}
            {(data?.unvotedProposals ?? 0) > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-blue-600">{data?.unvotedProposals}</p>
                  <p className="text-sm text-muted-foreground">Proposals awaiting vote</p>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Circles */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Circles</h2>
            <div className="grid gap-3">
              {data?.circles.map(circle => (
                <Link key={circle.id} to={`/circles/${circle.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{circle.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Goal: {circle.currency} {Number(circle.goalAmount).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          {/* Activity feed */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
            <div className="space-y-2">
              {data?.recentActivity.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                  <Badge variant="outline">{item.type}</Badge>
                  <div>
                    <p className="text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {(!data?.recentActivity?.length) && (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      )
    }
    ```

    Create packages/web/src/pages/circles/CirclesListPage.tsx:
    ```tsx
    import { useQuery } from '@tanstack/react-query'
    import { api } from '../../api/client'
    import type { Circle } from '../../api/types'
    import { Link } from 'react-router-dom'
    import { Button } from '../../components/ui/button'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
    import { StatusBadge } from '../../components/shared/StatusBadge'
    import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
    import { Plus } from 'lucide-react'

    export function CirclesListPage() {
      const { data: circles, isLoading } = useQuery<Circle[]>({
        queryKey: ['circles'],
        queryFn: () => api.get('/circles'),
      })
      if (isLoading) return <LoadingSpinner />
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Circles</h1>
            <Button asChild>
              <Link to="/circles/new"><Plus className="h-4 w-4 mr-2" />Create Circle</Link>
            </Button>
          </div>
          {(!circles || circles.length === 0) ? (
            <p className="text-muted-foreground">No circles yet. Create one to get started.</p>
          ) : (
            <div className="grid gap-3">
              {circles.map(c => (
                <Link key={c.id} to={`/circles/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <StatusBadge status={c.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Goal: {c.currency} {Number(c.goalAmount).toLocaleString()}</p>
                      {c.description && <p className="text-sm mt-1 truncate">{c.description}</p>}
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

    Update router/index.tsx: replace stub('Dashboard') with <DashboardPage />, stub('CirclesList') with <CirclesListPage />.
    Add imports: import { DashboardPage } from '../pages/DashboardPage'; import { CirclesListPage } from '../pages/circles/CirclesListPage'
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/pages/DashboardPage.tsx contains `queryKey: ['dashboard']`
    - packages/web/src/pages/DashboardPage.tsx renders pendingContributions and recentActivity
    - packages/web/src/pages/circles/CirclesListPage.tsx contains `queryKey: ['circles']`
    - packages/web/src/pages/circles/CirclesListPage.tsx contains link to `/circles/new`
    - packages/web/src/router/index.tsx imports DashboardPage and CirclesListPage (no stubs)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <done>Dashboard and CirclesList pages implemented; data loads from correct API endpoints</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement NewCirclePage with goalAmount validation + tests for all three screens</name>
  <files>
    packages/web/src/pages/circles/NewCirclePage.tsx
    packages/web/src/router/index.tsx
    packages/web/src/pages/DashboardPage.test.tsx
    packages/web/src/pages/circles/CirclesListPage.test.tsx
    packages/web/src/pages/circles/NewCirclePage.test.tsx
  </files>
  <read_first>
    packages/web/src/pages/circles/CirclesListPage.tsx
    packages/web/src/test/handlers.ts
    packages/web/src/test/test-utils.tsx
  </read_first>
  <behavior>
    NewCirclePage:
    - Form with name (text), goalAmount (number input), description (textarea, optional)
    - Zod: goalAmount uses z.coerce.number().positive() to handle HTML input string→number coercion
    - On submit: api.post('/circles', { name, goalAmount, description })
    - On success: invalidate ['circles'], navigate to /circles/:newId
    - On error: toast error.error.message

    Tests:
    - DashboardPage.test.tsx: renders circles, shows pendingContributions count from MSW mock
    - CirclesListPage.test.tsx: renders circle names from MSW, shows Create Circle button
    - NewCirclePage.test.tsx: renders name and goalAmount fields; submitting posts to /api/v1/circles
  </behavior>
  <action>
    Create packages/web/src/pages/circles/NewCirclePage.tsx:
    ```tsx
    import { useForm } from 'react-hook-form'
    import { zodResolver } from '@hookform/resolvers/zod'
    import { z } from 'zod'
    import { useMutation, useQueryClient } from '@tanstack/react-query'
    import { useNavigate } from 'react-router-dom'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Circle, ApiError } from '../../api/types'
    import { Button } from '../../components/ui/button'
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
    import { Input } from '../../components/ui/input'
    import { Textarea } from '../../components/ui/textarea'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

    const schema = z.object({
      name: z.string().min(1, 'Name is required').max(120),
      goalAmount: z.coerce.number({ required_error: 'Goal amount is required' })
        .positive('Goal amount must be greater than 0'),
      description: z.string().max(2000).optional(),
    })

    type FormData = z.infer<typeof schema>

    export function NewCirclePage() {
      const navigate = useNavigate()
      const qc = useQueryClient()
      const form = useForm<FormData>({ resolver: zodResolver(schema) })

      const mutation = useMutation<Circle, ApiError, FormData>({
        mutationFn: (data) => api.post('/circles', data),
        onSuccess: (circle) => {
          toast.success('Circle created')
          qc.invalidateQueries({ queryKey: ['circles'] })
          navigate(`/circles/${circle.id}`)
        },
        onError: (err) => toast.error(err.error?.message ?? 'Failed to create circle'),
      })

      return (
        <div className="max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Create a Circle</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Circle Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Nairobi Diaspora Fund" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="goalAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Amount (USD)</FormLabel>
                      <FormControl><Input type="number" min="1" step="any" placeholder="e.g. 10000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl><Textarea placeholder="What is this circle for?" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Creating...' : 'Create Circle'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )
    }
    ```

    Update router/index.tsx: replace stub('NewCircle') with <NewCirclePage />.

    Create packages/web/src/pages/DashboardPage.test.tsx:
    Test that dashboard renders circle names and pending counts from MSW mock data.
    Use renderWithProviders from test-utils.tsx.

    Create packages/web/src/pages/circles/CirclesListPage.test.tsx:
    Test that circle names from MSW mock render in the list.
    Test that 'Create Circle' button or link is present.

    Create packages/web/src/pages/circles/NewCirclePage.test.tsx:
    Test that name and goalAmount fields are present.
    Test that goalAmount is required — submitting without it shows validation error.
    Test that form posts correct data to POST /api/v1/circles.
  </action>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/DashboardPage.test.tsx src/pages/circles 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - packages/web/src/pages/circles/NewCirclePage.tsx contains `z.coerce.number` for goalAmount
    - packages/web/src/pages/circles/NewCirclePage.tsx contains `api.post('/circles', data)` in mutationFn
    - packages/web/src/pages/circles/NewCirclePage.tsx navigates to `/circles/${circle.id}` on success
    - packages/web/src/pages/circles/NewCirclePage.test.tsx exists with at least 2 test cases
    - `npx vitest --run src/pages/DashboardPage.test.tsx src/pages/circles` passes with 0 failures
  </acceptance_criteria>
  <done>NewCirclePage posts name + goalAmount; all 3 screens have tests that pass</done>
</task>

</tasks>

<verification>
- `npm run build --workspace=packages/web` exits 0
- grep 'goalAmount' packages/web/src/pages/circles/NewCirclePage.tsx returns match
- grep 'z.coerce.number' packages/web/src/pages/circles/NewCirclePage.tsx returns match
- `cd packages/web && npx vitest --run src/pages` exits with 0 failures for dashboard+circles tests
</verification>

<success_criteria>
- Dashboard loads and renders circles, pending counts, and activity feed
- Circle list shows all circles with status badges
- Create Circle form uses z.coerce.number for goalAmount (handles HTML string input)
- All dashboard and circle tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/08-frontend/08-03-SUMMARY.md`
</output>
