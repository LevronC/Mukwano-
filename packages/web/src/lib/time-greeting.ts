/**
 * Time-of-day greeting from the user's local clock.
 * In the browser, `Date` uses the device timezone and locale settings.
 */
export function getLocalTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Good evening'
}
