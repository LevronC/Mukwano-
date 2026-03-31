import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const STATUS_TRANSITIONS = [
  { action: 'approved', label: 'Approve', icon: 'check_circle' },
  { action: 'executing', label: 'Start executing', icon: 'play_circle' },
  { action: 'complete', label: 'Mark complete', icon: 'task_alt' },
  { action: 'cancelled', label: 'Cancel', icon: 'cancel' },
] as const

const statusStyle = (status?: string) => {
  if (status === 'complete') return { background: '#c9eadb', color: '#2f4c42' }
  if (status === 'executing') return { background: '#ffdcbb', color: '#6b3f00' }
  if (status === 'cancelled') return { background: '#ffdad6', color: '#93000a' }
  return { background: 'rgba(255,255,255,0.08)', color: 'var(--mk-muted)' }
}

export function ProjectDetailPage() {
  const { id = '', projId = '' } = useParams()
  const [inlineError, setInlineError] = useState('')
  const { data, refetch } = useQuery({
    queryKey: ['project', projId],
    queryFn: () =>
      api.get<{
        title?: string
        description?: string
        status?: string
        approvedAmount?: string | number
        currency?: string
      }>(`/circles/${id}/projects/${projId}`)
  })

  const transition = useMutation({
    mutationFn: (status: 'approved' | 'executing' | 'complete' | 'cancelled') =>
      api.patch(`/circles/${id}/projects/${projId}`, { status }),
    onSuccess: () => {
      setInlineError('')
      void refetch()
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      if (message.includes('Insufficient treasury')) setInlineError(message)
      toast.error(message)
    }
  })

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Hero */}
      <section className="mukwano-hero p-8 md:p-10">
        <div className="relative z-10 space-y-2">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: '#84d6b9' }}>
            Funded Project
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {data?.title ?? 'Project'}
          </h1>
          <p className="text-sm max-w-xl" style={{ color: '#a0f3d4' }}>
            {data?.description ?? 'Track execution progress and status transitions here.'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Status</p>
          <div className="mt-2">
            <span
              className="rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-widest label-font"
              style={statusStyle(data?.status)}
            >
              {data?.status ?? '–'}
            </span>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Approved Amount</p>
          <p className="mt-2 font-bold text-xl" style={{ color: 'var(--mk-gold)' }}>
            {data?.approvedAmount ?? '–'} {data?.currency ?? 'USD'}
          </p>
        </div>
        <div className="rounded-2xl p-5 overflow-hidden" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Circle</p>
          <p className="mt-2 text-xs font-mono break-all" style={{ color: 'var(--mk-muted)' }}>{id}</p>
        </div>
      </section>

      {/* Status transitions */}
      <section className="mukwano-card p-6 space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--mk-white)' }}>Status Actions</h2>
        <div className="flex flex-wrap gap-3">
          {STATUS_TRANSITIONS.map(({ action, label, icon }) => (
            <button
              key={action}
              onClick={() => transition.mutate(action)}
              disabled={transition.isPending || data?.status === action}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={
                action === 'complete'
                  ? { background: 'linear-gradient(135deg, #005440, #0f6e56)', color: '#ffffff' }
                  : action === 'cancelled'
                  ? { background: '#ffdad6', color: '#93000a' }
                  : action === 'executing'
                  ? { background: '#ffdcbb', color: '#6b3f00' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
        {inlineError && (
          <div className="rounded-xl p-3 text-sm" style={{ background: '#ffdad6', color: '#93000a' }}>
            {inlineError}
          </div>
        )}
      </section>
    </div>
  )
}
