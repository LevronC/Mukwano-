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
