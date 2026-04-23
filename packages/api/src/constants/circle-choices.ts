/**
 * Must stay in sync with `ONBOARDING_COUNTRIES` / `ONBOARDING_SECTORS` in packages/web.
 */
export const ONBOARDING_COUNTRY_NAMES = [
  'Uganda',
  'Kenya',
  'Nigeria',
  'Ghana',
  'Rwanda',
  'Tanzania',
  'South Africa',
  'Ethiopia'
] as const

export const DIASPORA_HOST_COUNTRY_NAMES = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Netherlands',
  'United Arab Emirates',
  'Saudi Arabia',
  'Australia',
  'Sweden',
  'Norway'
] as const

export const ONBOARDING_SECTOR_LABELS = [
  'Healthcare',
  'Education',
  'Agriculture',
  'Technology',
  'Infrastructure',
  'Clean Energy'
] as const

export type OnboardingCountryName = (typeof ONBOARDING_COUNTRY_NAMES)[number]
export type OnboardingSectorLabel = (typeof ONBOARDING_SECTOR_LABELS)[number]
