import type { FastifyPluginAsync } from 'fastify'
import { httpRateLimit } from '../http-rate-limit-presets.js'
import { authGuard } from '../hooks/auth-guard.js'
import { requireEmailVerified } from '../hooks/require-email-verified.js'
import { ProposalService } from '../services/proposal.service.js'

export const proposalsRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ProposalService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.addHook('preHandler', authGuard)
  fastify.addHook('preHandler', requireEmailVerified)

  fastify.post('/circles/:id/proposals', {
    config: { rateLimit: httpRateLimit.financialMutation },
    schema: {
      body: {
        type: 'object',
        required: ['title', 'description', 'requestedAmount'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', minLength: 1, maxLength: 5000 },
          requestedAmount: { type: 'number', exclusiveMinimum: 0 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { title: string; description: string; requestedAmount: number }
    const proposal = await service.createProposal(params.id, currentUserId(request), body)
    return reply.code(201).send(proposal)
  })

  fastify.get('/circles/:id/proposals', async (request, reply) => {
    const params = request.params as { id: string }
    const proposals = await service.listProposals(params.id, currentUserId(request))
    return reply.send(proposals)
  })

  fastify.get('/circles/:id/proposals/:pid', async (request, reply) => {
    const params = request.params as { id: string; pid: string }
    const proposal = await service.getProposal(params.id, params.pid, currentUserId(request))
    return reply.send(proposal)
  })

  fastify.post('/circles/:id/proposals/:pid/vote', {
    config: { rateLimit: httpRateLimit.financialMutation },
    schema: {
      body: {
        type: 'object',
        required: ['vote'],
        properties: {
          vote: { type: 'string', enum: ['yes', 'no', 'abstain'] }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; pid: string }
    const body = request.body as { vote: string }
    const res = await service.castVote(params.id, params.pid, currentUserId(request), body.vote)
    return reply.code(201).send(res)
  })

  fastify.delete('/circles/:id/proposals/:pid', {
    config: { rateLimit: httpRateLimit.financialMutation }
  }, async (request, reply) => {
    const params = request.params as { id: string; pid: string }
    const proposal = await service.cancelProposal(params.id, params.pid, currentUserId(request))
    return reply.send(proposal)
  })

  fastify.post('/circles/:id/proposals/:pid/close', {
    config: { rateLimit: httpRateLimit.financialMutation }
  }, async (request, reply) => {
    const params = request.params as { id: string; pid: string }
    const proposal = await service.closeProposal(params.id, params.pid, currentUserId(request))
    return reply.send(proposal)
  })
}
