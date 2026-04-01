import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { useAuth } from '@/contexts/AuthContext'
import { flagEmojiForCountryName } from '@/lib/onboarding-display'

export function ProfilePage() {
  const { refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const { data, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ displayName?: string; email?: string; country?: string; sector?: string; isGlobalAdmin?: boolean }>('/auth/me')
  })

  const save = useMutation({
    mutationFn: () => api.patch('/auth/me', { displayName }),
    onSuccess: () => {
      toast.success('Profile updated')
      void refetch()
      void refreshUser()
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
          style={{ background: 'var(--mk-gold)', color: '#ffffff' }}
        >
          {data?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {data?.displayName ?? 'Profile'}
          </h1>
          <p className="text-sm label-font" style={{ color: 'var(--mk-muted)' }}>{data?.email}</p>
          {data?.isGlobalAdmin && (
            <span className="chip-escrow mt-1 inline-block">Global Admin</span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="mukwano-card p-6 space-y-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Account Details</h2>
        {[
          { label: 'Email', value: data?.email },
          {
            label: 'Country',
            value: data?.country ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>
                  {flagEmojiForCountryName(data.country)}
                </span>
                {data.country}
              </span>
            ) : (
              '–'
            )
          },
          { label: 'Sector', value: data?.sector },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(190,201,195,0.15)' }}>
            <p className="text-[0.8125rem] font-medium label-font shrink-0" style={{ color: 'var(--mk-muted)' }}>{label}</p>
            <p className="text-[0.8125rem] font-semibold text-right min-w-0" style={{ color: 'var(--mk-white)' }}>{value ?? '–'}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="mukwano-card p-6 space-y-5">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Edit Profile</h2>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); save.mutate() }} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Display Name</label>
            <input
              className="mukwano-input"
              placeholder={data?.displayName ?? 'Enter display name'}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mukwano-btn-primary rounded-xl px-6 py-3 font-semibold text-sm"
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
