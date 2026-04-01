/**
 * Onboarding copy + visuals. Country values stay human names for API (`PATCH /auth/me`).
 * Flags use Unicode regional indicators (ISO 3166-1 alpha-2).
 */

/** ISO 3166-1 alpha-2 → flag emoji */
export function isoCodeToFlagEmoji(iso: string): string {
  const code = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🌍'
  return [...code].map((c) => String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 65))).join('')
}

export type OnboardingCountry = { name: string; code: string }

/** African markets supported in onboarding; flags match ISO codes */
export const ONBOARDING_COUNTRIES: readonly OnboardingCountry[] = [
  { name: 'Uganda', code: 'UG' },
  { name: 'Kenya', code: 'KE' },
  { name: 'Nigeria', code: 'NG' },
  { name: 'Ghana', code: 'GH' },
  { name: 'Rwanda', code: 'RW' },
  { name: 'Tanzania', code: 'TZ' },
  { name: 'South Africa', code: 'ZA' },
  { name: 'Ethiopia', code: 'ET' },
] as const

const countryNameToCode = new Map(ONBOARDING_COUNTRIES.map((c) => [c.name, c.code]))

export function flagEmojiForCountryName(name: string): string {
  const code = countryNameToCode.get(name)
  return code ? isoCodeToFlagEmoji(code) : '🌍'
}

export type OnboardingSector = {
  label: string
  /** Material SymbolsOutlined ligature name */
  icon: string
  shortHint: string
}

/** Distinct Material icons (verified common set) */
export const ONBOARDING_SECTORS: readonly OnboardingSector[] = [
  { label: 'Healthcare', icon: 'medical_services', shortHint: 'Clinics & community health' },
  { label: 'Education', icon: 'school', shortHint: 'Schools & learning' },
  { label: 'Agriculture', icon: 'agriculture', shortHint: 'Farming & food systems' },
  { label: 'Technology', icon: 'memory', shortHint: 'Digital & innovation' },
  { label: 'Infrastructure', icon: 'engineering', shortHint: 'Roads, water & cities' },
  { label: 'Clean Energy', icon: 'solar_power', shortHint: 'Solar & sustainable power' },
] as const

export function sectorByLabel(label: string): OnboardingSector | undefined {
  return ONBOARDING_SECTORS.find((s) => s.label === label)
}
