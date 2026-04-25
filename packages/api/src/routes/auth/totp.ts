import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'

export const totpRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)
  const userId = (req: { user: unknown }) => (req.user as { id: string }).id

  fastify.post('/totp/setup', { preHandler: authGuard }, async (request, reply) => {
    const result = await authService.setupTotp(userId(request))
    return reply.send(result)
  })

  fastify.post('/totp/confirm', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string', minLength: 6, maxLength: 6 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { code } = request.body as { code: string }
    await authService.confirmTotp(userId(request), code)
    return reply.code(204).send()
  })

  fastify.delete('/totp', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string', minLength: 6, maxLength: 6 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { code } = request.body as { code: string }
    await authService.disableTotp(userId(request), code)
    return reply.code(204).send()
  })
}
