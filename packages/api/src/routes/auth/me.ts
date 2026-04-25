import type { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service.js'
import { authGuard } from '../../hooks/auth-guard.js'
import { requireStepUp } from '../../hooks/require-step-up.js'
import { ValidationError } from '../../errors/http-errors.js'

export const meRoute: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)
  const userId = (req: { user: unknown }) => (req.user as { id: string }).id

  fastify.get('/me', { preHandler: authGuard }, async (request, reply) => {
    const user = await authService.getMe(userId(request))
    return reply.send(user)
  })

  fastify.get('/me/residence-peer-count', { preHandler: authGuard }, async (request) => {
    const { residenceCountry, residenceRegion: rawRegion } = request.query as {
      residenceCountry?: string
      residenceRegion?: string
    }
    if (!residenceCountry || residenceCountry.length > 100) {
      throw new ValidationError('residenceCountry is required', 'residenceCountry')
    }
    const residenceRegion = rawRegion && rawRegion.length > 0 ? rawRegion : null
    return authService.countPeersAtResidence(residenceCountry, residenceRegion)
  })

  fastify.patch('/me', {
    preHandler: authGuard,
    schema: {
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 100 },
          country: { anyOf: [{ type: 'string', maxLength: 100 }, { type: 'null' }] },
          residenceCountry: { type: 'string', maxLength: 100 },
          residenceRegion: { anyOf: [{ type: 'string', maxLength: 100 }, { type: 'null' }] },
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
    preHandler: [authGuard, requireStepUp],
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

  fastify.delete('/me', { preHandler: [authGuard, requireStepUp] }, async (request, reply) => {
    await authService.deactivateAccount(userId(request))
    return reply.code(204).send()
  })
}
