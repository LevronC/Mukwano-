---
phase: 08-frontend
plan: 05
type: execute
wave: 5
depends_on: [08-04]
files_modified:
  - packages/web/src/pages/contributions/NewContributionPage.tsx
  - packages/web/src/pages/contributions/NewContributionPage.test.tsx
  - packages/web/src/pages/proposals/NewProposalPage.tsx
  - packages/web/src/pages/proposals/NewProposalPage.test.tsx
  - packages/web/src/pages/proposals/ProposalDetailPage.tsx
  - packages/web/src/pages/proposals/ProposalDetailPage.test.tsx
  - packages/web/src/router/index.tsx
autonomous: true
requirements: [FE-05, FE-07]

must_haves:
  truths:
    - "Contribution form posts { amount, note? } to POST /circles/:id/contributions"
    - "Proof upload rejects files > 10MB or MIME not in {image/jpeg, image/png, application/pdf} before calling the API"
    - "Proof upload is a three-step flow: POST /proof → PUT presigned URL → POST /proof/confirm"
    - "Proposal form uses requestedAmount field — not 'amount'"
    - "Proposal form posts { title, description, requestedAmount } to POST /circles/:id/proposals"
    - "ProposalDetail vote widget shows radio buttons for yes/no/abstain"
    - "After a successful vote the widget disables — a 409 response (already voted) also disables it"
    - "Vote tally shows finalYes, finalNo, finalAbstain, quorumMet from the proposal response"
  artifacts:
    - path: "packages/web/src/pages/contributions/NewContributionPage.tsx"
      provides: "Contribution submit form with three-step proof upload"
      exports: ["NewContributionPage"]
    - path: "packages/web/src/pages/proposals/NewProposalPage.tsx"
      provides: "Proposal create form with requestedAmount field"
      exports: ["NewProposalPage"]
    - path: "packages/web/src/pages/proposals/ProposalDetailPage.tsx"
      provides: "Proposal detail + vote widget + vote tally"
      exports: ["ProposalDetailPage"]
  key_links:
    - from: "packages/web/src/pages/contributions/NewContributionPage.tsx"
      to: "POST /api/v1/circles/:id/contributions"
      via: "api.post(`/circles/${id}/contributions`, { amount, note })"
      pattern: "api\\.post.*contributions"
    - from: "packages/web/src/pages/contributions/NewContributionPage.tsx"
      to: "POST /api/v1/circles/:id/contributions/:cid/proof/confirm"
      via: "three-step uploadProof function — step 3"
      pattern: "proof/confirm"
    - from: "packages/web/src/pages/proposals/NewProposalPage.tsx"
      to: "POST /api/v1/circles/:id/proposals"
      via: "api.post(`/circles/${id}/proposals`, { title, description, requestedAmount })"
      pattern: "requestedAmount"
    - from: "packages/web/src/pages/proposals/ProposalDetailPage.tsx"
      to: "POST /api/v1/circles/:id/proposals/:pid/vote"
      via: "api.post vote with { vote: 'yes'|'no'|'abstain' }"
      pattern: "vote.*yes.*no.*abstain"
---

<objective>
Implement the three form screens: NewContributionPage (with three-step proof upload), NewProposalPage, and ProposalDetailPage with vote widget.

Purpose: These screens close the member-action loop — members can contribute with proof, propose funding requests, and vote.
Output: Three pages with React Hook Form + Zod validation, correct API field names, and passing tests.
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
<!-- API contracts extracted from route and service source -->

POST /api/v1/circles/:id/contributions:
  Request: { amount: number, note?: string }   -- amount uses 'amount' here (not requestedAmount)
  Required: amount (number > 0)
  Response 201: Contribution object

Three-step proof upload flow:
  Step 1 — POST /api/v1/circles/:id/contributions/:cid/proof
    Request: { fileName: string, mimeType: string, sizeBytes: number }  -- all required
    Response: { uploadUrl: string, fileKey: string, expiresInSeconds: number }

  Step 2 — PUT uploadUrl (raw fetch, NOT through api client)
    Headers: { 'Content-Type': file.type }
    Body: raw File object

  Step 3 — POST /api/v1/circles/:id/contributions/:cid/proof/confirm
    Request: { fileKey: string, fileName: string, mimeType: string, sizeBytes: number }  -- all required
    Response 201: ProofDocument object

  Client validation BEFORE step 1:
    Allowed MIME: ['image/jpeg', 'image/png', 'application/pdf']
    Max size: 10 * 1024 * 1024 bytes (10 MB)

