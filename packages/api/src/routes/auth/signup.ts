import type { FastifyPluginAsync } from 'fastify'
import { httpRateLimit } from '../../http-rate-limit-presets.js'
import { AuthService } from '../../services/auth.service.js'

export const signupRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/signup', {
    config: { rateLimit: httpRateLimit.signup },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          displayName: { type: 'string', minLength: 1, maxLength: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, displayName } = request.body as {
      email: string
      password: string
      displayName: string
    }
    const result = await authService.signup(email, password, displayName)
    return reply.code(201).send(result)
  })
}
