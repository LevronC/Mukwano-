import { useEffect, useMemo, useState } from 'react'
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

type SelectableCurrency = {
  code: string
  label: string
  representativeCountryName: string
}

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
  selectableCurrencies: SelectableCurrency[]
}

type ExchangePair = {
  status: string
  fromCurrency: string
  toCurrency: string
  rate: number | null
  asOf: string | null
  series: Array<{ date: string; rate: number }>
  message: string | null
}

const GOLD = '#f0a500'

const selectClass =
  'max-w-[min(52vw,11rem)] shrink-0 truncate rounded-lg border bg-transparent py-2 pl-2 pr-7 text-xs font-semibold outline-none md:max-w-[14rem] md:text-sm'

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

function flagForSelectable(code: string, list: SelectableCurrency[]): string {
  const row = list.find((c) => c.code === code)
  return flagEmojiForCountryName(row?.representativeCountryName ?? '')
}

export function DashboardCurrencyConverter() {
  const { user } = useAuth()
  const [fromCode, setFromCode] = useState<string | null>(null)
  const [toCode, setToCode] = useState<string | null>(null)
  const [pickerReady, setPickerReady] = useState(false)
  const [topIsFrom, setTopIsFrom] = useState(true)
  const [topRaw, setTopRaw] = useState('1,000')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['exchange', 'dashboard', user?.id],
    queryFn: () => api.get<ExchangeDashboard>('/exchange/dashboard'),
    enabled: Boolean(user?.id)
  })

  const selectable = data?.selectableCurrencies ?? []

  useEffect(() => {
    if (!data?.selectableCurrencies?.length || pickerReady) return
    const sel = data.selectableCurrencies
    const res = data.residenceCurrency
    const foc = data.focusCurrency
    if (res && foc && res !== foc) {
      setFromCode(res)
      setToCode(foc)
    } else if (res && foc && res === foc) {
      setFromCode(res)
      setToCode(sel.find((c) => c.code !== res)?.code ?? res)
    } else {
      const usd = sel.find((c) => c.code === 'USD')
      const first = usd ?? sel[0]
      const second = sel.find((c) => c.code !== first.code) ?? sel[1] ?? sel[0]
      setFromCode(first.code)
      setToCode(second.code)
    }
    setPickerReady(true)
  }, [data, pickerReady])

  const profilePairOk =
    data?.status === 'ok' &&
    Boolean(fromCode && toCode && fromCode === data.residenceCurrency && toCode === data.focusCurrency)

  const sameCodes = Boolean(fromCode && toCode && fromCode === toCode)

  const { data: pairData, isLoading: pairLoading, refetch: refetchPair } = useQuery({
    queryKey: ['exchange', 'pair', fromCode, toCode],
    queryFn: () =>
      api.get<ExchangePair>(
        `/exchange/pair?from=${encodeURIComponent(fromCode!)}&to=${encodeURIComponent(toCode!)}`
      ),
    enabled: Boolean(user?.id && fromCode && toCode && !sameCodes && !profilePairOk)
  })

  const rate = useMemo(() => {
    if (sameCodes) return 1
    if (profilePairOk && data?.rate != null) return data.rate
    if (!profilePairOk && pairData?.status === 'ok' && pairData.rate != null) return pairData.rate
    return null
  }, [sameCodes, profilePairOk, data?.rate, pairData?.status, pairData?.rate])

  const asOf = useMemo(() => {
    if (profilePairOk) return data?.asOf ?? null
    if (pairData?.status === 'ok') return pairData.asOf ?? null
    return null
  }, [profilePairOk, data?.asOf, pairData?.status, pairData?.asOf])

  const series = useMemo(() => {
    if (profilePairOk) return data?.series ?? []
    if (pairData?.status === 'ok') return pairData.series ?? []
    return []
  }, [profilePairOk, data?.series, pairData?.status, pairData?.series])

  const providerMessage = useMemo(() => {
    if (profilePairOk && data?.status === 'provider_error') return data.message
    if (!profilePairOk && pairData?.status === 'provider_error') return pairData.message
    return null
  }, [profilePairOk, data?.status, data?.message, pairData?.status, pairData?.message])

  const topCurrency = topIsFrom ? (fromCode ?? '') : (toCode ?? '')
  const bottomCurrency = topIsFrom ? (toCode ?? '') : (fromCode ?? '')

  const topAmount = useMemo(() => parseAmount(topRaw), [topRaw])

  const bottomAmount = useMemo(() => {
    if (rate == null || !Number.isFinite(rate) || rate <= 0) return 0
    if (topIsFrom) return topAmount * rate
    return topAmount / rate
  }, [topAmount, rate, topIsFrom])

  const chartData = useMemo(() => {
    const s = series ?? []
    return s.length >= 2 ? s : []
  }, [series])

  const canResetProfile =
    Boolean(
      data?.residenceCurrency &&
        data?.focusCurrency &&
        data.residenceCurrency !== data.focusCurrency
    )

  const handleResetProfile = () => {
    if (!data?.residenceCurrency || !data.focusCurrency) return
    if (data.residenceCurrency === data.focusCurrency) return
    setFromCode(data.residenceCurrency)
    setToCode(data.focusCurrency)
    setTopIsFrom(true)
    setTopRaw('1,000')
  }

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
        ) : !selectable.length ? (
          <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            Currency options are unavailable.
          </p>
        ) : (
          <div className="space-y-5">
            {data?.status === 'incomplete_profile' ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                  {data.message}
                </p>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: GOLD, color: '#0a0e18' }}
                >
                  Complete profile
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    person
                  </span>
                </Link>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                  You can still compare any supported currencies below. Your profile adds a one-tap shortcut once
                  residence and investment focus are set.
                </p>
              </div>
            ) : null}

            {data?.status === 'unknown_country' ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                {data.message}
              </p>
            ) : null}

            {data?.status === 'same_currency' ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                Your residence and investment focus share the same currency. Use the dropdowns to compare against any
                other supported currency.
              </p>
            ) : null}

            {fromCode && toCode ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold label-font sm:max-w-[min(100%,20rem)]" style={{ color: 'var(--mk-muted)' }}>
                  <span className="shrink-0">From</span>
                  <select
                    className={selectClass}
                    style={{ borderColor: 'rgba(190,201,195,0.25)', color: 'var(--mk-white)' }}
                    value={fromCode}
                    onChange={(e) => {
                      const v = e.target.value
                      setFromCode(v)
                      if (v === toCode) {
                        const alt = selectable.find((c) => c.code !== v)?.code
                        if (alt) setToCode(alt)
                      }
                    }}
                  >
                    {selectable.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold label-font sm:max-w-[min(100%,20rem)]" style={{ color: 'var(--mk-muted)' }}>
                  <span className="shrink-0">To</span>
                  <select
                    className={selectClass}
                    style={{ borderColor: 'rgba(190,201,195,0.25)', color: 'var(--mk-white)' }}
                    value={toCode}
                    onChange={(e) => {
                      const v = e.target.value
                      setToCode(v)
                      if (v === fromCode) {
                        const alt = selectable.find((c) => c.code !== v)?.code
                        if (alt) setFromCode(alt)
                      }
                    }}
                  >
                    {selectable.map((c) => (
                      <option key={`to-${c.code}`} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!canResetProfile}
                  onClick={handleResetProfile}
                  className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: 'rgba(190,201,195,0.25)', color: 'var(--mk-gold)' }}
                  title={
                    canResetProfile
                      ? 'Use residence and investment-focus currencies from your profile'
                      : 'Set two different countries in your profile for this shortcut'
                  }
                >
                  Profile pair
                </button>
              </div>
            ) : null}

            {profilePairOk && data?.status === 'provider_error' ? (
              <div className="space-y-2">
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
            ) : null}

            {!profilePairOk && pairLoading ? (
              <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                Loading pair…
              </p>
            ) : null}

            {!profilePairOk && pairData?.status === 'invalid_pair' ? (
              <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                {pairData.message}
              </p>
            ) : null}

            {providerMessage && !(profilePairOk && data?.status === 'provider_error') ? (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                  {providerMessage}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchPair()}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold transition-opacity"
                  style={{ borderColor: 'rgba(190,201,195,0.25)', color: 'var(--mk-white)' }}
                >
                  Retry pair
                </button>
              </div>
            ) : null}

            {fromCode && toCode && rate != null && Number.isFinite(rate) && rate > 0 ? (
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
                          tickFormatter={(v) =>
                            typeof v === 'number' ? Math.round(v).toLocaleString('en-US') : String(v)
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0a1228',
                            border: '1px solid rgba(190,201,195,0.2)',
                            borderRadius: 8
                          }}
                          labelStyle={{ color: 'var(--mk-muted)' }}
                          formatter={(value: number) => [
                            value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
                            toCode ?? ''
                          ]}
                        />
                        <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}

                <p className="text-center text-sm font-medium" style={{ color: 'var(--mk-white)' }}>
                  1 {fromCode} ={' '}
                  <span style={{ color: GOLD }}>{rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>{' '}
                  {toCode}
                  {asOf ? (
                    <span className="mt-1 block text-xs font-normal" style={{ color: 'var(--mk-muted)' }}>
                      Snapshot as of {asOf}
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
                      aria-label={topIsFrom ? `Amount in ${fromCode}` : `Amount in ${toCode}`}
                      className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none md:text-3xl"
                      style={{ color: 'var(--mk-white)' }}
                      value={topRaw}
                      onChange={(e) => setTopRaw(e.target.value)}
                    />
                    <div
                      className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold"
                      style={{ borderColor: 'rgba(190,201,195,0.2)', color: 'var(--mk-white)' }}
                    >
                      <span className="text-lg" aria-hidden>
                        {flagForSelectable(topCurrency, selectable)}
                      </span>
                      {topCurrency}
                    </div>
                  </div>

                  <div className="relative z-10 -my-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const r = rate
                        setTopIsFrom((v) => !v)
                        setTopRaw((prev) => {
                          const a = parseAmount(prev)
                          if (r == null || r <= 0 || !Number.isFinite(r)) return prev
                          const next = topIsFrom ? a * r : a / r
                          return next.toLocaleString('en-US', { maximumFractionDigits: 2 })
                        })
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105"
                      style={{
                        borderColor: 'rgba(190,201,195,0.25)',
                        background: '#121a28',
                        color: GOLD
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
                      {formatMoney(
                        bottomAmount,
                        bottomCurrency,
                        bottomCurrency === 'UGX' || bottomCurrency === 'RWF' ? 0 : 2
                      )}
                    </p>
                    <div
                      className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold"
                      style={{ borderColor: 'rgba(190,201,195,0.2)', color: 'var(--mk-white)' }}
                    >
                      <span className="text-lg" aria-hidden>
                        {flagForSelectable(bottomCurrency, selectable)}
                      </span>
                      {bottomCurrency}
                    </div>
                  </div>
                </div>

                <p className="text-center text-[0.6875rem] leading-relaxed label-font" style={{ color: 'var(--mk-muted)' }}>
                  Indicative mid-market rates (public currency data). Not a bank quote; Mukwano does not move money
                  across borders.
                </p>

                <Link
                  to="/circles"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: GOLD, color: '#0a0e18' }}
                >
                  Plan a contribution
                </Link>
              </div>
            ) : data?.status === 'same_currency' && fromCode && toCode && fromCode === toCode ? (
              <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                Choose two different currencies above to compare. Your profile uses the same ISO code for residence and
                investment focus.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
