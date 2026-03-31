import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'

export const refreshRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/refresh', {
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
    const result = await authService.refresh(refreshToken)
    return reply.send(result)
  })
}
