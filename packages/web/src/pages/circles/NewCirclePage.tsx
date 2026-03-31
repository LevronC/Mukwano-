import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function NewCirclePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState(100)

  const createCircle = useMutation({
    mutationFn: () => api.post<{ id: string }>('/circles', { name, description, goalAmount }),
    onSuccess: async (circle) => {
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
      navigate(`/circles/${circle.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Hero */}
      <section className="mukwano-hero p-8">
        <div className="relative z-10 space-y-2">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: '#84d6b9' }}>
            Start a community
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Create Circle
          </h1>
          <p className="text-sm max-w-sm" style={{ color: '#a0f3d4' }}>
            Set a clear name and funding goal, then invite members to govern contributions and proposals.
          </p>
        </div>
      </section>

      {/* Form */}
      <form
        className="mukwano-card p-7 space-y-6"
        onSubmit={(event: FormEvent) => { event.preventDefault(); createCircle.mutate() }}
      >
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Circle Name</label>
          <input
            className="mukwano-input"
            placeholder="e.g. Kampala Health Builders"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Description</label>
          <textarea
            className="mukwano-input resize-none"
            rows={3}
            placeholder="What mission does this circle support?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Goal Amount (USD)</label>
          <input
            className="mukwano-input"
            type="number"
            min={1}
            value={goalAmount}
            onChange={(e) => setGoalAmount(Number(e.target.value))}
            required
          />
        </div>
        <button
          type="submit"
          className="mukwano-btn-primary w-full rounded-xl py-3.5 font-semibold"
          disabled={createCircle.isPending}
        >
          {createCircle.isPending ? 'Creating…' : 'Create Circle'}
        </button>
      </form>
    </div>
  )
}