POST /api/v1/circles/:id/proposals:
  Request: { title: string, description: string, requestedAmount: number }
  REQUIRED: all three. Field is 'requestedAmount' NOT 'amount'.
  Limits: title max 200, description max 5000, requestedAmount > 0
  Response 201: Proposal object

GET /api/v1/circles/:id/proposals/:pid:
  Response: { id, circleId, createdBy, title, description, requestedAmount, currency, status,
              votingDeadline, createdAt,
              votes?: { yes: number, no: number, abstain: number, total: number },
              myVote?: 'yes'|'no'|'abstain'|null }
  Note: votes and myVote fields come from the proposal service response (verify with
        proposal.service.ts if needed — structure assumed based on RESEARCH.md types)

POST /api/v1/circles/:id/proposals/:pid/vote:
  Request: { vote: 'yes' | 'no' | 'abstain' }
  Response 201: Vote object
  409 CONFLICT if user has already voted → disable widget, show "You have already voted"

Zod schemas to use:
  ContributionForm: z.object({
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    note: z.string().max(1000).optional(),
  })

  ProposalForm: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required').max(5000),
    requestedAmount: z.coerce.number().positive('Requested amount must be greater than 0'),
  })
</interfaces>

<tasks>

<task id="05-01" name="Implement NewContributionPage with three-step proof upload">
  <read_first>
    - packages/web/src/api/types.ts
    - packages/web/src/api/client.ts
    - packages/web/src/router/index.tsx
  </read_first>
  <action>
    Create packages/web/src/pages/contributions/NewContributionPage.tsx.

    The page:
    1. Submits a contribution via POST /circles/:id/contributions to create the contribution record.
    2. If a proof file is attached, runs the three-step upload AFTER the contribution is created.
    3. On complete success, shows a toast and navigates back to /circles/:id?tab=contributions.

    Proof upload helper function (defined inside the file):
    ```typescript
    async function uploadProof(circleId: string, cid: string, file: File): Promise<void> {
      const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf']
      if (!ALLOWED.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.')
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10 MB limit.')
      }

      // Step 1: get presigned URL
      const { uploadUrl, fileKey } = await api.post<{ uploadUrl: string; fileKey: string; expiresInSeconds: number }>(
        `/circles/${circleId}/contributions/${cid}/proof`,
        { fileName: file.name, mimeType: file.type, sizeBytes: file.size }
      )

      // Step 2: PUT directly to presigned URL — NOT through api client (bypasses auth headers)
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('File upload failed')

      // Step 3: confirm
      await api.post(`/circles/${circleId}/contributions/${cid}/proof/confirm`, {
        fileKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })
    }
    ```

    Form state:
    - React Hook Form with Zod resolver for amount + note fields
    - Separate useState for the selected File (proof): `const [proofFile, setProofFile] = useState<File | null>(null)`
    - Separate useState for upload progress feedback: `const [uploading, setUploading] = useState(false)`
    - Client-side MIME and size validation on file input change — show an inline error if invalid

    Full component:
    ```tsx
    import { useForm } from 'react-hook-form'
    import { zodResolver } from '@hookform/resolvers/zod'
    import { z } from 'zod'
    import { useState } from 'react'
    import { useMutation, useQueryClient } from '@tanstack/react-query'
    import { useNavigate, useParams } from 'react-router-dom'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Contribution, ApiError } from '../../api/types'
    import { Button } from '../../components/ui/button'
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
    import { Input } from '../../components/ui/input'
    import { Textarea } from '../../components/ui/textarea'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
    const MAX_BYTES = 10 * 1024 * 1024

    const schema = z.object({
      amount: z.coerce.number().positive('Amount must be greater than 0'),
      note: z.string().max(1000).optional(),
    })
    type FormData = z.infer<typeof schema>

    export function NewContributionPage() {
      const { id } = useParams<{ id: string }>()
      const navigate = useNavigate()
      const qc = useQueryClient()
      const form = useForm<FormData>({ resolver: zodResolver(schema) })
      const [proofFile, setProofFile] = useState<File | null>(null)
      const [fileError, setFileError] = useState<string | null>(null)
      const [uploading, setUploading] = useState(false)

      function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null
        setProofFile(file)
        if (!file) { setFileError(null); return }
        if (!ALLOWED_MIME.includes(file.type)) {
          setFileError('Invalid file type. Only JPEG, PNG, and PDF are allowed.')
          setProofFile(null)
        } else if (file.size > MAX_BYTES) {
          setFileError('File size exceeds 10 MB limit.')
          setProofFile(null)
        } else {
          setFileError(null)
        }
      }

      const mutation = useMutation<Contribution, ApiError, FormData>({
        mutationFn: async (data) => {
          const contribution = await api.post<Contribution>(`/circles/${id}/contributions`, data)
          if (proofFile) {
            setUploading(true)
            try {
              await uploadProof(id!, contribution.id, proofFile)
            } finally {
              setUploading(false)
            }
          }
          return contribution
        },
        onSuccess: () => {
          toast.success('Contribution submitted')
          qc.invalidateQueries({ queryKey: ['contributions', id] })
          navigate(`/circles/${id}?tab=contributions`)
        },
        onError: (err) => toast.error(err.error?.message ?? 'Failed to submit contribution'),
      })

      return (
        <div className="max-w-lg">
          <Card>
            <CardHeader><CardTitle>Submit Contribution</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (USD)</FormLabel>
                      <FormControl><Input type="number" min="0.01" step="any" placeholder="e.g. 500" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="note" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl><Textarea placeholder="Describe your contribution..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Proof Document (optional)</label>
                    <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                    {fileError && <p className="text-sm text-red-600">{fileError}</p>}
                    <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF. Max 10 MB.</p>
                    {uploading && <p className="text-xs text-blue-600">Uploading proof...</p>}
                  </div>
                  <Button type="submit" disabled={mutation.isPending || uploading || !!fileError}>
                    {mutation.isPending || uploading ? 'Submitting...' : 'Submit Contribution'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )
    }
    ```

    Update packages/web/src/router/index.tsx: replace stub('NewContribution') with `<NewContributionPage />`.
    Add import: `import { NewContributionPage } from '../pages/contributions/NewContributionPage'`
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `uploadProof` function
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `ALLOWED_MIME`
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `MAX_BYTES`
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `proof/confirm` string (step 3 call)
    - packages/web/src/pages/contributions/NewContributionPage.tsx uses `z.coerce.number` for amount
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `file.size > MAX_BYTES` check
    - packages/web/src/router/index.tsx imports NewContributionPage (no stub)
    - `npm run build --workspace=packages/web` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO && npm run build --workspace=packages/web 2>&1 | tail -5</automated>
  </verify>
  <done>NewContributionPage posts contribution then runs three-step proof upload; client validates MIME and size before API call</done>
