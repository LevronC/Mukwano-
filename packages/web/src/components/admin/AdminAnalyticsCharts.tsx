import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from 'recharts'

const PIE_COLORS = ['#f0a500', '#84d6b9', '#7a95c4', '#e8b4b4', '#c9b8d9']

type UserGrowthSeries = { period: string; count: number }
type ContributionSeries = { period: string; amount: number }
type ProposalSummary = {
  byStatus: Array<{ status: string; count: number }>
  passed: number
  failed: number
  successRatePercent: number | null
}
type TreasurySeries = { period: string; netAmount: number }

type Props = {
  userGrowth: { series: UserGrowthSeries[] } | undefined
  contributions: { series: ContributionSeries[]; currency: string } | undefined
  proposals: ProposalSummary | undefined
  treasury: { series: TreasurySeries[]; currency: string } | undefined
}

export function AdminAnalyticsCharts({ userGrowth, contributions, proposals, treasury }: Props) {
  const pieData =
    proposals?.byStatus?.map((s) => ({
      name: s.status.replace(/_/g, ' '),
      value: s.count
    })) ?? []

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="mukwano-card p-5">
          <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>
            User growth (signups / month)
          </h3>
          <p className="mb-4 text-xs label-font" style={{ color: 'var(--mk-muted)' }}>UTC month buckets</p>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,201,195,0.2)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0a1228', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--mk-muted)' }}
                />
                <Line type="monotone" dataKey="count" name="New users" stroke="#f0a500" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mukwano-card p-5">
          <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>
            Verified contributions ({contributions?.currency ?? 'USD'})
          </h3>
          <p className="mb-4 text-xs label-font" style={{ color: 'var(--mk-muted)' }}>By verification month (UTC)</p>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributions?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,201,195,0.2)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0a1228', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--mk-muted)' }}
                />
                <Bar dataKey="amount" name="Amount" fill="#84d6b9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="mukwano-card p-5">
          <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>
            Proposal outcomes (non-open)
          </h3>
          {proposals?.successRatePercent != null && (
            <p className="mb-4 text-xs" style={{ color: 'var(--mk-gold)' }}>
              Success rate: {proposals.successRatePercent}% (passed vs decided)
            </p>
          )}
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0a1228', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mukwano-card p-5">
          <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--mk-white)' }}>
            Treasury net ({treasury?.currency ?? 'USD'})
          </h3>
          <p className="mb-4 text-xs label-font" style={{ color: 'var(--mk-muted)' }}>Sum of ledger entries by month</p>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={treasury?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,201,195,0.2)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--mk-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0a1228', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--mk-muted)' }}
                />
                <Line type="monotone" dataKey="netAmount" name="Net" stroke="#7a95c4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
