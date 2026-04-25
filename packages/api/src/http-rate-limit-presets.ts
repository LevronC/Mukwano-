/**
 * Per-route caps for `@fastify/rate-limit` via `config.rateLimit`.
 * The global default (100/min) is registered in `plugins/rate-limit.ts`.
 */
export const httpRateLimit = {
  login: { max: 10, timeWindow: '1 minute' },
  signup: { max: 5, timeWindow: '1 minute' },
  financialMutation: { max: 20, timeWindow: '1 minute' },
  forgotPassword: { max: 5, timeWindow: '15 minutes' },
  resendVerification: { max: 5, timeWindow: '15 minutes' },
  stepUp: { max: 10, timeWindow: '5 minutes' },
} as const
