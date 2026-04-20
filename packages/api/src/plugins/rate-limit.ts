import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'

const rateLimitPlugin: FastifyPluginAsync = fp(async (server) => {
  if (process.env.NODE_ENV === 'test') return
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute' // per-route overrides in `http-rate-limit-presets.ts`
  })
})

export { rateLimitPlugin }
