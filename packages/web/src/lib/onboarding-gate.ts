import type { User } from '@/api/types'

/** One-time setup: sector, residence, and (for USA) home state. */
export function isOnboardingComplete(user: User | null | undefined): boolean {
  if (!user?.sector || !user.residenceCountry) return false
  if (user.residenceCountry === 'United States' && !user.residenceRegion) return false
  return true
}