</task>

<task id="05-02" name="Implement NewProposalPage, ProposalDetailPage with vote widget, and tests for all three screens">
  <read_first>
    - packages/web/src/api/types.ts
    - packages/web/src/api/client.ts
    - packages/web/src/router/index.tsx
    - packages/web/src/test/test-utils.tsx
    - packages/web/src/test/handlers.ts
  </read_first>
  <action>
    Create packages/web/src/pages/proposals/NewProposalPage.tsx:
    ```tsx
    import { useForm } from 'react-hook-form'
    import { zodResolver } from '@hookform/resolvers/zod'
    import { z } from 'zod'
    import { useMutation, useQueryClient } from '@tanstack/react-query'
    import { useNavigate, useParams } from 'react-router-dom'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Proposal, ApiError } from '../../api/types'
    import { Button } from '../../components/ui/button'
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
    import { Input } from '../../components/ui/input'
    import { Textarea } from '../../components/ui/textarea'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

    // CRITICAL: field is requestedAmount NOT amount
    const schema = z.object({
      title: z.string().min(1, 'Title is required').max(200),
      description: z.string().min(1, 'Description is required').max(5000),
      requestedAmount: z.coerce.number().positive('Requested amount must be greater than 0'),
    })
    type FormData = z.infer<typeof schema>

    export function NewProposalPage() {
      const { id } = useParams<{ id: string }>()
      const navigate = useNavigate()
      const qc = useQueryClient()
      const form = useForm<FormData>({ resolver: zodResolver(schema) })

      const mutation = useMutation<Proposal, ApiError, FormData>({
        mutationFn: (data) => api.post(`/circles/${id}/proposals`, data),
        onSuccess: () => {
          toast.success('Proposal created')
          qc.invalidateQueries({ queryKey: ['proposals', id] })
          navigate(`/circles/${id}?tab=proposals`)
        },
        onError: (err) => toast.error(err.error?.message ?? 'Failed to create proposal'),
      })

      return (
        <div className="max-w-lg">
          <Card>
            <CardHeader><CardTitle>Create Proposal</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input placeholder="Proposal title" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe what this funding will accomplish..." rows={5} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="requestedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested Amount (USD)</FormLabel>
                      <FormControl><Input type="number" min="0.01" step="any" placeholder="e.g. 2000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Creating...' : 'Create Proposal'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )
    }
    ```

    Create packages/web/src/pages/proposals/ProposalDetailPage.tsx:

    The page fetches GET /circles/:id/proposals/:pid and displays:
    - Proposal title, description, requestedAmount, currency, status, votingDeadline
    - Vote tally: if proposal.votes exists, show yes/no/abstain counts and quorumMet status
    - VoteWidget: three radio buttons (yes, no, abstain) + "Cast Vote" button
      - Disable the entire widget if proposal.status !== 'open'
      - Disable after successful vote: track with useState hasVoted or detect from myVote !== null
      - A 409 error from vote mutation means "already voted" — set hasVoted=true and show info message
      - After successful vote: invalidate ['proposal', circleId, proposalId]

    ```tsx
    import { useParams } from 'react-router-dom'
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
    import { useState } from 'react'
    import { toast } from 'sonner'
    import { api } from '../../api/client'
    import type { Proposal } from '../../api/types'
    import { StatusBadge } from '../../components/shared/StatusBadge'
    import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
    import { Button } from '../../components/ui/button'
    import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

    export function ProposalDetailPage() {
      const { id: circleId, pid } = useParams<{ id: string; pid: string }>()
      const qc = useQueryClient()
      const [selectedVote, setSelectedVote] = useState<'yes'|'no'|'abstain' | null>(null)
      const [hasVoted, setHasVoted] = useState(false)

      const { data: proposal, isLoading } = useQuery<Proposal>({
        queryKey: ['proposal', circleId, pid],
        queryFn: () => api.get(`/circles/${circleId}/proposals/${pid}`),
        enabled: !!circleId && !!pid,
      })

      // Hydrate hasVoted from existing myVote
      const alreadyVoted = hasVoted || (proposal?.myVote != null && proposal.myVote !== undefined)

      const voteMutation = useMutation({
        mutationFn: (vote: 'yes'|'no'|'abstain') =>
          api.post(`/circles/${circleId}/proposals/${pid}/vote`, { vote }),
        onSuccess: () => {
          toast.success('Vote cast')
          setHasVoted(true)
          qc.invalidateQueries({ queryKey: ['proposal', circleId, pid] })
        },
        onError: (err: any) => {
          if (err?.error?.status === 409) {
            setHasVoted(true)
            toast.info('You have already voted on this proposal.')
          } else {
            toast.error(err?.error?.message ?? 'Failed to cast vote')
          }
        },
      })

      if (isLoading) return <LoadingSpinner />
      if (!proposal) return <div className="p-4 text-red-500">Proposal not found</div>

      const canVote = proposal.status === 'open' && !alreadyVoted

      return (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{proposal.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Requesting {Number(proposal.requestedAmount).toLocaleString()} {proposal.currency}
              </p>
              <p className="text-xs text-muted-foreground">
                Deadline: {new Date(proposal.votingDeadline).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={proposal.status} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{proposal.description}</p>
            </CardContent>
          </Card>

          {/* Vote tally */}
          {proposal.votes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Current Votes</CardTitle></CardHeader>
              <CardContent className="flex gap-6 text-sm">
                <div><span className="font-semibold text-green-600">{proposal.votes.yes}</span> Yes</div>
                <div><span className="font-semibold text-red-600">{proposal.votes.no}</span> No</div>
                <div><span className="font-semibold text-gray-600">{proposal.votes.abstain}</span> Abstain</div>
                <div>Total: {proposal.votes.total}</div>
              </CardContent>
            </Card>
          )}

          {/* Vote widget */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cast Your Vote</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {alreadyVoted ? (
                <p className="text-sm text-muted-foreground">
                  {proposal.myVote
                    ? `You voted: ${proposal.myVote}`
                    : 'You have already voted on this proposal.'}
                </p>
              ) : proposal.status !== 'open' ? (
                <p className="text-sm text-muted-foreground">Voting is closed for this proposal.</p>
              ) : (
                <>
                  <div className="flex gap-4">
                    {(['yes', 'no', 'abstain'] as const).map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="vote"
                          value={v}
                          checked={selectedVote === v}
                          onChange={() => setSelectedVote(v)}
                          disabled={!canVote}
                          className="accent-primary"
                        />
                        <span className="capitalize text-sm">{v}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => selectedVote && voteMutation.mutate(selectedVote)}
                    disabled={!selectedVote || !canVote || voteMutation.isPending}
                  >
                    {voteMutation.isPending ? 'Voting...' : 'Cast Vote'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }
    ```

    Update packages/web/src/router/index.tsx:
    - Replace stub('NewProposal') with `<NewProposalPage />`
    - Replace stub('ProposalDetail') with `<ProposalDetailPage />`
    Add imports:
      import { NewProposalPage } from '../pages/proposals/NewProposalPage'
      import { ProposalDetailPage } from '../pages/proposals/ProposalDetailPage'

    Create packages/web/src/pages/contributions/NewContributionPage.test.tsx:
    Tests:
    1. "renders amount and note fields"
    2. "shows error when submitting without amount"
    3. "rejects file larger than 10MB before API call" — create a mock File with size > 10MB, select it, assert fileError text appears and API is NOT called
    4. "rejects disallowed MIME type" — mock File with type='text/plain', assert error appears
    5. "calls POST /circles/:id/contributions with amount and note"

    Create packages/web/src/pages/proposals/NewProposalPage.test.tsx:
    Tests:
    1. "renders title, description, requestedAmount fields"
    2. "shows error when submitting without requestedAmount"
    3. "posts requestedAmount (not amount) to /circles/:id/proposals" — capture request body, assert it has requestedAmount key

    Create packages/web/src/pages/proposals/ProposalDetailPage.test.tsx:
    Tests:
    1. "renders proposal title and status badge"
    2. "shows vote radio buttons for open proposals"
    3. "vote buttons are disabled when proposal status is not open"
    4. "after successful vote widget shows 'You voted: yes'"
    5. "409 response disables widget and shows already-voted message"
  </action>
  <acceptance_criteria>
    - packages/web/src/pages/proposals/NewProposalPage.tsx contains `requestedAmount` as the Zod field name (NOT `amount`)
    - packages/web/src/pages/proposals/NewProposalPage.tsx contains `z.coerce.number` for requestedAmount
    - packages/web/src/pages/proposals/ProposalDetailPage.tsx contains radio buttons for 'yes', 'no', 'abstain'
    - packages/web/src/pages/proposals/ProposalDetailPage.tsx contains 409 handling that sets hasVoted=true
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `ALLOWED_MIME` array and `MAX_BYTES` constant
    - packages/web/src/pages/contributions/NewContributionPage.tsx contains `proof/confirm` in the uploadProof function
    - packages/web/src/router/index.tsx imports NewProposalPage, ProposalDetailPage, NewContributionPage (no stubs)
    - `npm run build --workspace=packages/web` exits 0
    - `cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/contributions src/pages/proposals` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/levicheptoyek/MUKWANO/packages/web && npx vitest --run src/pages/contributions/NewContributionPage.test.tsx src/pages/proposals 2>&1 | tail -20</automated>
  </verify>
  <done>All three form screens implemented with correct field names; tests pass for MIME validation, requestedAmount field name, vote widget disable logic</done>
