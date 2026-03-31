import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const meRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.get('/me', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.user as { id: string; email: string; isGlobalAdmin: boolean }
    const user = await authService.getMe(id)
    return reply.send(user)
  })

  fastify.patch('/me', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 100 },
          country: { type: 'string', maxLength: 100 },
          sector: { type: 'string', maxLength: 100 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { id } = request.user as { id: string; email: string; isGlobalAdmin: boolean }
    const user = await authService.updateMe(id, request.body as Record<string, unknown>)
    return reply.send(user)
  })
}
