import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { api } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { flagEmojiForCountryName } from '@/lib/onboarding-display'

type ExchangeDashboard = {
  status: string
  residenceCountryName: string | null
  focusCountryName: string | null
  residenceCurrency: string | null
  focusCurrency: string | null
  rate: number | null
  asOf: string | null
  series: Array<{ date: string; rate: number }>
  message: string | null
}

const LIME = '#bef264'

function parseAmount(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, '').replace(/^\s+|\s+$/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n: number, currency: string, maxFrac = 2): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0
  })
}

export function DashboardCurrencyConverter() {
  const { user } = useAuth()
  const [sourceIsResidence, setSourceIsResidence] = useState(true)
  const [topRaw, setTopRaw] = useState('1,000')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['exchange', 'dashboard', user?.id],
    queryFn: () => api.get<ExchangeDashboard>('/exchange/dashboard'),
    enabled: Boolean(user?.id)
  })

  const residenceCur = data?.residenceCurrency ?? ''
  const focusCur = data?.focusCurrency ?? ''
  const rate = data?.rate ?? null

  const topCurrency = sourceIsResidence ? residenceCur : focusCur
  const bottomCurrency = sourceIsResidence ? focusCur : residenceCur

  const topAmount = useMemo(() => parseAmount(topRaw), [topRaw])

  const bottomAmount = useMemo(() => {
    if (rate == null || !Number.isFinite(rate) || rate <= 0) return 0
    if (sourceIsResidence) return topAmount * rate
    return topAmount / rate
  }, [topAmount, rate, sourceIsResidence])

  const chartData = useMemo(() => {
    const s = data?.series ?? []
    return s.length >= 2 ? s : []
  }, [data?.series])

  if (!user) return null

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold font-display" style={{ color: 'var(--mk-white)' }}>
        Currency guide
      </h2>
      <div
        className="relative overflow-hidden rounded-2xl border p-5 md:p-6"
        style={{
          background: 'linear-gradient(165deg, rgba(18,28,42,0.98) 0%, rgba(10,14,24,0.99) 100%)',
          borderColor: 'rgba(190,201,195,0.12)'
        }}
      >
        {isLoading ? (
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            Loading rates…
          </p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#fecaca' }}>
            Could not load exchange data.
          </p>
        ) : data?.status === 'incomplete_profile' ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
              {data.message}
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: LIME, color: '#0a0e18' }}
            >
              Complete profile
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                person
              </span>
            </Link>
          </div>
        ) : data?.status === 'unknown_country' ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
            {data.message}
          </p>
        ) : data?.status === 'provider_error' ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              {data.message}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-xl border px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ borderColor: 'rgba(190,201,195,0.25)', color: 'var(--mk-white)' }}
            >
              Retry
            </button>
          </div>
        ) : data?.status === 'same_currency' ? (
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            Your residence and investment focus both use{' '}
            <span className="font-semibold" style={{ color: 'var(--mk-white)' }}>
              {residenceCur}
            </span>
            — no conversion is needed between them.
          </p>
        ) : data?.status === 'ok' && rate != null ? (
          <div className="space-y-5">
            {chartData.length >= 2 ? (
              <div className="h-36 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,201,195,0.12)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--mk-muted)', fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(value: string, index: number) => {
                        const n = chartData.length
                        if (n <= 1) return 'Today'
                        if (index === 0) {
                          return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        }
                        if (index === n - 1) return 'Today'
                        return ''
                      }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--mk-muted)', fontSize: 10 }}
                      width={44}
                      tickFormatter={(v) => (typeof v === 'number' ? Math.round(v).toLocaleString('en-US') : String(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0a1228',
                        border: '1px solid rgba(190,201,195,0.2)',
                        borderRadius: 8
                      }}
                      labelStyle={{ color: 'var(--mk-muted)' }}
                      formatter={(value: number) => [value.toLocaleString('en-US', { maximumFractionDigits: 2 }), focusCur]}
                    />
                    <Line type="monotone" dataKey="rate" stroke={LIME} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <p className="text-center text-sm font-medium" style={{ color: 'var(--mk-white)' }}>
              1 {residenceCur} ={' '}
              <span style={{ color: LIME }}>{rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span> {focusCur}
              {data.asOf ? (
                <span className="block mt-1 text-xs font-normal" style={{ color: 'var(--mk-muted)' }}>
                  Snapshot as of {data.asOf}
                </span>
              ) : null}
            </p>

            <div className="relative flex flex-col gap-0">
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
                style={{ borderColor: 'rgba(190,201,195,0.14)', background: 'rgba(6,10,18,0.65)' }}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={sourceIsResidence ? 'Amount in residence currency' : 'Amount in focus currency'}
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none md:text-3xl"
                  style={{ color: 'var(--mk-white)' }}
                  value={topRaw}
                  onChange={(e) => setTopRaw(e.target.value)}
                />
                <div className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: 'rgba(190,201,195,0.2)', color: 'var(--mk-white)' }}>
                  <span className="text-lg" aria-hidden>
                    {flagEmojiForCountryName(sourceIsResidence ? data.residenceCountryName ?? '' : data.focusCountryName ?? '')}
                  </span>
                  {topCurrency}
                </div>
              </div>

              <div className="relative z-10 -my-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const r = rate
                    setSourceIsResidence((v) => !v)
                    setTopRaw((prev) => {
                      const a = parseAmount(prev)
                      if (r == null || r <= 0 || !Number.isFinite(r)) return prev
                      const next = sourceIsResidence ? a * r : a / r
                      return next.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    })
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105"
                  style={{
                    borderColor: 'rgba(190,201,195,0.25)',
                    background: '#121a28',
                    color: LIME
                  }}
                  aria-label="Swap which side you type on"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    swap_vert
                  </span>
                </button>
              </div>

              <div
                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
                style={{ borderColor: 'rgba(190,201,195,0.14)', background: 'rgba(6,10,18,0.65)' }}
              >
                <p
                  className="min-w-0 flex-1 truncate text-2xl font-semibold md:text-3xl"
                  style={{ color: 'var(--mk-white)' }}
                  aria-live="polite"
                >
                  {formatMoney(bottomAmount, bottomCurrency, bottomCurrency === 'UGX' || bottomCurrency === 'RWF' ? 0 : 2)}
                </p>
                <div className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: 'rgba(190,201,195,0.2)', color: 'var(--mk-white)' }}>
                  <span className="text-lg" aria-hidden>
                    {flagEmojiForCountryName(sourceIsResidence ? data.focusCountryName ?? '' : data.residenceCountryName ?? '')}
                  </span>
                  {bottomCurrency}
                </div>
              </div>
            </div>

            <p className="text-center text-[0.6875rem] leading-relaxed label-font" style={{ color: 'var(--mk-muted)' }}>
              Indicative mid-market rates (public currency data). Not a bank quote; Mukwano does not move money across borders.
            </p>

            <Link
              to="/circles/new"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: LIME, color: '#0a0e18' }}
            >
              Plan a contribution
            </Link>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            Exchange data is unavailable.
          </p>
        )}
      </div>
    </section>
  )
}
