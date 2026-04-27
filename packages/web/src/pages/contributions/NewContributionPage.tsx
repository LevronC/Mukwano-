import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const MAX_FILE_BYTES = 10 * 1024 * 1024

export function NewContributionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [amount, setAmount] = useState(10)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const submit = useMutation({
    mutationFn: async () => {
      const contribution = await api.post<{ id: string }>(`/circles/${id}/contributions`, { amount, note })
      if (!file) return contribution
      if (!ALLOWED_MIME.has(file.type)) throw new Error('Unsupported file type')
      if (file.size > MAX_FILE_BYTES) throw new Error('File size exceeds 10MB')
      const upload = await api.post<{ uploadUrl: string; fileKey: string }>(
        `/circles/${id}/contributions/${contribution.id}/proof`,
        { fileName: file.name, mimeType: file.type, sizeBytes: file.size }
      )
      await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      await api.post(`/circles/${id}/contributions/${contribution.id}/proof/confirm`, {
        fileKey: upload.fileKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      })
      return contribution
    },
    onSuccess: () => navigate(`/circles/${id}?tab=contributions`),
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--mk-white)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          New Contribution
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--mk-muted)' }}>Submit your contribution with a proof of payment.</p>
      </div>

      <form
        className="mukwano-card p-7 space-y-6"
        onSubmit={(event: FormEvent) => { event.preventDefault(); submit.mutate() }}
      >
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Amount (USD)</label>
          <input
            className="mukwano-input"
            type="number"
            min={1}
            max={1_000_000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
          <p className="text-[0.7rem] ml-1" style={{ color: 'var(--mk-muted)' }}>Maximum single contribution: 1,000,000 USD</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>Note (optional)</label>
          <textarea
            className="mukwano-input resize-none"
            rows={3}
            placeholder="Transaction reference or note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium ml-1 label-font" style={{ color: 'var(--mk-muted)' }}>
            Proof of payment (optional)
          </label>
          <div
            className="rounded-xl p-5 text-center cursor-pointer transition-all"
            style={{ background: 'var(--mk-navy2)', border: '2px dashed rgba(190,201,195,0.4)' }}
            onClick={() => document.getElementById('proof-upload')?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--mk-gold)', fontVariationSettings: "'FILL' 1" }}>attach_file</span>
                <p className="text-sm font-medium" style={{ color: 'var(--mk-gold)' }}>{file.name}</p>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: '#bec9c3' }}>upload_file</span>
                <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>Click to upload JPG, PNG, or PDF (max 10 MB)</p>
              </>
            )}
          </div>
          <input
            id="proof-upload"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="submit"
          className="mukwano-btn-primary w-full rounded-xl py-3.5 font-semibold"
          disabled={submit.isPending}
        >
          {submit.isPending ? 'Submitting…' : 'Submit Contribution'}
        </button>
      </form>
    </div>
  )
}
