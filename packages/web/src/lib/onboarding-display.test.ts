import { describe, expect, it } from 'vitest'
import { flagEmojiForCountryName, isoCodeToFlagEmoji, ONBOARDING_COUNTRIES } from './onboarding-display'

describe('onboarding-display', () => {
  it('maps ISO codes to flag emoji', () => {
    expect(isoCodeToFlagEmoji('UG')).toBe('🇺🇬')
    expect(isoCodeToFlagEmoji('KE')).toBe('🇰🇪')
    expect(isoCodeToFlagEmoji('ZA')).toBe('🇿🇦')
  })

  it('maps onboarding country names to flags', () => {
    for (const { name, code } of ONBOARDING_COUNTRIES) {
      expect(flagEmojiForCountryName(name)).toBe(isoCodeToFlagEmoji(code))
    }
  })
})
