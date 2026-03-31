---
phase: 08-frontend
plan: 06
type: execute
wave: 6
depends_on: [08-05]
files_modified:
  - packages/web/src/pages/projects/ProjectDetailPage.tsx
  - packages/web/src/pages/projects/ProjectDetailPage.test.tsx
  - packages/web/src/router/index.tsx
autonomous: true
requirements: [FE-08]

must_haves:
  truths:
    - "Project detail shows a visual status stepper: approved → executing → complete"
    - "Admin sees a Transition button for the valid next state only (approved→executing, executing→complete)"
    - "When transitioning approved→executing and treasury is insufficient, a 422 INSUFFICIENT_TREASURY error is shown inline below the Transition button"
    - "Progress updates are displayed as a chronological timeline (oldest first)"
    - "Admin sees a Post Update form with content (required) and percentComplete (0-100, optional) fields"
    - "Post Update calls POST /circles/:id/projects/:projId/updates with { content, percentComplete? } — field is 'content' not 'update'"
  artifacts:
    - path: "packages/web/src/pages/projects/ProjectDetailPage.tsx"
      provides: "Project detail with stepper, admin transition, and updates timeline"
      exports: ["ProjectDetailPage"]
    - path: "packages/web/src/pages/projects/ProjectDetailPage.test.tsx"
      provides: "Tests for stepper, inline error, update form"
  key_links:
    - from: "packages/web/src/pages/projects/ProjectDetailPage.tsx"
      to: "PATCH /api/v1/circles/:id/projects/:projId"
      via: "api.patch with { status: 'executing'|'complete' }"
      pattern: "api\\.patch.*projects.*status"
    - from: "packages/web/src/pages/projects/ProjectDetailPage.tsx"
      to: "POST /api/v1/circles/:id/projects/:projId/updates"
      via: "api.post with { content, percentComplete? }"
      pattern: "content.*percentComplete"
    - from: "packages/web/src/pages/projects/ProjectDetailPage.tsx"
      to: "INSUFFICIENT_TREASURY 422 inline error"
      via: "onError checks err.error.code === 'INSUFFICIENT_TREASURY'"
      pattern: "INSUFFICIENT_TREASURY"
---

<objective>
Implement the ProjectDetailPage with status stepper, admin-only Transition button with inline 422 error handling, a chronological progress updates timeline, and an admin Post Update form.

Purpose: Project lifecycle management — admins advance projects from approved to executing (with treasury check) to complete, and post progress updates.
Output: ProjectDetailPage.tsx with complete lifecycle UI and a passing test suite.
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
<!-- API contracts extracted from projects.ts and project.service.ts -->

GET /api/v1/circles/:id/projects/:projId:
  Returns: {
    id, circleId, proposalId, createdBy,
    title, description, budget, currency,
    status: 'approved' | 'executing' | 'complete' | 'cancelled',
    createdAt, completedAt?,
    updates: ProjectUpdate[]  -- ordered desc by createdAt from getProject()
  }
  Note: updates are returned with project (include: { updates: { orderBy: { createdAt: 'desc' } } })
  For timeline display, reverse to show oldest first.

GET /api/v1/circles/:id/projects/:projId/updates:
  Returns: ProjectUpdate[] ordered desc by createdAt

PATCH /api/v1/circles/:id/projects/:projId:
  Request: { status: 'approved' | 'executing' | 'complete' | 'cancelled' }
  Valid transitions: approved → executing, executing → complete
  422 error with code INSUFFICIENT_TREASURY when approved→executing and treasury balance < project.budget
  On success: returns updated project

POST /api/v1/circles/:id/projects/:projId/updates:
  Request: { content: string, percentComplete?: number }
  CRITICAL: field is 'content' NOT 'update' or 'text'
  content: required, min 1, max 5000
  percentComplete: optional integer 0-100
  Returns 201: ProjectUpdate object
  NOTE: Only allowed when project.status === 'executing'. Service throws 409 PROJECT_NOT_EXECUTING otherwise.

ProjectUpdate type (from service):
  { id, projectId, postedBy, content, percentComplete, createdAt }

Role gating: use GET /circles/:id/members to determine isCircleAdmin (role 'creator'|'admin')
  Same pattern as CircleDetailPage — queryKey: ['members', id]

Status stepper:
  Steps: ['approved', 'executing', 'complete']
  Current step highlighted; past steps shown as completed (checkmark); future steps dimmed.
  Cancelled status: show badge separately, no stepper.

