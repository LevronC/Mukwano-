import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a monetary amount for display.
 * - Under 10,000         →  "1,234"      (exact, comma-separated)
 * - 10k – 999,999        →  "12.3k"
 * - 1m – 999,999,999     →  "1.2m"
 * - 1b+                  →  "1.0b"  (shouldn't happen in MVP but safe fallback)
 *
 * Optionally appends the currency code: formatMoney(1500, 'USD') → "1.5k USD"
 */
export function formatMoney(value: number | string, currency?: string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '—'

  let formatted: string
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    formatted = `${sign}${(abs / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}b`
  } else if (abs >= 1_000_000) {
    formatted = `${sign}${(abs / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}m`
  } else if (abs >= 10_000) {
    formatted = `${sign}${(abs / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
  } else {
    formatted = `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  }

  return currency ? `${formatted} ${currency}` : formatted
}
