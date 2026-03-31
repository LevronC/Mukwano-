import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'
import { ContributionService } from '../services/contribution.service.js'

export const contributionsRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ContributionService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.addHook('preHandler', authGuard)

  fastify.post('/circles/:id/contributions', {
    schema: {
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', exclusiveMinimum: 0 },
          note: { type: 'string', maxLength: 1000 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { amount: number; note?: string }
    const contribution = await service.submitContribution(params.id, currentUserId(request), body.amount, body.note)
    return reply.code(201).send(contribution)
  })

  fastify.get('/circles/:id/contributions', async (request, reply) => {
    const params = request.params as { id: string }
    const query = request.query as { status?: string }
    const list = await service.listContributions(params.id, currentUserId(request), query.status)
    return reply.send(list)
  })

  fastify.get('/circles/:id/contributions/:cid', async (request, reply) => {
    const params = request.params as { id: string; cid: string }
    const item = await service.getContribution(params.id, params.cid, currentUserId(request))
    return reply.send(item)
  })

  fastify.patch('/circles/:id/contributions/:cid/verify', async (request, reply) => {
    const params = request.params as { id: string; cid: string }
    const result = await service.verifyContribution(params.id, params.cid, currentUserId(request))
    return reply.send(result)
  })

  fastify.patch('/circles/:id/contributions/:cid/reject', {
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string', minLength: 1, maxLength: 1000 } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; cid: string }
    const body = request.body as { reason: string }
    const result = await service.rejectContribution(params.id, params.cid, currentUserId(request), body.reason)
    return reply.send(result)
  })

  fastify.post('/circles/:id/contributions/:cid/proof', {
    schema: {
      body: {
        type: 'object',
        required: ['fileName', 'mimeType', 'sizeBytes'],
        properties: {
          fileName: { type: 'string', minLength: 1, maxLength: 255 },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer', minimum: 1 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; cid: string }
    const body = request.body as { fileName: string; mimeType: string; sizeBytes: number }
    const result = await service.createProofUploadUrl(params.id, params.cid, currentUserId(request), body.fileName, body.mimeType, body.sizeBytes)
    return reply.send(result)
  })

  fastify.post('/circles/:id/contributions/:cid/proof/confirm', {
    schema: {
      body: {
        type: 'object',
        required: ['fileKey', 'fileName', 'mimeType', 'sizeBytes'],
        properties: {
          fileKey: { type: 'string', minLength: 1 },
          fileName: { type: 'string', minLength: 1, maxLength: 255 },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer', minimum: 1 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; cid: string }
    const body = request.body as { fileKey: string; fileName: string; mimeType: string; sizeBytes: number }
    const result = await service.confirmProofUpload(params.id, params.cid, currentUserId(request), body.fileKey, body.fileName, body.mimeType, body.sizeBytes)
    return reply.code(201).send(result)
  })

  fastify.get('/circles/:id/contributions/:cid/proof/:proofId/view', async (request, reply) => {
    const params = request.params as { id: string; cid: string; proofId: string }
    const result = await service.getProofViewUrl(params.id, params.cid, params.proofId, currentUserId(request))
    return reply.send(result)
  })

  fastify.get('/circles/:id/ledger', async (request, reply) => {
    const params = request.params as { id: string }
    const query = request.query as { page?: number; pageSize?: number }
    const result = await service.listLedger(params.id, currentUserId(request), Number(query.page ?? 1), Number(query.pageSize ?? 20))
    return reply.send(result)
  })

  fastify.get('/circles/:id/treasury', async (request, reply) => {
    const params = request.params as { id: string }
    const result = await service.getTreasuryBalance(params.id, currentUserId(request))
    return reply.send(result)
  })
}
