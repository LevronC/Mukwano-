import { describe, expect, it } from 'vitest'
import { getLocalTimeGreeting } from './time-greeting'

function greetingAtLocalHour(hour: number): string {
  return getLocalTimeGreeting(new Date(2026, 5, 15, hour, 0, 0))
}

describe('getLocalTimeGreeting', () => {
  it('morning for 5–11 local', () => {
    expect(greetingAtLocalHour(5)).toBe('Good morning')
    expect(greetingAtLocalHour(11)).toBe('Good morning')
  })
  it('afternoon for 12–16 local', () => {
    expect(greetingAtLocalHour(12)).toBe('Good afternoon')
    expect(greetingAtLocalHour(16)).toBe('Good afternoon')
  })
  it('evening for 17–21 and late night', () => {
    expect(greetingAtLocalHour(17)).toBe('Good evening')
    expect(greetingAtLocalHour(21)).toBe('Good evening')
    expect(greetingAtLocalHour(22)).toBe('Good evening')
    expect(greetingAtLocalHour(4)).toBe('Good evening')
  })
})
