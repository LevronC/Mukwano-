import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const verifyEmailRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)
  const userId = (req: { user: unknown }) => (req.user as { id: string }).id

  fastify.post('/verify-email', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string', minLength: 1, maxLength: 128 } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { token } = request.body as { token: string }
    await authService.verifyEmail(token)
    return reply.code(204).send()
  })

  fastify.post('/resend-verification', { preHandler: authGuard }, async (request, reply) => {
    await authService.resendVerification(userId(request))
    return reply.code(204).send()
  })
}