</task>

</tasks>

## Verification Criteria

- `grep 'requestedAmount' packages/web/src/pages/proposals/NewProposalPage.tsx` returns match
- `grep 'z.coerce.number' packages/web/src/pages/proposals/NewProposalPage.tsx` returns match
- `grep 'ALLOWED_MIME' packages/web/src/pages/contributions/NewContributionPage.tsx` returns match
- `grep 'proof/confirm' packages/web/src/pages/contributions/NewContributionPage.tsx` returns match
- `grep 'yes.*no.*abstain' packages/web/src/pages/proposals/ProposalDetailPage.tsx` returns match
- `grep '409' packages/web/src/pages/proposals/ProposalDetailPage.tsx` returns match
- `npm run build --workspace=packages/web` exits 0
- `cd packages/web && npx vitest --run src/pages/contributions src/pages/proposals` exits with 0 failures

## must_haves

- NewContributionPage rejects files over 10 MB or non-MIME types client-side before calling any API endpoint
- Proof upload is exactly three steps: POST /proof → PUT presigned URL (raw fetch, not api client) → POST /proof/confirm
- NewProposalPage Zod schema field is `requestedAmount`, not `amount`
- ProposalDetailPage vote widget shows radio buttons for yes/no/abstain and disables after a successful vote or a 409 response
- All three test files pass with 0 failures

<output>
After completion, create `.planning/phases/08-frontend/08-05-SUMMARY.md`
</output>
