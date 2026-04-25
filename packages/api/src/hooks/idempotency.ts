import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { captureFinancialException } from '../lib/observability/sentry.js'

const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Call at the top of a route handler. If the Idempotency-Key header is present
 * and a cached response exists, sends the cached response and returns true —
 * the caller must return immediately. Returns false when the request should proceed.
 *
 * Usage:
 *   if (await checkIdempotency(fastify, request, reply)) return
 */
export async function checkIdempotency(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const key = request.headers['idempotency-key'] as string | undefined
  if (!key) return false

  const userId = (request.user as { id: string }).id
  const cached = await app.prisma.idempotencyKey.findUnique({
    where: { key_userId: { key, userId } }
  })

  if (cached && Date.now() - cached.createdAt.getTime() < TTL_MS) {
    request.idempotencyKey = undefined // mark as served from cache
    reply.code(cached.responseStatus).send(cached.responseBody)
    return true
  }

  // Key is new — record it on the request so storeIdempotency can find it
  request.idempotencyKey = key
  return false
}

/**
 * Call after the handler computes its result, before sending.
 * Stores the response body under the idempotency key for 24 hours.
 * Errors are swallowed — idempotency storage must not fail the request.
 */
export async function storeIdempotency(
  app: FastifyInstance,
  request: FastifyRequest,
  responseStatus: number,
  responseBody: unknown
): Promise<void> {
  const key = request.idempotencyKey
  if (!key) return

  const userId = (request.user as { id: string }).id
  const endpoint = `${request.method}:${request.url}`

  app.prisma.idempotencyKey
    .create({ data: { key, userId, endpoint, responseStatus, responseBody: responseBody as object } })
    .catch((err) => {
      app.log.warn({ err, key }, 'idempotency store failed')
      captureFinancialException(err, 'idempotency.store', { key, userId, endpoint })
    })
}