Next state logic:
  approved → executing (transition button text: "Start Execution")
  executing → complete (transition button text: "Mark Complete")
  complete or cancelled: no transition button

Inline error on 422:
  Show message below the Transition button: "Insufficient treasury — balance too low to fund this project."
  Do not use toast for this error — it must be inline.
  Clear the inline error when the mutation is pending again.

Zod schema for Post Update form:
  z.object({
    content: z.string().min(1, 'Update content is required').max(5000),
    percentComplete: z.coerce.number().int().min(0).max(100).optional(),
  })
</interfaces>

<tasks>

<task id="06-01" name="Implement ProjectDetailPage with stepper, Transition button, and updates timeline">
  <read_first>
    - packages/web/src/api/types.ts
    - packages/web/src/api/client.ts
    - packages/web/src/hooks/useAuth.ts
    - packages/web/src/router/index.tsx
    - packages/web/src/components/shared/StatusBadge.tsx
  </read_first>
  <action>
    Create packages/web/src/pages/projects/ProjectDetailPage.tsx.

    Full component:
    ```tsx
    import { useParams } from 'react-router-dom'
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
    import { useState } from 'react'
    import { useForm } from 'react-hook-form'
    import { zodResolver } from '@hookform/resolvers/zod'
    import { z } from 'zod'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Project, ProjectUpdate, CircleMembership } from '../../api/types'
    import { useAuth } from '../../hooks/useAuth'
    import { StatusBadge } from '../../components/shared/StatusBadge'
    import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
    import { Button } from '../../components/ui/button'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
    import { Input } from '../../components/ui/input'
    import { Textarea } from '../../components/ui/textarea'
    import { CheckCircle2, Circle } from 'lucide-react'

    const STEPPER_STEPS = ['approved', 'executing', 'complete'] as const
    type ProjectStatus = 'approved' | 'executing' | 'complete' | 'cancelled'

    function nextStatus(current: ProjectStatus): 'executing' | 'complete' | null {
      if (current === 'approved') return 'executing'
      if (current === 'executing') return 'complete'
      return null
    }

    function transitionLabel(next: 'executing' | 'complete'): string {
      return next === 'executing' ? 'Start Execution' : 'Mark Complete'
    }

    const updateSchema = z.object({
      content: z.string().min(1, 'Update content is required').max(5000),
      percentComplete: z.coerce.number().int().min(0).max(100).optional(),
    })
    type UpdateFormData = z.infer<typeof updateSchema>

    export function ProjectDetailPage() {
      const { id: circleId, projId } = useParams<{ id: string; projId: string }>()
      const { user } = useAuth()
      const qc = useQueryClient()
      const [transitionError, setTransitionError] = useState<string | null>(null)

      const { data: project, isLoading } = useQuery<Project>({
        queryKey: ['project', circleId, projId],
        queryFn: () => api.get(`/circles/${circleId}/projects/${projId}`),
        enabled: !!circleId && !!projId,
      })
      const { data: members } = useQuery<CircleMembership[]>({
        queryKey: ['members', circleId],
        queryFn: () => api.get(`/circles/${circleId}/members`),
        enabled: !!circleId,
      })
      const myMembership = members?.find(m => m.userId === user?.id)
      const isCircleAdmin = myMembership?.role === 'creator' || myMembership?.role === 'admin'

      const transitionMutation = useMutation({
        mutationFn: (status: 'executing' | 'complete') =>
          api.patch(`/circles/${circleId}/projects/${projId}`, { status }),
        onMutate: () => setTransitionError(null),
        onSuccess: () => {
          toast.success('Project status updated')
          qc.invalidateQueries({ queryKey: ['project', circleId, projId] })
          qc.invalidateQueries({ queryKey: ['projects', circleId] })
        },
        onError: (err: any) => {
          if (err?.error?.code === 'INSUFFICIENT_TREASURY') {
            setTransitionError('Insufficient treasury — balance too low to fund this project.')
          } else {
            toast.error(err?.error?.message ?? 'Failed to update status')
          }
        },
      })

      const updateForm = useForm<UpdateFormData>({ resolver: zodResolver(updateSchema) })
      const updateMutation = useMutation({
        mutationFn: (data: UpdateFormData) =>
          api.post(`/circles/${circleId}/projects/${projId}/updates`, data),
        onSuccess: () => {
          toast.success('Update posted')
          updateForm.reset()
          qc.invalidateQueries({ queryKey: ['project', circleId, projId] })
        },
        onError: (err: any) => toast.error(err?.error?.message ?? 'Failed to post update'),
      })

      if (isLoading) return <LoadingSpinner />
      if (!project) return <div className="p-4 text-red-500">Project not found</div>

      const next = nextStatus(project.status as ProjectStatus)
      // Updates are returned desc from API — reverse for chronological (oldest first)
      const updates = [...(project.updates ?? [])].reverse()

      return (
        <div className="max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Budget: {Number(project.budget).toLocaleString()} {project.currency}
              </p>
            </div>
            <StatusBadge status={project.status} />
          </div>

          {project.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{project.description}</p></CardContent>
            </Card>
          )}

          {/* Status stepper */}
          {project.status !== 'cancelled' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Project Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {STEPPER_STEPS.map((step, idx) => {
                    const stepIdx = STEPPER_STEPS.indexOf(project.status as typeof STEPPER_STEPS[number])
                    const isPast = idx < stepIdx
                    const isCurrent = step === project.status
                    const isFuture = idx > stepIdx
                    return (
                      <div key={step} className="flex items-center gap-2">
                        {idx > 0 && (
                          <div className={`h-px w-8 ${isPast || isCurrent ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                        <div className={`flex items-center gap-1 text-sm ${isCurrent ? 'text-primary font-semibold' : isPast ? 'text-primary' : 'text-gray-400'}`}>
                          {isPast ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          <span className="capitalize">{step}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Transition button */}
                {isCircleAdmin && next && (
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={() => transitionMutation.mutate(next)}
                      disabled={transitionMutation.isPending}
                    >
                      {transitionMutation.isPending ? 'Updating...' : transitionLabel(next)}
                    </Button>
                    {transitionError && (
                      <p className="text-sm text-red-600" data-testid="transition-error">
                        {transitionError}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Post Update form — admin only, executing projects only */}
          {isCircleAdmin && project.status === 'executing' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Post Update</CardTitle></CardHeader>
              <CardContent>
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-3">
                    <FormField control={updateForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Update</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What progress has been made?" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={updateForm.control} name="percentComplete" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percent Complete (0-100, optional)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" placeholder="e.g. 50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Posting...' : 'Post Update'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Progress updates timeline */}
          <div className="space-y-2">
            <h2 className="font-semibold">Progress Updates</h2>
            {updates.length === 0 && (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )}
            {updates.map((u: ProjectUpdate) => (
              <Card key={u.id}>
                <CardContent className="pt-4 space-y-1">
                  <p className="text-sm">{u.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                    {u.percentComplete !== null && u.percentComplete !== undefined && (
                      <span>{u.percentComplete}% complete</span>
                    )}
                    <span>Posted by {u.postedBy}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }
    ```

    Update packages/web/src/router/index.tsx: replace stub('ProjectDetail') with `<ProjectDetailPage />`.
    Add import: `import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage'`
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/projects/ProjectDetailPage.tsx contains `STEPPER_STEPS`
    - packages/web/src/pages/projects/ProjectDetailPage.tsx contains `nextStatus` function
    - packages/web/src/pages/projects/ProjectDetailPage.tsx contains `INSUFFICIENT_TREASURY` string
    - packages/web/src/pages/projects/ProjectDetailPage.tsx contains `transitionError` state for inline error (not toast)
    - packages/web/src/pages/projects/ProjectDetailPage.tsx uses `content` field name in update form (not 'update' or 'text')
    - packages/web/src/pages/projects/ProjectDetailPage.tsx reverses updates array for chronological display
    - packages/web/src/pages/projects/ProjectDetailPage.tsx contains `queryKey: ['members', circleId]` for role check
    - packages/web/src/router/index.tsx imports ProjectDetailPage (no stub)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <done>ProjectDetailPage shows status stepper with Transition button; INSUFFICIENT_TREASURY shown inline; update timeline and Post Update form complete</done>
</task>

<task id="06-02" name="Write ProjectDetailPage tests">
  <read_first>
    - packages/web/src/pages/projects/ProjectDetailPage.tsx (just created)
    - packages/web/src/test/test-utils.tsx
    - packages/web/src/test/handlers.ts
  </read_first>
  <action>
    Create packages/web/src/pages/projects/ProjectDetailPage.test.tsx.

    Test fixtures:
    ```typescript
    const CIRCLE_ID = 'circle-1'
    const PROJ_ID = 'proj-1'
    const USER_ID = 'user-1'

    const mockMembersAdmin = [{
      circleId: CIRCLE_ID, userId: USER_ID, role: 'creator',
      joinedAt: new Date().toISOString(),
      user: { id: USER_ID, email: 'test@test.com', displayName: 'Admin User', isGlobalAdmin: false }
    }]
    const mockMembersMember = [{
      circleId: CIRCLE_ID, userId: USER_ID, role: 'member',
      joinedAt: new Date().toISOString(),
      user: { id: USER_ID, email: 'test@test.com', displayName: 'Member User', isGlobalAdmin: false }
    }]

    const makeProject = (status: string, updates: any[] = []) => ({
      id: PROJ_ID, circleId: CIRCLE_ID, proposalId: 'prop-1',
      createdBy: USER_ID, title: 'Test Project', description: 'A project',
      budget: 2000, currency: 'USD', status,
      createdAt: new Date().toISOString(), updates,
    })
    ```

    Test cases:

    1. "renders project title and status badge"
       Mock GET /circles/:id/projects/:projId → makeProject('approved')
       Mock GET /circles/:id/members → mockMembersAdmin
       Assert: project title visible, status badge visible

    2. "stepper shows approved step as current"
       Mock project status='approved'
       Assert: 'approved' text visible in stepper; 'executing' text visible but dimmed (class check or just presence)

    3. "admin sees Transition button for approved → executing"
       Mock project status='approved', members admin
       Assert: button with text 'Start Execution' is present

    4. "non-admin does not see Transition button"
       Mock project status='approved', members member (role='member')
       Assert: no 'Start Execution' button

    5. "INSUFFICIENT_TREASURY 422 shows inline error not toast"
       Mock PATCH /circles/:id/projects/:projId to return 422 with { error: { code: 'INSUFFICIENT_TREASURY', message: 'Insufficient treasury for project budget', status: 422 } }
       Click 'Start Execution' button
       Assert: element with data-testid="transition-error" is visible with the error text
       Assert: toast was NOT shown (sonner toast not triggered)

    6. "updates are displayed in chronological order"
       Mock project with updates: [{ createdAt: newer, content: 'Second' }, { createdAt: older, content: 'First' }]
       Assert: 'First' appears before 'Second' in the DOM

    7. "admin sees Post Update form when project is executing"
       Mock project status='executing', members admin
       Assert: textarea for content is present

    8. "non-admin does not see Post Update form"
       Mock project status='executing', members member
       Assert: no textarea for content

    9. "Post Update form uses 'content' field name"
       Fill in textarea, submit form
       Assert: MSW captured POST body has { content: 'test update' } — not 'update' or 'text' key
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/projects/ProjectDetailPage.test.tsx exists
    - File contains at least 7 test cases
    - File contains `INSUFFICIENT_TREASURY` string (testing inline error)
    - File contains `data-testid="transition-error"` assertion
    - File contains assertion on `content` field name in Post Update body
    - `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/projects/ProjectDetailPage.test.tsx` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/projects/ProjectDetailPage.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <done>ProjectDetailPage tests pass: stepper, role gating, inline INSUFFICIENT_TREASURY error, update timeline order, and content field name all verified</done>
</task>

</tasks>

## Verification Criteria

- `grep 'STEPPER_STEPS' packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match
- `grep 'INSUFFICIENT_TREASURY' packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match
- `grep 'transitionError' packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match
- `grep '"content"' packages/web/src/pages/proposals/ProposalDetailPage.tsx || grep "'content'" packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match for update form field
- `grep "\.reverse()" packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match (chronological order)
- `grep "queryKey.*members.*circleId" packages/web/src/pages/projects/ProjectDetailPage.tsx` returns match
- `npm run build --workspace=packages/web` exits 0
- `cd packages/web && npx vitest --run src/pages/projects/ProjectDetailPage.test.tsx` exits with 0 failures

## must_haves

- Status stepper visually distinguishes approved, executing, complete — current step highlighted, past steps marked
- Transition button only appears for admin users and only when there is a valid next state
- A 422 INSUFFICIENT_TREASURY response is displayed as inline text below the Transition button — NOT as a toast
- Post Update form field is named `content` (not 'update', 'text', or any other name)
- Updates timeline displays oldest first (array reversed from API's desc order)
- Post Update form is only visible when project.status === 'executing' AND user is admin

<output>
After completion, create `.planning/phases/08-frontend/08-06-SUMMARY.md`
</output>
