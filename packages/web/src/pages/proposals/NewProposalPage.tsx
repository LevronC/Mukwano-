import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function NewProposalPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requestedAmount, setRequestedAmount] = useState(50)

  const createProposal = useMutation({
    mutationFn: () => api.post(`/circles/${id}/proposals`, { title, description, requestedAmount }),
    onSuccess: () => navigate(`/circles/${id}?tab=proposals`),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          New Proposal
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--mk-muted)' }}>Propose a project for the circle to vote on.</p>
      </div>

      <form
        className="mukwano-card p-7 space-y-6"
        onSubmit={(event: FormEvent) => { event.preventDefault(); createProposal.mutate() }}
      >
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Proposal Title</label>
          <input
            className="mukwano-input"
            placeholder="e.g. Build a borehole in Lira"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Description</label>
          <textarea
            className="mukwano-input resize-none"
            rows={4}
            placeholder="Describe the project, impact, and how funds will be used…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Requested Amount (USD)</label>
          <input
            className="mukwano-input"
            type="number"
            min={1}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
            required
          />
        </div>
        <button
          type="submit"
          className="mukwano-btn-primary w-full rounded-xl py-3.5 font-semibold"
          disabled={createProposal.isPending}
        >
          {createProposal.isPending ? 'Creating…' : 'Create Proposal'}
        </button>
      </form>
    </div>
  )
}
