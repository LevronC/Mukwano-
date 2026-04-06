import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { HttpError } from './errors/http-errors.js'
import { envPlugin } from './plugins/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { jwtPlugin } from './plugins/jwt.js'
import { corsPlugin } from './plugins/cors.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { demoModePlugin } from './plugins/demo-mode.js'
import { authRoutes } from './routes/auth/index.js'
import { configRoute } from './routes/config.js'
import { circlesRoute } from './routes/circles.js'
import { contributionsRoute } from './routes/contributions.js'
import { proposalsRoute } from './routes/proposals.js'
import { projectsRoute } from './routes/projects.js'
import { reportingRoute } from './routes/reporting.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info'
    },
    genReqId: () => crypto.randomUUID()
  })

  await app.register(envPlugin)
  await app.register(prismaPlugin)
  await app.register(jwtPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(demoModePlugin)

  // Root — API has no HTML UI; browsers hitting / otherwise get 404
  app.get('/', async (_request, reply) => {
    return reply.send({
      name: 'Mukwano API',
      version: '0.0.1',
      hint: 'All routes are under /api/v1',
      try: 'GET /api/v1/config'
    })
  })

  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok' })
  })

  app.get('/favicon.ico', async (_request, reply) => {
    return reply.code(204).send()
  })

  app.setErrorHandler((error: unknown, request, reply) => {
    const correlationId = request.id

    const err = error as { validation?: { instancePath?: string }[]; message?: string; statusCode?: number }

    if (err.validation) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message ?? 'Validation failed',
          field: err.validation[0]?.instancePath?.replace(/^\//, '') ?? null,
          status: 422
        }
      })
    }

    if (error instanceof HttpError && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          field: error.field ?? null,
          status: error.statusCode
        }
      })
    }

    app.log.error({ correlationId, err: error }, 'Unhandled server error')
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        field: null,
        status: 500
      }
    })
  })

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(configRoute, { prefix: '/api/v1' })
  await app.register(circlesRoute, { prefix: '/api/v1' })
  await app.register(contributionsRoute, { prefix: '/api/v1' })
  await app.register(proposalsRoute, { prefix: '/api/v1' })
  await app.register(projectsRoute, { prefix: '/api/v1' })
  await app.register(reportingRoute, { prefix: '/api/v1' })

  return app
}
