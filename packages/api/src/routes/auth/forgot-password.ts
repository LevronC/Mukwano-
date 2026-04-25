import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { httpRateLimit } from '../../http-rate-limit-presets.js'

export const forgotPasswordRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/forgot-password', {
    config: { rateLimit: httpRateLimit.forgotPassword },
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email', maxLength: 255 } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { email } = request.body as { email: string }
    await authService.forgotPassword(email)
    return reply.code(204).send()
  })

  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string', minLength: 1, maxLength: 128 },
          newPassword: { type: 'string', minLength: 8, maxLength: 128 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string }
    await authService.resetPassword(token, newPassword)
    return reply.code(204).send()
  })
}
