import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const logoutRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/logout', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    await authService.logout(refreshToken)
    return reply.code(200).send({ message: 'Logged out successfully' })
  })
}
