import type { FastifyPluginAsync } from 'fastify'
import { httpRateLimit } from '../../http-rate-limit-presets.js'
import { AuthService } from '../../services/auth.service.js'

export const loginRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/login', {
    config: { rateLimit: httpRateLimit.login },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    const result = await authService.login(email, password)
    return reply.send(result)
  })
}
