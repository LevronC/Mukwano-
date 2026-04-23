import type { FormEvent, ChangeEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'
import { useAuth } from '@/contexts/AuthContext'
import { flagEmojiForCountryName, ONBOARDING_COUNTRIES, ONBOARDING_SECTORS, RESIDENCE_COUNTRIES, US_STATE_NAMES } from '@/lib/onboarding-display'

type MeData = {
  id: string
  email: string
  displayName: string
  /** African market interest (optional; different from where you live). */
  country?: string | null
  residenceCountry?: string | null
  residenceRegion?: string | null
  sector?: string | null
  avatarUrl?: string | null
  isGlobalAdmin?: boolean
  createdAt?: string
}

type CircleMembership = {
  id: string
  role: string
  joinedAt: string
  circle: { id: string; name: string; status: string }
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function completeness(data: MeData | undefined) {
  if (!data) return 0
  const fields = [data.displayName, data.email, data.residenceCountry, data.sector, data.avatarUrl]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function nextMissingField(data: MeData | undefined): string | null {
  if (!data) return null
  if (!data.residenceCountry) return 'Add your country (residence)'
  if (data.residenceCountry === 'United States' && !data.residenceRegion) return 'Add your U.S. state'
  if (!data.sector) return 'Add your sector'
  if (!data.avatarUrl) return 'Upload a profile picture'
  return null
}

function resizeToBase64(file: File, maxPx = 200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas unavailable'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ProfilePage() {
  const { refreshUser, logout } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  const [displayName, setDisplayName] = useState('')
  const [residenceCountry, setResidenceCountry] = useState('')
  const [residenceRegion, setResidenceRegion] = useState('')
  const [africaFocus, setAfricaFocus] = useState('')
  const [sector, setSector] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [privacyVisible, setPrivacyVisible] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: () => api.get<MeData>('/auth/me')
  })

  const { data: circles } = useQuery<CircleMembership[]>({
    queryKey: ['me-circles'],
    queryFn: () => api.get<CircleMembership[]>('/auth/me/circles')
  })

  // Only initialise form state once — never overwrite fields the user is
  // currently editing (avoids the race where saveAvatar triggers a refetch
  // that resets a displayName the user just typed).
  useEffect(() => {
    if (!data || initialized.current) return
    setDisplayName(data.displayName ?? '')
    setResidenceCountry(data.residenceCountry ?? '')
    setResidenceRegion(data.residenceRegion ?? '')
    setAfricaFocus(data.country ?? '')
    setSector(data.sector ?? '')
    setAvatarUrl(data.avatarUrl ?? '')
    setAvatarError(false)
    initialized.current = true
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string | null> = {}
      if (displayName.trim()) body.displayName = displayName.trim()
      if (sector !== (data?.sector ?? '')) body.sector = sector

      if (residenceCountry !== (data?.residenceCountry ?? '')) {
        body.residenceCountry = residenceCountry
        body.residenceRegion = residenceCountry === 'United States' ? (residenceRegion || null) : null
      } else if (residenceCountry === 'United States' && residenceRegion !== (data?.residenceRegion ?? '')) {
        body.residenceRegion = residenceRegion || null
      } else if (residenceCountry !== 'United States' && (data?.residenceRegion != null && data.residenceRegion !== '')) {
        body.residenceRegion = null
      }

      if (africaFocus !== (data?.country ?? '')) body.country = africaFocus || null

      if (Object.keys(body).length === 0) return Promise.resolve(null)
      return api.patch<MeData>('/auth/me', body)
    },
    onSuccess: (result) => {
      if (!result) { toast.info('No changes to save'); return }
      // Update cache directly — no refetch so the user's other edits aren't reset
      qc.setQueryData<MeData>(['me'], (old) => old ? { ...old, ...result } : result)
      void refreshUser()
      toast.success('Profile updated')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const saveAvatar = useMutation({
    mutationFn: (b64: string) => api.patch<MeData>('/auth/me', { avatarUrl: b64 }),
    onSuccess: (result) => {
      // Update cache directly — preserve any display name the user is editing
      qc.setQueryData<MeData>(['me'], (old) => old ? { ...old, ...result } : result)
      void refreshUser()
      toast.success('Profile picture updated')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      setAvatarUrl(data?.avatarUrl ?? '')
    }
  })

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/me/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: () => {
      void logout()
      navigate('/')
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const pct = completeness(data)
  const nextMissing = nextMissingField(data)
  const activeCircles = (circles ?? []).filter((m) => m.circle.status !== 'closed')

  return (
    <div className="mx-auto max-w-xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          {data?.avatarUrl && !avatarError ? (
            <img
              src={data.avatarUrl}
              alt={data.displayName}
              onError={() => setAvatarError(true)}
              className="h-16 w-16 rounded-full object-cover"
              style={{ border: '2px solid var(--mk-gold)' }}
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
              style={{ background: 'var(--mk-gold)', color: '#ffffff' }}
            >
              {data?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {data?.displayName ?? 'Profile'}
          </h1>
          <p className="text-sm label-font" style={{ color: 'var(--mk-muted)' }}>{data?.email}</p>
          <p className="text-xs label-font mt-0.5" style={{ color: 'var(--mk-muted)' }}>
            {data?.createdAt ? `Member since ${relativeDate(data.createdAt)}` : ''}
            {activeCircles.length > 0 ? ` · ${activeCircles.length} active circle${activeCircles.length !== 1 ? 's' : ''}` : ''}
          </p>
          {data?.isGlobalAdmin && (
            <span className="chip-escrow mt-1 inline-block">Global Admin</span>
          )}
        </div>
      </div>

      {/* ── Profile Completeness ── */}
      <div className="mukwano-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>
            Profile {pct}% complete
          </h2>
          <span className="text-xs label-font" style={{ color: pct === 100 ? '#84d6b9' : 'var(--mk-muted)' }}>
            {pct === 100 ? 'Complete' : `${5 - Math.round(pct / 20)} fields missing`}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(190,201,195,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? '#84d6b9' : 'var(--mk-gold)' }}
          />
        </div>
        {nextMissing && (
          <p className="text-xs label-font" style={{ color: 'var(--mk-muted)' }}>
            Next: <span style={{ color: 'var(--mk-gold)' }}>{nextMissing}</span>
          </p>
        )}
      </div>

      {/* ── Account Details ── */}
      <div className="mukwano-card p-6 space-y-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Account Details</h2>
        {[
          {
            label: 'Email',
            value: data?.email
          },
          {
            label: 'Country (residence)',
            value: data?.residenceCountry ? (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-lg leading-none" aria-hidden>{flagEmojiForCountryName(data.residenceCountry)}</span>
                {data.residenceCountry}
                {data.residenceCountry === 'United States' && data.residenceRegion
                  ? ` — ${data.residenceRegion}`
                  : null}
              </span>
            ) : '–'
          },
          {
            label: 'Africa investment focus',
            value: data?.country
              ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-lg leading-none" aria-hidden>{flagEmojiForCountryName(data.country)}</span>
                  {data.country}
                </span>
                )
              : '–'
          },
          {
            label: 'Sector',
            value: data?.sector ?? (
              <button
                className="text-xs font-semibold"
                style={{ color: 'var(--mk-gold)' }}
                onClick={() => document.getElementById('sector-input')?.focus()}
              >
                Add your sector →
              </button>
            )
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 py-3"
            style={{ borderBottom: '1px solid rgba(190,201,195,0.15)' }}
          >
            <p className="text-[0.8125rem] font-medium label-font shrink-0" style={{ color: 'var(--mk-muted)' }}>{label}</p>
            <p className="text-[0.8125rem] font-semibold text-right min-w-0" style={{ color: 'var(--mk-white)' }}>{value ?? '–'}</p>
          </div>
        ))}
      </div>

      {/* ── Edit Profile ── */}
      <div className="mukwano-card p-6 space-y-5">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Edit Profile</h2>
        <form
          onSubmit={(event: FormEvent) => { event.preventDefault(); save.mutate() }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
              Display Name
            </label>
            <input
              className="mukwano-input"
              placeholder="Enter display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }} htmlFor="residence-select">
              Country (where you live)
            </label>
            <select
              id="residence-select"
              className="mukwano-input w-full"
              value={residenceCountry}
              onChange={(e) => {
                const v = e.target.value
                setResidenceCountry(v)
                if (v !== 'United States') setResidenceRegion('')
              }}
            >
              <option value="">Select country</option>
              {RESIDENCE_COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {residenceCountry === 'United States' && (
            <div className="space-y-1.5">
              <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }} htmlFor="us-state">
                State / D.C.
              </label>
              <select
                id="us-state"
                className="mukwano-input w-full"
                value={residenceRegion}
                onChange={(e) => setResidenceRegion(e.target.value)}
              >
                <option value="">Select state</option>
                {US_STATE_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }} htmlFor="africa-select">
              Africa investment interest (optional)
            </label>
            <select
              id="africa-select"
              className="mukwano-input w-full"
              value={africaFocus}
              onChange={(e) => setAfricaFocus(e.target.value)}
            >
              <option value="">Not set</option>
              {ONBOARDING_COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-[0.8125rem] font-medium ml-1 label-font"
              style={{ color: 'var(--mk-muted)' }}
              htmlFor="sector-input"
            >
              Sector
            </label>
            <select
              id="sector-input"
              className="mukwano-input w-full"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="">Select sector</option>
              {ONBOARDING_SECTORS.map((s) => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* ── Avatar upload ── */}
          <div className="space-y-2">
            <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {/* Clickable avatar preview */}
              <button
                type="button"
                className="relative shrink-0 rounded-full focus:outline-none group"
                style={{ width: 72, height: 72 }}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile picture"
              >
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    onError={() => setAvatarError(true)}
                    className="h-full w-full rounded-full object-cover"
                    style={{ border: '2px solid var(--mk-gold)' }}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full text-2xl font-bold"
                    style={{ background: 'var(--mk-gold)', color: '#ffffff', border: '2px solid var(--mk-gold)' }}
                  >
                    {data?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {/* Camera overlay */}
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)' }}
                >
                  {(uploadingAvatar || saveAvatar.isPending) ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 22, color: '#fff' }}>progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#fff' }}>photo_camera</span>
                  )}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  className="text-sm font-semibold rounded-xl px-4 py-2 transition-all"
                  style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--mk-gold)', border: '1px solid rgba(240,165,0,0.25)' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar || saveAvatar.isPending}
                >
                  {uploadingAvatar ? 'Processing…' : saveAvatar.isPending ? 'Saving…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="ml-2 text-xs label-font"
                    style={{ color: 'var(--mk-muted)' }}
                    onClick={() => { setAvatarUrl(''); setAvatarError(false) }}
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs label-font mt-1.5" style={{ color: 'var(--mk-muted)' }}>
                  JPG, PNG or WebP · auto-resized to 200 × 200 px
                </p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingAvatar(true)
                setAvatarError(false)
                try {
                  const b64 = await resizeToBase64(file)
                  setAvatarUrl(b64)
                  // Auto-save immediately — no need to click Save Changes
                  saveAvatar.mutate(b64)
                } catch {
                  toast.error('Could not process image — please try another file')
                } finally {
                  setUploadingAvatar(false)
                  e.target.value = ''
                }
              }}
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

      {/* ── Circle Memberships ── */}
      <div className="mukwano-card p-6 space-y-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Circle Memberships</h2>
        {(circles ?? []).length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              You haven't joined any circles yet.{' '}
              <a href="/circles" style={{ color: 'var(--mk-gold)' }}>Explore circles →</a>
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: 'rgba(190,201,195,0.15)' }}>
            {(circles ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--mk-white)' }}>{m.circle.name}</p>
                  <p className="text-xs label-font mt-0.5" style={{ color: 'var(--mk-muted)' }}>
                    Joined {relativeDate(m.joinedAt)}
                  </p>
                </div>
                <span
                  className="chip-demo text-xs"
                  style={{
                    background: m.role === 'creator' ? 'rgba(212,175,55,0.15)' : 'rgba(190,201,195,0.1)',
                    color: m.role === 'creator' ? 'var(--mk-gold)' : 'var(--mk-muted)'
                  }}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Privacy ── */}
      <div className="mukwano-card p-6 space-y-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>Privacy</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={privacyVisible}
            onChange={(e) => setPrivacyVisible(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-[var(--mk-gold)]"
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--mk-white)' }}>
              Visible to circle members only
            </p>
            <p className="text-xs label-font mt-0.5" style={{ color: 'var(--mk-muted)' }}>
              Your profile details will only be visible to members of circles you belong to.
              Full enforcement coming in a future update.
            </p>
          </div>
        </label>
      </div>

      {/* ── Danger Zone ── */}
      <div
        className="mukwano-card p-6 space-y-6"
        style={{ borderColor: 'rgba(248,113,113,0.25)', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <h2 className="text-base font-semibold" style={{ color: '#f87171' }}>Danger Zone</h2>

        {/* Change password */}
        <div className="space-y-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>Change Password</p>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              if (newPassword !== confirmPassword) {
                toast.error('New passwords do not match')
                return
              }
              changePassword.mutate()
            }}
            className="space-y-3"
          >
            <input
              className="mukwano-input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <input
              className="mukwano-input"
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              className="mukwano-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}
              disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              {changePassword.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        <div style={{ borderTop: '1px solid rgba(248,113,113,0.2)' }} />

        {/* Delete account */}
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>Delete Account</p>
          <p className="text-xs label-font" style={{ color: 'var(--mk-muted)' }}>
            Permanently deletes your account and all associated data. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete my account
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{ background: '#f87171', color: '#ffffff' }}
                disabled={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{ background: 'rgba(190,201,195,0.1)', color: 'var(--mk-muted)' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
