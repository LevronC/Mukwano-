import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'
import { ReportingService } from '../services/reporting.service.js'

export const reportingRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ReportingService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.addHook('preHandler', authGuard)

  fastify.get('/portfolio', async (request, reply) => {
    const data = await service.getPortfolio(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/portfolio/summary', async (request, reply) => {
    const data = await service.getPortfolioSummary(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/dashboard', async (request, reply) => {
    const data = await service.getDashboard(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/contributions/pending', async (request, reply) => {
    const data = await service.getAdminPendingContributions(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/members', async (request, reply) => {
    const data = await service.getAdminMembers(currentUserId(request))
    return reply.send(data)
  })

  fastify.patch('/admin/members/:id/role', {
    schema: {
      body: {
        type: 'object',
        required: ['isGlobalAdmin'],
        properties: { isGlobalAdmin: { type: 'boolean' } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { isGlobalAdmin: boolean }
    const data = await service.setGlobalAdmin(currentUserId(request), params.id, body.isGlobalAdmin)
    return reply.send(data)
  })

  fastify.get('/admin/ledger', async (request, reply) => {
    const data = await service.getAdminLedger(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/activity', async (request, reply) => {
    const data = await service.getAdminActivity(currentUserId(request))
    return reply.send(data)
  })
}
