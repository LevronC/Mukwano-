import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export function PortfolioPage() {
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useQuery({ queryKey: ['portfolio'], queryFn: () => api.get<unknown[]>('/portfolio') })
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({ queryKey: ['portfolio-summary'], queryFn: () => api.get<{ totalContributed?: number; totalVerified?: number; inProjects?: number; currency?: string }>('/portfolio/summary') })

  const entries = (portfolio ?? []) as Array<{
    id: string
    circleId: string
    circle?: { name: string }
    amount: string
    currency?: string
    status: string
    submittedAt?: string
    verifier?: { displayName: string | null } | null
  }>

  function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"'
    }
    return value
  }

  function downloadCSV() {
    const headers = ['Date', 'Circle', 'Amount', 'Currency', 'Status', 'Verified By']
    const rows = entries.map((entry) => {
      const date = entry.submittedAt ? entry.submittedAt.slice(0, 10) : ''
      const circle = entry.circle?.name ?? 'Unknown'
      const amount = entry.amount
      const currency = entry.currency ?? 'USD'
      const status = entry.status
      const verifiedBy = entry.verifier?.displayName ?? ''
      return [date, circle, amount, currency, status, verifiedBy].map(escapeCSV).join(',')
    })
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `mukwano-contributions-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const loading = portfolioLoading || summaryLoading
  const error = portfolioError ?? summaryError

  if (loading) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--mk-navy2)' }}>
        <p style={{ color: 'var(--mk-muted)' }}>Loading portfolio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#ffe9e7' }}>
        <p className="font-medium" style={{ color: '#7a1f1f' }}>{getErrorMessage(error)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Page header — editorial */}
      <header>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="chip-demo">Demo Mode Active</span>
              <span className="chip-escrow">Simulated Escrow</span>
            </div>
            <h1
              className="text-5xl font-bold tracking-tight leading-none"
              style={{ color: 'var(--mk-gold)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Portfolio
            </h1>
            <p className="mt-3 max-w-md text-lg" style={{ color: 'var(--mk-muted)' }}>
              Your collective impact across East African communities, visualized with transparency.
            </p>
          </div>

          {/* Total contributed card */}
          <div className="mukwano-card p-7 flex flex-col items-start gap-1 shrink-0">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
              Total Contributed
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold tracking-tighter" style={{ color: 'var(--mk-gold)' }}>
                ${summary?.totalContributed ?? 0}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats bento */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Verified</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--mk-white)' }}>${summary?.totalVerified ?? 0}</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>In Projects</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--mk-white)' }}>${summary?.inProjects ?? 0}</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Currency</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--mk-white)' }}>{summary?.currency ?? 'USD'}</p>
        </div>
      </section>

      {/* Contribution history */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Contribution History</h2>
          {entries.length > 0 && (
            <button
              onClick={downloadCSV}
              className="mukwano-btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--mk-navy2)' }}>
            <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: '#bec9c3' }}>account_balance_wallet</span>
            <p className="font-medium" style={{ color: 'var(--mk-muted)' }}>No contributions yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="mukwano-card p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold" style={{ color: 'var(--mk-white)' }}>
                  {entry.circle?.name ?? entry.circleId}
                </p>
                <p className="text-xs mt-0.5 label-font" style={{ color: 'var(--mk-muted)' }}>
                  {new Date(entry.submittedAt ?? Date.now()).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: 'var(--mk-gold)' }}>
                  {entry.amount} {entry.currency ?? 'USD'}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-widest label-font"
                  style={
                    entry.status === 'verified'
                      ? { background: '#c9eadb', color: '#2f4c42' }
                      : { background: '#ffdcbb', color: '#6b3f00' }
                  }
                >
                  {entry.status}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
