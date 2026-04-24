import type { FastifyInstance } from 'fastify'
import {
  currencyForCountryName,
  isAllowedExchangeCurrencyCode,
  listSelectableCurrencies,
  type SelectableCurrency
} from '../constants/currency-by-country.js'

/**
 * Public currency data on jsDelivr (fawazahmed0/currency-api). Frankfurter ECB
 * data omits most African ISO codes (e.g. UGX), so we use this source for
 * diaspora ↔ Africa pairs.
 */
const CURRENCY_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'
const CACHE_TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 12_000

type CacheEntry<T> = { expires: number; value: T }
const latestCache = new Map<string, CacheEntry<{ rate: number; date: string }>>()
const seriesCache = new Map<string, CacheEntry<Array<{ date: string; rate: number }>>>()

export type ExchangeDashboardStatus =
  | 'ok'
  | 'incomplete_profile'
  | 'same_currency'
  | 'unknown_country'
  | 'provider_error'

export type ExchangeDashboardResponse = {
  status: ExchangeDashboardStatus
  residenceCountryName: string | null
  focusCountryName: string | null
  residenceCurrency: string | null
  focusCurrency: string | null
  /** 1 unit of residence currency equals this many focus-currency units */
  rate: number | null
  asOf: string | null
  series: Array<{ date: string; rate: number }>
  message: string | null
  /** ISO codes from onboarding countries; use for custom pair picker. */
  selectableCurrencies: SelectableCurrency[]
}

export type ExchangePairStatus = 'ok' | 'same_currency' | 'invalid_pair' | 'provider_error'

export type ExchangePairResponse = {
  status: ExchangePairStatus
  fromCurrency: string
  toCurrency: string
  rate: number | null
  asOf: string | null
  series: Array<{ date: string; rate: number }>
  message: string | null
}

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const row = map.get(key)
  if (!row) return null
  if (CACHE_TTL_MS === 0) return null
  if (Date.now() > row.expires) {
    map.delete(key)
    return null
  }
  return row.value
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  if (CACHE_TTL_MS === 0) return
  map.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
  } finally {
    clearTimeout(t)
  }
}

/** 1 `from` = rate × `to` */
async function fetchLatestRate(from: string, to: string): Promise<{ rate: number; date: string }> {
  if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) }
  const key = `${from}:${to}`
  const hit = cacheGet(latestCache, key)
  if (hit) return hit

  const fromL = from.toLowerCase()
  const toL = to.toLowerCase()
  const url = `${CURRENCY_API}@latest/v1/currencies/${fromL}.json`
  const body = (await fetchJson(url)) as { date?: string; [k: string]: unknown }
  const bucket = body[fromL] as Record<string, number> | undefined
  let rate = bucket?.[toL]
  let date = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    const invUrl = `${CURRENCY_API}@latest/v1/currencies/${toL}.json`
    const invBody = (await fetchJson(invUrl)) as { date?: string; [k: string]: unknown }
    const invBucket = invBody[toL] as Record<string, number> | undefined
    const inv = invBucket?.[fromL]
    if (typeof inv !== 'number' || !Number.isFinite(inv) || inv <= 0) {
      throw new Error('currency-api: missing or invalid rate for pair')
    }
    rate = 1 / inv
    if (typeof invBody.date === 'string') date = invBody.date
  }

  const out = { rate, date }
  cacheSet(latestCache, key, out)
  return out
}

function sampleDates(endUtc: Date, spanDays: number, count: number): string[] {
  const end = new Date(endUtc)
  end.setUTCHours(0, 0, 0, 0)
  const dates: string[] = []
  const n = Math.max(2, Math.min(count, 16))
  for (let i = 0; i < n; i++) {
    const d = new Date(end)
    const back = Math.round((i / (n - 1)) * spanDays)
    d.setUTCDate(d.getUTCDate() - back)
    dates.push(d.toISOString().slice(0, 10))
  }
  return [...new Set(dates)].sort()
}

async function fetchTimeSeries(
  from: string,
  to: string,
  days: number
): Promise<Array<{ date: string; rate: number }>> {
  if (from === to) {
    const d = new Date().toISOString().slice(0, 10)
    return [{ date: d, rate: 1 }]
  }
  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 365)
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const startStr = new Date(end.getTime() - safeDays * 86_400_000).toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const key = `${from}:${to}:${startStr}:${endStr}`
  const hit = cacheGet(seriesCache, key)
  if (hit) return hit

  const fromL = from.toLowerCase()
  const toL = to.toLowerCase()
  const dateStrs = sampleDates(end, safeDays, 12)
  const series: Array<{ date: string; rate: number }> = []

  for (const dateStr of dateStrs) {
    try {
      const url = `${CURRENCY_API}@${dateStr}/v1/currencies/${fromL}.json`
      const body = (await fetchJson(url)) as { date?: string; [k: string]: unknown }
      const bucket = body[fromL] as Record<string, number> | undefined
      let r = bucket?.[toL]
      if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0) {
        const invUrl = `${CURRENCY_API}@${dateStr}/v1/currencies/${toL}.json`
        const invBody = (await fetchJson(invUrl)) as { [k: string]: unknown }
        const invBucket = invBody[toL] as Record<string, number> | undefined
        const inv = invBucket?.[fromL]
        if (typeof inv !== 'number' || !Number.isFinite(inv) || inv <= 0) continue
        r = 1 / inv
      }
      series.push({ date: typeof body.date === 'string' ? body.date : dateStr, rate: r })
    } catch {
      /* skip missing snapshot for this calendar day */
    }
  }

  series.sort((a, b) => a.date.localeCompare(b.date))
  cacheSet(seriesCache, key, series)
  return series
}

