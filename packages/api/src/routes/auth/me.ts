import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const meRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)
  const userId = (req: { user: unknown }) => (req.user as { id: string }).id

  fastify.get('/me', { preHandler: authGuard }, async (request, reply) => {
    const user = await authService.getMe(userId(request))
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
          sector: { type: 'string', maxLength: 100 },
          avatarUrl: { type: 'string', maxLength: 200000 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const user = await authService.updateMe(userId(request), request.body as Record<string, unknown>)
    return reply.send(user)
  })

  fastify.get('/me/circles', { preHandler: authGuard }, async (request, reply) => {
    const memberships = await authService.getMyCircles(userId(request))
    return reply.send(memberships)
  })

  fastify.post('/me/change-password', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string }
    await authService.changePassword(userId(request), currentPassword, newPassword)
    return reply.code(204).send()
  })

  fastify.delete('/me', { preHandler: authGuard }, async (request, reply) => {
    await authService.deleteAccount(userId(request))
    return reply.code(204).send()
  })
}
