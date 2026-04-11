import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { HttpError } from './errors/http-errors.js'
import { envPlugin } from './plugins/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { jwtPlugin } from './plugins/jwt.js'
import { corsPlugin } from './plugins/cors.js'
import { helmetPlugin } from './plugins/helmet.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { demoModePlugin } from './plugins/demo-mode.js'
import { notificationsPlugin } from './plugins/notifications.js'
import { emailPlugin } from './plugins/email.js'
import { authRoutes } from './routes/auth/index.js'
import { configRoute } from './routes/config.js'
import { circlesRoute } from './routes/circles.js'
import { contributionsRoute } from './routes/contributions.js'
import { proposalsRoute } from './routes/proposals.js'
import { projectsRoute } from './routes/projects.js'
import { reportingRoute } from './routes/reporting.js'
import { notificationsRoute } from './routes/notifications.js'

function firstMetaField(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') return null

  const fieldName = Reflect.get(meta, 'field_name')
  if (typeof fieldName === 'string' && fieldName.length > 0) return fieldName

  const target = Reflect.get(meta, 'target')
  if (Array.isArray(target)) {
    const first = target.find((value) => typeof value === 'string')
    return typeof first === 'string' ? first : null
  }

  if (typeof target === 'string' && target.length > 0) return target

  const model = Reflect.get(meta, 'modelName')
  return typeof model === 'string' && model.length > 0 ? model : null
}

function mapPrismaError(error: unknown): HttpError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null

  const field = firstMetaField(error.meta)

  switch (error.code) {
    case 'P2000':
      return new HttpError(422, 'VALUE_TOO_LONG', 'Value is too long for this field', field)
    case 'P2002':
      return new HttpError(409, 'UNIQUE_CONSTRAINT_VIOLATION', 'A record with this value already exists', field)
    case 'P2003':
      return new HttpError(409, 'FOREIGN_KEY_CONSTRAINT_VIOLATION', 'Referenced record does not exist or cannot be modified', field)
    case 'P2004':
      return new HttpError(409, 'CONSTRAINT_VIOLATION', 'The request violates a database constraint', field)
    case 'P2011':
      return new HttpError(422, 'NULL_CONSTRAINT_VIOLATION', 'A required value is missing', field)
    case 'P2025':
      return new HttpError(404, 'NOT_FOUND', 'Requested record was not found', field)
    default:
      return null
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info'
    },
    genReqId: () => crypto.randomUUID(),
    bodyLimit: 4 * 1024 * 1024  // 4 MB — accommodates base64 profile image uploads
  })

  await app.register(envPlugin)
  await app.register(prismaPlugin)
  await app.register(jwtPlugin)
  await app.register(corsPlugin)
  await app.register(helmetPlugin)
  await app.register(rateLimitPlugin)
  await app.register(demoModePlugin)
  await app.register(emailPlugin)
  await app.register(notificationsPlugin)

  // Root — API has no HTML UI; browsers hitting / otherwise get 404
  app.get('/', async (_request, reply) => {
    return reply.send({
      name: 'Mukwano API',
      version: '0.0.1',
      hint: 'All routes are under /api/v1',
      try: 'GET /api/v1/config'
    })
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

    const prismaError = mapPrismaError(error)
    if (prismaError) {
      return reply.code(prismaError.statusCode).send({
        error: {
          code: prismaError.code,
          message: prismaError.message,
          field: prismaError.field ?? null,
          status: prismaError.statusCode
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
  await app.register(notificationsRoute, { prefix: '/api/v1' })

  return app
}
