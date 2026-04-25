import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'
import { httpRateLimit } from '../../http-rate-limit-presets.js'

export const stepUpRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)
  const userId = (req: { user: unknown }) => (req.user as { id: string }).id

  fastify.post('/step-up', {
    preHandler: authGuard,
    config: { rateLimit: httpRateLimit.stepUp },
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
    const result = await authService.issueStepUpToken(userId(request), code)
    return reply.send(result)
  })
}
