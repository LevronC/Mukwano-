import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { CIRCLE_COVER_PRESETS } from '@/components/circles/circleCoverPresets'
import { getErrorMessage } from '@/hooks/useApiError'
import { flagEmojiForCountryName, ONBOARDING_COUNTRIES, ONBOARDING_SECTORS } from '@/lib/onboarding-display'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function NewCirclePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState<string>(ONBOARDING_COUNTRIES[0].name)
  const [countrySearch, setCountrySearch] = useState('')
  const [sector, setSector] = useState<string>(ONBOARDING_SECTORS[0].label)
  const [goalAmount, setGoalAmount] = useState(100)
  /** Selected preset path, pasted URL, or data URL from file upload */
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(CIRCLE_COVER_PRESETS[0])
  const [imageUrlInput, setImageUrlInput] = useState('')

  const filteredCountries = ONBOARDING_COUNTRIES.filter(({ name: n }) =>
    n.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const createCircle = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/circles', {
        name,
        description: description || undefined,
        country,
        sector,
        goalAmount,
        coverImageUrl: coverImageUrl ?? null,
      }),
    onSuccess: async (circle) => {
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
      await queryClient.invalidateQueries({ queryKey: ['circles-explore'] })
      navigate(`/circles/${circle.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const applyExternalUrl = () => {
    const t = imageUrlInput.trim()
    if (!t) {
      toast.message('Paste an https image URL or pick a preset.')
      return
    }
    setCoverImageUrl(t)
    toast.success('Cover image URL applied')
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPEG, PNG, WebP).')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Image must be 5 MB or smaller. Try compressing the file or use a URL.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setCoverImageUrl(result)
        toast.success('Cover image attached')
      }
    }
    reader.onerror = () => toast.error('Could not read that file.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="mukwano-hero p-8">
        <div className="relative z-10 space-y-2">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: '#84d6b9' }}>
            Start a community
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Create Circle
          </h1>
          <p className="max-w-sm text-sm" style={{ color: '#a0f3d4' }}>
            Set a name, funding goal, and cover image, then invite members to govern contributions and proposals.
          </p>
        </div>
      </section>

      <form
        className="mukwano-card space-y-6 p-7"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          createCircle.mutate()
        }}
      >
        <div className="space-y-3">
          <p className="text-[0.8125rem] font-medium label-font" style={{ color: 'var(--mk-muted)' }}>
            Cover image
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted2)' }}>
            Choose a preset, paste an image URL, or upload a photo (stored with the circle). Uploads up to 5 MB.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CIRCLE_COVER_PRESETS.map((src) => {
              const active = coverImageUrl === src
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setCoverImageUrl(src)}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors ${
                    active ? 'border-[var(--mk-gold)] ring-2 ring-[var(--mk-gold)]/30' : 'border-transparent opacity-90 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              onClick={onPickFile}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
            >
              Upload image
            </button>
            <button
              type="button"
              onClick={() => {
                setCoverImageUrl(undefined)
                setImageUrlInput('')
              }}
              className="text-sm font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--mk-muted)' }}
            >
              Use auto image instead
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <input
                className="mukwano-input min-w-0 flex-1 text-sm"
                placeholder="https://…"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />
              <button
                type="button"
                onClick={applyExternalUrl}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--mk-white)' }}
              >
                Use URL
              </button>
            </div>
          </div>
          {coverImageUrl?.startsWith('data:') ? (
            <p className="text-[11px]" style={{ color: 'var(--mk-muted)' }}>
              Using uploaded image ({Math.round((coverImageUrl.length * 3) / 4 / 1024)} KB est.)
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-[rgba(240,165,0,0.15)]">
          <div className="relative aspect-[21/9] bg-[var(--mk-navy3)]">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--mk-muted)' }}>
                No cover selected — a default image will be used on cards.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-circle-name"
            className="ml-1 text-[0.8125rem] font-medium label-font"
            style={{ color: 'var(--mk-muted)' }}
          >
            Circle Name
          </label>
          <input
            id="new-circle-name"
            className="mukwano-input"
            placeholder="e.g. Kampala Health Builders"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-circle-description"
            className="ml-1 text-[0.8125rem] font-medium label-font"
            style={{ color: 'var(--mk-muted)' }}
          >
            Description
          </label>
          <textarea
            id="new-circle-description"
            className="mukwano-input resize-none"
            rows={3}
            placeholder="What mission does this circle support?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="ml-1 text-[0.8125rem] font-medium label-font" style={{ color: 'var(--mk-muted)' }}>
            Country
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted2)' }}>
            Where this circle creates impact (same regions as profile onboarding).
          </p>
          <div
            className="flex w-full items-center gap-3 rounded-[0.75rem] border border-[rgba(240,165,0,0.2)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 transition-[box-shadow,border-color] focus-within:border-[rgba(240,165,0,0.35)]"
          >
            <span className="material-symbols-outlined shrink-0 select-none" style={{ fontSize: '20px', color: 'var(--mk-muted)' }} aria-hidden>
              search
            </span>
            <input
              id="new-circle-country-search"
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search country…"
              autoComplete="off"
              aria-label="Search countries"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[rgba(122,149,196,0.65)]"
              style={{ color: 'var(--mk-white)', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
          <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {filteredCountries.map(({ name: n }) => {
              const selected = country === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCountry(n)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                  style={
                    selected
                      ? {
                          background: 'rgba(240,165,0,0.12)',
                          outline: '2px solid var(--mk-gold)',
                          color: 'var(--mk-gold)',
                          fontWeight: 600
                        }
                      : {
                          background: 'rgba(255,255,255,0.05)',
                          outline: '1px solid rgba(240,165,0,0.12)',
                          color: 'var(--mk-white)'
                        }
                  }
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {flagEmojiForCountryName(n)}
                  </span>
                  <span className="truncate">{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-circle-sector" className="ml-1 text-[0.8125rem] font-medium label-font" style={{ color: 'var(--mk-muted)' }}>
            Sector
          </label>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted2)' }}>
            Primary focus area (same sectors as onboarding and explore filters).
          </p>
          <select
            id="new-circle-sector"
            className="mukwano-input w-full cursor-pointer appearance-none bg-no-repeat bg-[length:1.25rem] bg-[position:right_0.75rem_center] pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23a0f3d4'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat'
            }}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            required
          >
            {ONBOARDING_SECTORS.map(({ label }) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-circle-goal"
            className="ml-1 text-[0.8125rem] font-medium label-font"
            style={{ color: 'var(--mk-muted)' }}
          >
            Goal Amount (USD)
          </label>
          <input
            id="new-circle-goal"
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
