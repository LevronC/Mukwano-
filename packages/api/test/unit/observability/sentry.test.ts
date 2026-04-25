import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('API Sentry helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.SENTRY_DSN
  })

  it('initApiSentry is no-op without DSN', async () => {
    const { initApiSentry, isSentryEnabled, captureHttpException, captureFinancialException } =
      await import('../../../src/lib/observability/sentry.js')
    initApiSentry()
    expect(isSentryEnabled()).toBe(false)
    expect(() => captureHttpException(new Error('x'), { path: '/p' })).not.toThrow()
    expect(() => captureFinancialException(new Error('x'), 'op', { a: 1 })).not.toThrow()
  })
})