export class ExchangeService {
  constructor(private readonly app: FastifyInstance) {}

  private readonly selectable = listSelectableCurrencies()

  private dash(
    partial: Omit<ExchangeDashboardResponse, 'selectableCurrencies'>
  ): ExchangeDashboardResponse {
    return { ...partial, selectableCurrencies: this.selectable }
  }

  /** Latest + series for any allowed ISO pair (profile-independent). */
  async getPair(fromRaw: string, toRaw: string): Promise<ExchangePairResponse> {
    const fromCurrency = fromRaw.trim().toUpperCase()
    const toCurrency = toRaw.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency)) {
      return {
        status: 'invalid_pair',
        fromCurrency,
        toCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'from and to must be three-letter ISO 4217 codes.'
      }
    }
    if (!isAllowedExchangeCurrencyCode(fromCurrency) || !isAllowedExchangeCurrencyCode(toCurrency)) {
      return {
        status: 'invalid_pair',
        fromCurrency,
        toCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'One or both currencies are not available in Mukwano yet.'
      }
    }
    if (fromCurrency === toCurrency) {
      return {
        status: 'same_currency',
        fromCurrency,
        toCurrency,
        rate: 1,
        asOf: new Date().toISOString().slice(0, 10),
        series: [],
        message: null
      }
    }
    try {
      const { rate, date } = await fetchLatestRate(fromCurrency, toCurrency)
      let series: Array<{ date: string; rate: number }> = []
      try {
        series = await fetchTimeSeries(fromCurrency, toCurrency, 90)
      } catch (seriesErr) {
        this.app.log.warn(
          { err: seriesErr, fromCurrency, toCurrency },
          'exchange pair timeseries failed; returning latest only'
        )
      }
      return {
        status: 'ok',
        fromCurrency,
        toCurrency,
        rate,
        asOf: date,
        series,
        message: null
      }
    } catch (e) {
      this.app.log.warn({ err: e, fromCurrency, toCurrency }, 'exchange pair fetch failed')
      return {
        status: 'provider_error',
        fromCurrency,
        toCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'Live rates are temporarily unavailable. Try again in a few minutes.'
      }
    }
  }

  async getDashboardExchange(userId: string): Promise<ExchangeDashboardResponse> {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { residenceCountry: true, country: true }
    })
    const residenceCountryName = user?.residenceCountry?.trim() || null
    const focusCountryName = user?.country?.trim() || null

    if (!residenceCountryName || !focusCountryName) {
      return this.dash({
        status: 'incomplete_profile',
        residenceCountryName,
        focusCountryName,
        residenceCurrency: null,
        focusCurrency: null,
        rate: null,
        asOf: null,
        series: [],
        message: 'Add your residence and Africa investment focus in your profile to see a personalized rate.'
      })
    }

    const residenceCurrency = currencyForCountryName(residenceCountryName)
    const focusCurrency = currencyForCountryName(focusCountryName)
    if (!residenceCurrency || !focusCurrency) {
      return this.dash({
        status: 'unknown_country',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'We do not have a currency mapping for one of your profile countries yet.'
      })
    }

    if (residenceCurrency === focusCurrency) {
      return this.dash({
        status: 'same_currency',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: 1,
        asOf: new Date().toISOString().slice(0, 10),
        series: [],
        message: null
      })
    }

    try {
      const { rate, date } = await fetchLatestRate(residenceCurrency, focusCurrency)
      let series: Array<{ date: string; rate: number }> = []
      try {
        series = await fetchTimeSeries(residenceCurrency, focusCurrency, 90)
      } catch (seriesErr) {
        this.app.log.warn(
          { err: seriesErr, userId, residenceCurrency, focusCurrency },
          'exchange timeseries failed; returning latest only'
        )
      }
      return this.dash({
        status: 'ok',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate,
        asOf: date,
        series,
        message: null
      })
    } catch (e) {
      this.app.log.warn({ err: e, userId, residenceCurrency, focusCurrency }, 'exchange dashboard fetch failed')
      return this.dash({
        status: 'provider_error',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'Live rates are temporarily unavailable. Try again in a few minutes.'
      })
    }
  }
}
