import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { api } from '@/api/client'
import { getErrorMessage } from '@/hooks/useApiError'

export type PortfolioSummary = {
  totalContributed?: number
  totalVerified?: number
  inProjects?: number
  currency?: string
  contributionChangePercent?: number | null
  attributionNote?: string
  bySector?: Array<{ sector: string; amount: number; percent: number }>
  byCountry?: Array<{ countryCode: string; label: string; amount: number; percent: number }>
  timeSeries?: Array<{ period: string; amount: number }>
  activeProjects?: Array<{
    id: string
    circleId: string
    title: string
    sector: string | null
    countryCode: string | null
    budget: number
    amountRaised: number
    percentComplete: number
    status: string
    currency?: string
  }>
  impact?: {
    score: number
    components: {
      contributions: number
      projects: number
      voting: number
      engagement: number
    }
    inputs: {
      approvedContributions: number
      totalContributions: number
      projectsFundedOrCreated: number
      proposalsPassed: number
      votesCast: number
      totalAvailableVotes: number
      circlesJoined: number
      activeDays: number
    }
    weights: {
      contributions: number
      projects: number
      voting: number
      engagement: number
    }
  }
}

const SECTOR_COLORS = ['var(--mk-chart-teal)', 'var(--mk-chart-orange)', '#94a3b8', '#7dd3fc', '#c084fc', '#f472b6']

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function formatMonthLabel(period: string) {
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function PortfolioPage() {
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.get<unknown[]>('/portfolio')
  })
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: () => api.get<PortfolioSummary>('/portfolio/summary')
  })

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

  const bySector = summary?.bySector ?? []
  const byCountry = summary?.byCountry ?? []
  const timeSeries = summary?.timeSeries ?? []
  const hasTimeSeriesData = timeSeries.some((t) => t.amount > 0)
  const activeProjects = summary?.activeProjects ?? []
  const pieData = bySector.map((s) => ({ name: s.sector, value: s.amount, percent: s.percent }))
  const totalContributed = Number(summary?.totalContributed ?? 0)
  const changePct = summary?.contributionChangePercent
  const impact = summary?.impact

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
      <header>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="chip-demo">Demo Mode Active</span>
              <span className="chip-escrow">Simulated Escrow</span>
            </div>
            <h1
              className="text-5xl font-bold tracking-tight leading-none"
              style={{ color: 'var(--mk-chart-teal)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Portfolio
            </h1>
            <p className="mt-3 max-w-md text-lg" style={{ color: 'var(--mk-muted)' }}>
              Your collective impact across East African communities, visualized with transparency.
            </p>
            {summary?.attributionNote && (
              <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--mk-muted2)' }}>
                {summary.attributionNote}
              </p>
            )}
          </div>

          <div className="mukwano-card p-7 flex flex-col items-start gap-1 shrink-0 min-w-[220px]">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>
              Total Contributed
            </p>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="text-4xl font-extrabold tracking-tighter" style={{ color: 'var(--mk-white)' }}>
                {formatUsd(totalContributed)}
              </span>
              {changePct != null && (
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: changePct >= 0 ? 'var(--mk-chart-teal)' : '#f87171' }}
                >
                  {changePct >= 0 ? '+' : ''}
                  {changePct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Verified</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: 'var(--mk-white)' }}>
            {formatUsd(Number(summary?.totalVerified ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>In Projects</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: 'var(--mk-white)' }}>
            {formatUsd(Number(summary?.inProjects ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'var(--mk-navy2)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'var(--mk-muted)' }}>Currency</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--mk-white)' }}>{summary?.currency ?? 'USD'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'var(--mk-geo-green)' }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest label-font" style={{ color: 'rgba(224,247,236,0.9)' }}>
            Impact Score
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-4xl font-extrabold tabular-nums" style={{ color: 'var(--mk-offwhite)' }}>
              {Math.round(impact?.score ?? 0)}
              <span className="ml-1 text-lg font-semibold opacity-80">/100</span>
            </p>
            <span
              className="rounded-lg px-2 py-1 text-xs font-bold"
              style={{ background: 'rgba(224,247,236,0.18)', color: 'var(--mk-geo-glow)' }}
            >
              C/P/V/E
            </span>
          </div>
          <div className="mt-4 space-y-2 text-xs" style={{ color: 'rgba(224,247,236,0.9)' }}>
            <p>
              C {impact?.weights.contributions ?? 0.4} x {(impact?.components.contributions ?? 0).toFixed(1)} | P {impact?.weights.projects ?? 0.3} x {(impact?.components.projects ?? 0).toFixed(1)}
            </p>
            <p>
              V {impact?.weights.voting ?? 0.2} x {(impact?.components.voting ?? 0).toFixed(1)} | E {impact?.weights.engagement ?? 0.1} x {(impact?.components.engagement ?? 0).toFixed(1)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5" style={{ background: 'var(--mk-navy2)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--mk-white)' }}>How your impact score is calculated</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--mk-muted)' }}>
          Impact Score = 0.4C + 0.3P + 0.2V + 0.1E (capped at 100). It rewards verified contributions, funded outcomes, governance participation, and consistent engagement.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-xl p-3" style={{ background: 'var(--mk-navy3)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--mk-muted)' }}>Contributions (C)</p>
            <p className="mt-1" style={{ color: 'var(--mk-white)' }}>
              {impact?.inputs.approvedContributions ?? 0} approved, {impact?.inputs.totalContributions ?? 0} total
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--mk-navy3)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--mk-muted)' }}>Projects (P)</p>
            <p className="mt-1" style={{ color: 'var(--mk-white)' }}>
              {impact?.inputs.projectsFundedOrCreated ?? 0} funded/created, {impact?.inputs.proposalsPassed ?? 0} proposals passed
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--mk-navy3)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--mk-muted)' }}>Voting (V)</p>
            <p className="mt-1" style={{ color: 'var(--mk-white)' }}>
              {impact?.inputs.votesCast ?? 0} / {impact?.inputs.totalAvailableVotes ?? 0} votes cast
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--mk-navy3)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--mk-muted)' }}>Engagement (E)</p>
            <p className="mt-1" style={{ color: 'var(--mk-white)' }}>
              {impact?.inputs.circlesJoined ?? 0} circles, {impact?.inputs.activeDays ?? 0} active days
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="mukwano-card p-6 flex flex-col min-h-[320px]">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--mk-white)' }}>
            Contribution breakdown by sector
          </h2>
          {pieData.length === 0 ? (
            <p className="text-sm flex-1 flex items-center justify-center" style={{ color: 'var(--mk-muted)' }}>
              No verified allocations yet. Charts use verified contributions split across your circles&apos; projects by budget share.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative w-full max-w-[260px] h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string) => formatUsd(Number(value))}
                      contentStyle={{ background: '#0b1630', border: '1px solid #1e3a5f', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  style={{ marginTop: '-12px' }}
                >
                  <div className="text-center">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--mk-muted)' }}>
                      Sectors
                    </p>
                    <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--mk-white)' }}>
                      {String(bySector.length).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
              <ul className="flex-1 space-y-3 w-full">
                {bySector.map((s, i) => (
                  <li key={s.sector} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--mk-white)' }}>
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                      />
                      <span className="truncate">{s.sector}</span>
                    </span>
                    <span className="tabular-nums shrink-0" style={{ color: 'var(--mk-muted)' }}>
                      {formatUsd(s.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className="rounded-3xl p-6 flex flex-col min-h-[320px] border border-white/10"
          style={{ background: 'var(--mk-geo-green)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--mk-offwhite)' }}>
            Geographic distribution
          </h2>
          {byCountry.length === 0 ? (
            <p className="text-sm flex-1 flex items-center justify-center opacity-90" style={{ color: 'var(--mk-offwhite)' }}>
              Add country codes on projects to see where your verified impact lands.
            </p>
          ) : (
            <>
              <div className="space-y-5 flex-1">
                {byCountry.map((c) => (
                  <div key={c.countryCode}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span style={{ color: 'var(--mk-offwhite)' }}>{c.label}</span>
                      <span className="tabular-nums font-medium" style={{ color: 'var(--mk-geo-glow)' }}>
                        {c.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/25 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, c.percent)}%`,
                          background: 'linear-gradient(90deg, var(--mk-geo-glow), #a7f3d0)',
                          boxShadow: '0 0 14px rgba(110, 231, 168, 0.65)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-widest opacity-80" style={{ color: 'var(--mk-offwhite)' }}>
                Next expansion: Tanzania
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mukwano-card p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--mk-white)' }}>
          Contributions over time
        </h2>
        {!hasTimeSeriesData ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--mk-muted)' }}>
            No verified contributions in the last 12 months.
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.6} />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatMonthLabel}
                  tick={{ fill: 'var(--mk-muted)', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: 'var(--mk-muted)', fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  formatter={(value: number | string) => formatUsd(Number(value))}
                  labelFormatter={formatMonthLabel}
                  contentStyle={{ background: '#0b1630', border: '1px solid #1e3a5f', borderRadius: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--mk-chart-teal)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--mk-chart-teal)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Active projects</h2>
          <span className="text-sm font-medium" style={{ color: 'var(--mk-chart-teal)' }}>
            View all activities
          </span>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--mk-navy2)' }}>
            <p style={{ color: 'var(--mk-muted)' }}>No active or approved projects in your circles yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeProjects.map((proj) => {
              const pct = Math.min(100, Math.max(0, proj.percentComplete))
              return (
                <div key={proj.id} className="mukwano-card p-5 flex gap-4">
                  <div
                    className="w-24 h-24 shrink-0 rounded-2xl bg-gradient-to-br from-[var(--mk-navy3)] to-[#0a1628] flex items-center justify-center"
                    aria-hidden
                  >
                    <span className="material-symbols-outlined text-3xl opacity-70" style={{ color: 'var(--mk-chart-teal)' }}>
                      volunteer_activism
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="font-semibold leading-snug" style={{ color: 'var(--mk-white)' }}>
                        {proj.title}
                      </h3>
                      {proj.sector && (
                        <span
                          className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(243, 156, 18, 0.2)', color: 'var(--mk-chart-orange)' }}
                        >
                          {proj.sector}
                        </span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--mk-muted)' }}>
                      {proj.countryCode ? `${proj.countryCode} · ` : ''}
                      Goal {formatUsd(proj.budget)} · {pct}% complete
                    </p>
                    <div className="mt-auto space-y-1">
                      <div className="flex justify-between text-[0.65rem] uppercase tracking-wider font-bold" style={{ color: 'var(--mk-muted)' }}>
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--mk-navy3)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: 'var(--mk-chart-teal)' }}
                        />
                      </div>
                      <div className="flex justify-between text-xs tabular-nums pt-1" style={{ color: 'var(--mk-muted)' }}>
                        <span>{formatUsd(proj.amountRaised)} raised</span>
                        <span>{formatUsd(proj.budget)} goal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--mk-white)' }}>Contribution History</h2>
          {entries.length > 0 && (
            <button
              type="button"
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
                <p className="font-bold tabular-nums" style={{ color: 'var(--mk-gold)' }}>
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
