/**
 * ISO 4217 codes for onboarding country display names (see `RESIDENCE_COUNTRIES` on web).
 * Keys must match exactly what we store on `User.residenceCountry` / `User.country`.
 */
export const CURRENCY_BY_COUNTRY_NAME: Readonly<Record<string, string>> = {
  Uganda: 'UGX',
  Kenya: 'KES',
  Nigeria: 'NGN',
  Ghana: 'GHS',
  Rwanda: 'RWF',
  Tanzania: 'TZS',
  'South Africa': 'ZAR',
  Ethiopia: 'ETB',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Germany: 'EUR',
  France: 'EUR',
  Canada: 'CAD',
  Netherlands: 'EUR',
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  Australia: 'AUD',
  Sweden: 'SEK',
  Norway: 'NOK'
} as const

export function currencyForCountryName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null
  const trimmed = name.trim()
  return CURRENCY_BY_COUNTRY_NAME[trimmed] ?? null
}

export type SelectableCurrency = {
  code: string
  label: string
  /** One onboarding country using this code (for flags / copy). */
  representativeCountryName: string
}

/** Unique ISO 4217 codes from onboarding, sorted, with English labels. */
export function listSelectableCurrencies(): SelectableCurrency[] {
  const codeToCountry = new Map<string, string>()
  for (const [country, code] of Object.entries(CURRENCY_BY_COUNTRY_NAME)) {
    if (!codeToCountry.has(code)) codeToCountry.set(code, country)
  }
  const codes = [...codeToCountry.keys()].sort()
  let dn: Intl.DisplayNames
  try {
    dn = new Intl.DisplayNames(['en'], { type: 'currency' })
  } catch {
    return codes.map((code) => ({
      code,
      label: code,
      representativeCountryName: codeToCountry.get(code) ?? code
    }))
  }
  return codes.map((code) => ({
    code,
    label: `${code} — ${dn.of(code) ?? code}`,
    representativeCountryName: codeToCountry.get(code) ?? code
  }))
}

const ALLOWED_CODES = new Set(listSelectableCurrencies().map((c) => c.code))

export function isAllowedExchangeCurrencyCode(code: string): boolean {
  const c = code.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(c) && ALLOWED_CODES.has(c)
}
