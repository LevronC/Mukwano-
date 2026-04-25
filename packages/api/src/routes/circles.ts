import type { FastifyPluginAsync } from 'fastify'
import { ONBOARDING_COUNTRY_NAMES, ONBOARDING_SECTOR_LABELS } from '../constants/circle-choices.js'
import { authGuard } from '../hooks/auth-guard.js'
import { requireEmailVerified } from '../hooks/require-email-verified.js'
import { CircleService } from '../services/circle.service.js'

const roleEnum = ['member', 'contributor', 'creator', 'admin']

export const circlesRoute: FastifyPluginAsync = async (fastify) => {
  const circleService = new CircleService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.post('/circles', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'goalAmount'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', maxLength: 2000 },
          country: { type: 'string', enum: [...ONBOARDING_COUNTRY_NAMES] },
          sector: { type: 'string', enum: [...ONBOARDING_SECTOR_LABELS] },
          coverImageUrl: { anyOf: [{ type: 'string', maxLength: 8200000 }, { type: 'null' }] },
          goalAmount: { type: 'number', exclusiveMinimum: 0 },
          governance: {
            type: 'object',
            properties: {
              minContribution: { type: 'number', minimum: 0 },
              votingModel: { type: 'string' },
              quorumPercent: { type: 'integer', minimum: 1, maximum: 100 },
              approvalPercent: { type: 'integer', minimum: 1, maximum: 100 },
              proposalDurationDays: { type: 'integer', minimum: 1 },
              whoCanPropose: { type: 'string', enum: roleEnum },
              requireProof: { type: 'boolean' }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    },
    preHandler: [authGuard, requireEmailVerified]
  }, async (request, reply) => {
    const circle = await circleService.createCircle(currentUserId(request), request.body as any)
    return reply.code(201).send(circle)
  })

  // Public route — no auth required
  fastify.get('/circles', async (_request, reply) => {
    const circles = await circleService.listCircles()
    return reply.send(circles)
  })

  fastify.get('/circles/my-requests', { preHandler: [authGuard] }, async (request, reply) => {
    const requests = await circleService.listMyJoinRequests(currentUserId(request))
    return reply.send(requests)
  })

  fastify.get('/circles/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const circle = await circleService.getCircleOverview(params.id, currentUserId(request))
    return reply.send(circle)
  })

  fastify.patch('/circles/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          description: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
          coverImageUrl: { anyOf: [{ type: 'string', maxLength: 8200000 }, { type: 'null' }] },
          goalAmount: { type: 'number', exclusiveMinimum: 0 }
        },
        additionalProperties: false
      }
    },
    preHandler: [authGuard]
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const updated = await circleService.updateCircle(
      params.id,
      currentUserId(request),
      request.body as Record<string, unknown>
    )
    return reply.send(updated)
  })

  fastify.patch('/circles/:id/governance', {
    schema: {
      body: {
        type: 'object',
        properties: {
          minContribution: { type: 'number', minimum: 0 },
          votingModel: { type: 'string' },
          quorumPercent: { type: 'integer', minimum: 1, maximum: 100 },
          approvalPercent: { type: 'integer', minimum: 1, maximum: 100 },
          proposalDurationDays: { type: 'integer', minimum: 1 },
          whoCanPropose: { type: 'string', enum: roleEnum },
          requireProof: { type: 'boolean' }
        },
        additionalProperties: false
      }
    },
    preHandler: [authGuard]
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const updated = await circleService.updateGovernance(
      params.id,
      currentUserId(request),
      request.body as Record<string, unknown>
    )
    return reply.send(updated)
  })

  fastify.get('/circles/:id/permissions', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const permissions = await circleService.getPermissions(params.id, currentUserId(request))
    return reply.send(permissions)
  })

  fastify.post('/circles/:id/close', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const updated = await circleService.closeCircle(params.id, currentUserId(request))
    return reply.send(updated)
  })

  fastify.post('/circles/:id/join', { preHandler: [authGuard, requireEmailVerified] }, async (request, reply) => {
    const params = request.params as { id: string }
    const membership = await circleService.joinCircle(params.id, currentUserId(request))
    return reply.code(201).send(membership)
  })

  fastify.post('/circles/:id/join-request', { preHandler: [authGuard, requireEmailVerified] }, async (request, reply) => {
    const params = request.params as { id: string }
    const membership = await circleService.requestJoinCircle(params.id, currentUserId(request))
    return reply.code(201).send(membership)
  })

  fastify.post('/circles/:id/leave', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const result = await circleService.leaveCircle(params.id, currentUserId(request))
    return reply.send(result)
  })

  fastify.get('/circles/:id/members', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const members = await circleService.listMembers(params.id, currentUserId(request))
    return reply.send(members)
  })

  fastify.get('/circles/:id/join-requests', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string }
    const requests = await circleService.listJoinRequests(params.id, currentUserId(request))
    return reply.send(requests)
  })

  fastify.patch('/circles/:id/join-requests/:userId/approve', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string; userId: string }
    const updated = await circleService.approveJoinRequest(params.id, currentUserId(request), params.userId)
    return reply.send(updated)
  })

  fastify.delete('/circles/:id/join-requests/:userId/reject', { preHandler: [authGuard] }, async (request, reply) => {
    const params = request.params as { id: string; userId: string }
    const result = await circleService.rejectJoinRequest(params.id, currentUserId(request), params.userId)
    return reply.send(result)
  })

  fastify.patch('/circles/:id/members/:userId/role', {
    schema: {
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: roleEnum }
        },
        additionalProperties: false
      }
    },
    preHandler: [authGuard]
  }, async (request, reply) => {
    const params = request.params as { id: string; userId: string }
    const body = request.body as { role: 'member' | 'contributor' | 'creator' | 'admin' }
    const updated = await circleService.updateMemberRole(
      params.id,
      currentUserId(request),
      params.userId,
      body.role
    )
    return reply.send(updated)
  })
}
