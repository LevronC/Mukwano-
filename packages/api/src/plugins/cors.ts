import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = fp(async (server) => {
  await server.register(cors, {
    origin: server.config.CORS_ORIGIN,
    credentials: true
  })
})

export { corsPlugin }
