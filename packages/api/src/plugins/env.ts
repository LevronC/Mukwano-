import fp from 'fastify-plugin'
import envPlugin from '@fastify/env'
import type { FastifyPluginAsync } from 'fastify'

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'],
  properties: {
    DATABASE_URL: { type: 'string' },
    JWT_SECRET: { type: 'string' },
    REFRESH_TOKEN_SECRET: { type: 'string' },
    DEMO_MODE: { type: 'string', default: 'false' },
    PORT: { type: 'integer', default: 4000 },
    CORS_ORIGIN: { type: 'string', default: 'http://localhost:5173' }
  }
} as const

const envPluginWrapper: FastifyPluginAsync = fp(async (server) => {
  await server.register(envPlugin, {
    confKey: 'config',
    schema,
    dotenv: { path: `${process.cwd()}/.env` }
  })
})

export { envPluginWrapper as envPlugin }
