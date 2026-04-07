import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = fp(async (server) => {
  const allowedOrigins = server.config.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser requests and same-origin requests.
      if (!origin) {
        cb(null, true)
        return
      }

      cb(null, allowedOrigins.includes(origin))
    },
    credentials: true
  })
})

export { corsPlugin }
