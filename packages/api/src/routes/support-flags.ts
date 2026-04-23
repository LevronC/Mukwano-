import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'
import { SupportService } from '../services/support.service.js'

/** Authenticated users can submit support flags (admin triage via `/admin/support/flags`). */
export const supportFlagsRoute: FastifyPluginAsync = async (fastify) => {
  const service = new SupportService(fastify)
  const userId = (request: { user: unknown }) => (request.user as { id: string }).id

  fastify.post(
    '/support/flags',
    {
      preHandler: authGuard,
      schema: {
        body: {
          type: 'object',
          required: ['reason'],
          properties: {
            subjectUserId: { type: 'string', format: 'uuid' },
            reason: { type: 'string', minLength: 1, maxLength: 2000 },
            metadata: { type: 'object' }
          },
          additionalProperties: false
        }
      }
    },
    async (request, reply) => {
      const body = request.body as { subjectUserId?: string; reason: string; metadata?: object }
      const row = await service.createFlag(userId(request), {
        subjectUserId: body.subjectUserId ?? null,
        reason: body.reason,
        metadata: body.metadata
      })
      return reply.code(201).send(row)
    }
  )
}
