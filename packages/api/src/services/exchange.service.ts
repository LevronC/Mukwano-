import type { FastifyInstance } from 'fastify'
import { currencyForCountryName } from '../constants/currency-by-country.js'

const FRANKFURTER = 'https://api.frankfurter.app'
const CACHE_TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 60 * 60 * 1000

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

async function fetchLatestRate(from: string, to: string): Promise<{ rate: number; date: string }> {
  if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) }
  const key = `${from}:${to}`
  const hit = cacheGet(latestCache, key)
  if (hit) return hit

  const url = `${FRANKFURTER}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Frankfurter latest ${res.status}: ${text.slice(0, 200)}`)
  }
  const body = (await res.json()) as { date?: string; rates?: Record<string, number> }
  const rate = body.rates?.[to]
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Frankfurter latest: missing or invalid rate')
  }
  const date = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)
  const out = { rate, date }
  cacheSet(latestCache, key, out)
  return out
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
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - safeDays)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const key = `${from}:${to}:${startStr}:${endStr}`
  const hit = cacheGet(seriesCache, key)
  if (hit) return hit

  const url = `${FRANKFURTER}/${startStr}..${endStr}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Frankfurter series ${res.status}: ${text.slice(0, 200)}`)
  }
  const body = (await res.json()) as { rates?: Record<string, Record<string, number>> }
  const rates = body.rates ?? {}
  const series: Array<{ date: string; rate: number }> = []
  for (const date of Object.keys(rates).sort()) {
    const r = rates[date]?.[to]
    if (typeof r === 'number' && Number.isFinite(r) && r > 0) {
      series.push({ date, rate: r })
    }
  }
  cacheSet(seriesCache, key, series)
  return series
}

export class ExchangeService {
  constructor(private readonly app: FastifyInstance) {}

  async getDashboardExchange(userId: string): Promise<ExchangeDashboardResponse> {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { residenceCountry: true, country: true }
    })
    const residenceCountryName = user?.residenceCountry?.trim() || null
    const focusCountryName = user?.country?.trim() || null

    if (!residenceCountryName || !focusCountryName) {
      return {
        status: 'incomplete_profile',
        residenceCountryName,
        focusCountryName,
        residenceCurrency: null,
        focusCurrency: null,
        rate: null,
        asOf: null,
        series: [],
        message: 'Add your residence and Africa investment focus in your profile to see a personalized rate.'
      }
    }

    const residenceCurrency = currencyForCountryName(residenceCountryName)
    const focusCurrency = currencyForCountryName(focusCountryName)
    if (!residenceCurrency || !focusCurrency) {
      return {
        status: 'unknown_country',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'We do not have a currency mapping for one of your profile countries yet.'
      }
    }

    if (residenceCurrency === focusCurrency) {
      return {
        status: 'same_currency',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: 1,
        asOf: new Date().toISOString().slice(0, 10),
        series: [],
        message: null
      }
    }

    try {
      const { rate, date } = await fetchLatestRate(residenceCurrency, focusCurrency)
      const series = await fetchTimeSeries(residenceCurrency, focusCurrency, 90)
      return {
        status: 'ok',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate,
        asOf: date,
        series,
        message: null
      }
    } catch (e) {
      this.app.log.warn({ err: e, userId, residenceCurrency, focusCurrency }, 'exchange dashboard fetch failed')
      return {
        status: 'provider_error',
        residenceCountryName,
        focusCountryName,
        residenceCurrency,
        focusCurrency,
        rate: null,
        asOf: null,
        series: [],
        message: 'Live rates are temporarily unavailable. Try again in a few minutes.'
      }
    }
  }
}
