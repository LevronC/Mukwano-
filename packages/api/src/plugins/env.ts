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
    CORS_ORIGIN: {
      type: 'string',
      default: 'http://localhost:5173,https://mukwano-web.vercel.app,https://mukwano.vercel.app'
    },
    APP_URL: {
      type: 'string',
      default: 'http://localhost:5173'
    },
    RESEND_API_KEY: { type: 'string', default: '' },
    RESEND_FROM: {
      type: 'string',
      default: 'Mukwano <onboarding@resend.dev>'
    },
    AZURE_STORAGE_ACCOUNT_NAME: { type: 'string', default: '' },
    AZURE_STORAGE_ACCOUNT_KEY: { type: 'string', default: '' },
    AZURE_STORAGE_CONTAINER_NAME: { type: 'string', default: 'mukwano-proofs' },
    STRIPE_SECRET_KEY: { type: 'string', default: '' },
    STRIPE_WEBHOOK_SECRET: { type: 'string', default: '' },
    /** Sentry DSN — omit in dev/test to disable reporting */
    SENTRY_DSN: { type: 'string', default: '' },
    SENTRY_ENVIRONMENT: { type: 'string', default: '' },
    SENTRY_TRACES_SAMPLE_RATE: { type: 'string', default: '0' },
    /** Ops: optional queue depth (e.g. outbox/backfill); 0 if unknown */
    QUEUE_DEPTH: { type: 'string', default: '0' },
    /** ISO-8601 date of last successful backup verify drill (ops-set) */
    BACKUP_LAST_VERIFIED_ISO: { type: 'string', default: '' }
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
