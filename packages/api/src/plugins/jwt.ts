import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync } from 'fastify'

const jwtPlugin: FastifyPluginAsync = fp(async (server) => {
  await server.register(jwt, {
    secret: server.config.JWT_SECRET,
    namespace: 'access',
    sign: { expiresIn: '15m', algorithm: 'HS256' }
  })

  await server.register(jwt, {
    secret: server.config.REFRESH_TOKEN_SECRET,
    namespace: 'refresh',
    sign: { expiresIn: '30d', algorithm: 'HS256' }
  })
})

export { jwtPlugin }
