import * as Sentry from '@sentry/node'

let sentryEnabled = false

/**
 * Call once from `server.ts` after env is loaded. No-ops when `SENTRY_DSN` is unset.
 */
export function initApiSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return

  const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0')
  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development'

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0
  })
  sentryEnabled = true
}

export function isSentryEnabled(): boolean {
  return sentryEnabled
}

/**
 * 5xx and unexpected errors from the global Fastify error handler.
 */
export function captureHttpException(
  error: unknown,
  context: { correlationId?: string; method?: string; path?: string }
): void {
  if (!sentryEnabled) return
  Sentry.withScope((scope) => {
    if (context.correlationId) scope.setTag('correlationId', context.correlationId)
    if (context.method) scope.setTag('http.method', context.method)
    if (context.path) scope.setTag('http.path', context.path)
    Sentry.captureException(error)
  })
}

/**
 * Swallowed errors on financial and payment-adjacent paths (webhooks, idempotency store, etc.).
 * Tag with `financial.*` for Sentry alert rules.
 */
export function captureFinancialException(
  error: unknown,
  operation: string,
  extra?: Record<string, string | number | boolean | null>
): void {
  if (!sentryEnabled) return
  Sentry.withScope((scope) => {
    scope.setTag('financial', 'true')
    scope.setTag('financial.operation', operation)
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        scope.setExtra(k, v)
      }
    }
    Sentry.captureException(error)
  })
}
