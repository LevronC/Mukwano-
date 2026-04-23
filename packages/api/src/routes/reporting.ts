import type { FastifyPluginAsync } from 'fastify'
import { httpRateLimit } from '../http-rate-limit-presets.js'
import { authGuard } from '../hooks/auth-guard.js'
import { createRequireGlobalAdmin } from '../hooks/require-global-admin.js'
import { ReportingService } from '../services/reporting.service.js'
import { AnalyticsService } from '../services/analytics.service.js'
import { SupportService } from '../services/support.service.js'

export const reportingRoute: FastifyPluginAsync = async (fastify) => {
  const requireGlobalAdmin = createRequireGlobalAdmin(fastify)
  const auth = { preHandler: [authGuard] }
  const admin = { preHandler: [authGuard, requireGlobalAdmin] }

  const service = new ReportingService(fastify)
  const analytics = new AnalyticsService(fastify)
  const supportAdmin = new SupportService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.get('/portfolio', auth, async (request, reply) => {
    const data = await service.getPortfolio(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/portfolio/summary', auth, async (request, reply) => {
    const data = await service.getPortfolioSummary(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/dashboard', auth, async (request, reply) => {
    const data = await service.getDashboard(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/contributions/pending', admin, async (request, reply) => {
    const data = await service.getAdminPendingContributions(currentUserId(request))
    return reply.send(data)
  })

  fastify.patch(
    '/admin/contributions/:id/verify',
    { preHandler: [authGuard, requireGlobalAdmin], config: { rateLimit: httpRateLimit.financialMutation } },
    async (request, reply) => {
      const params = request.params as { id: string }
      const data = await service.verifyPendingContribution(currentUserId(request), params.id)
      return reply.send(data)
    }
  )

  fastify.patch(
    '/admin/contributions/:id/reject',
    {
      preHandler: [authGuard, requireGlobalAdmin],
      config: { rateLimit: httpRateLimit.financialMutation },
      schema: {
        body: {
          type: 'object',
          required: ['reason'],
          properties: { reason: { type: 'string', minLength: 1, maxLength: 1000 } },
          additionalProperties: false
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string }
      const body = request.body as { reason: string }
      const data = await service.rejectPendingContribution(currentUserId(request), params.id, body.reason)
      return reply.send(data)
    }
  )

  fastify.get('/admin/members', admin, async (request, reply) => {
    const data = await service.getAdminMembers(currentUserId(request))
    return reply.send(data)
  })

  fastify.patch(
    '/admin/members/:id/role',
    {
      preHandler: [authGuard, requireGlobalAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['isGlobalAdmin'],
          properties: { isGlobalAdmin: { type: 'boolean' } },
          additionalProperties: false
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string }
      const body = request.body as { isGlobalAdmin: boolean }
      const data = await service.setGlobalAdmin(currentUserId(request), params.id, body.isGlobalAdmin)
      return reply.send(data)
    }
  )

  fastify.get('/admin/ledger', admin, async (request, reply) => {
    const data = await service.getAdminLedger(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/activity', admin, async (request, reply) => {
    const data = await service.getAdminActivity(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/circles', admin, async (request, reply) => {
    const data = await service.getAdminCircles(currentUserId(request))
    return reply.send(data)
  })

  fastify.patch('/admin/circles/:id/disable', admin, async (request, reply) => {
    const params = request.params as { id: string }
    const data = await service.disableCircle(currentUserId(request), params.id)
    return reply.send(data)
  })

  fastify.delete('/admin/circles/:id', admin, async (request, reply) => {
    const params = request.params as { id: string }
    const data = await service.deleteCircle(currentUserId(request), params.id)
    return reply.send(data)
  })

  fastify.get('/admin/proposals', admin, async (request, reply) => {
    const data = await service.getAdminProposals(currentUserId(request))
    return reply.send(data)
  })

  fastify.patch('/admin/proposals/:id/disable', admin, async (request, reply) => {
    const params = request.params as { id: string }
    const data = await service.disableProposal(currentUserId(request), params.id)
    return reply.send(data)
  })

  fastify.delete('/admin/proposals/:id', admin, async (request, reply) => {
    const params = request.params as { id: string }
    const data = await service.deleteProposal(currentUserId(request), params.id)
    return reply.send(data)
  })

  fastify.get('/admin/metrics', admin, async (request, reply) => {
    const data = await service.getAdminMetrics(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/system-health', admin, async (request, reply) => {
    const data = await service.getAdminSystemHealth(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/analytics/user-growth', admin, async (request, reply) => {
    const q = request.query as { months?: string }
    const months = q.months ? Number.parseInt(q.months, 10) : 12
    const data = await analytics.userGrowth(currentUserId(request), months)
    return reply.send(data)
  })

  fastify.get('/admin/analytics/contributions-timeseries', admin, async (request, reply) => {
    const q = request.query as { months?: string }
    const months = q.months ? Number.parseInt(q.months, 10) : 12
    const data = await analytics.contributionsOverTime(currentUserId(request), months)
    return reply.send(data)
  })

  fastify.get('/admin/analytics/proposals-summary', admin, async (request, reply) => {
    const data = await analytics.proposalSuccessRate(currentUserId(request))
    return reply.send(data)
  })

  fastify.get('/admin/analytics/treasury-trends', admin, async (request, reply) => {
    const q = request.query as { months?: string }
    const months = q.months ? Number.parseInt(q.months, 10) : 12
    const data = await analytics.treasuryTrends(currentUserId(request), months)
    return reply.send(data)
  })

  fastify.get('/admin/support/flags', admin, async (request, reply) => {
    const q = request.query as { status?: string }
    const data = await supportAdmin.listFlags(currentUserId(request), q.status)
    return reply.send(data)
  })

  fastify.patch(
    '/admin/support/flags/:id',
    {
      preHandler: [authGuard, requireGlobalAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['open', 'triaged', 'closed'] } },
          additionalProperties: false
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string }
      const body = request.body as { status: string }
      const data = await supportAdmin.updateFlagStatus(currentUserId(request), params.id, body.status)
      return reply.send(data)
    }
  )
}
