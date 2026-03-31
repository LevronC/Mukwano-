import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'
import { ProjectService } from '../services/project.service.js'

export const projectsRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ProjectService(fastify)
  const currentUserId = (request: { user: unknown }) =>
    (request.user as { id: string; email: string; isGlobalAdmin: boolean }).id

  fastify.addHook('preHandler', authGuard)

  fastify.post('/circles/:id/projects', {
    schema: {
      body: {
        type: 'object',
        required: ['proposalId'],
        properties: { proposalId: { type: 'string', minLength: 1 } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { proposalId: string }
    const project = await service.createFromPassedProposal(params.id, currentUserId(request), body.proposalId)
    return reply.code(201).send(project)
  })

  fastify.get('/circles/:id/projects', async (request, reply) => {
    const params = request.params as { id: string }
    const projects = await service.listProjects(params.id, currentUserId(request))
    return reply.send(projects)
  })

  fastify.get('/circles/:id/projects/:projId', async (request, reply) => {
    const params = request.params as { id: string; projId: string }
    const project = await service.getProject(params.id, params.projId, currentUserId(request))
    return reply.send(project)
  })

  fastify.patch('/circles/:id/projects/:projId', {
    schema: {
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'executing', 'complete', 'cancelled'] }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; projId: string }
    const body = request.body as { status: 'approved'|'executing'|'complete'|'cancelled' }
    const project = await service.transitionStatus(params.id, params.projId, currentUserId(request), body.status)
    return reply.send(project)
  })

  fastify.post('/circles/:id/projects/:projId/updates', {
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 5000 },
          percentComplete: { type: 'integer', minimum: 0, maximum: 100 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const params = request.params as { id: string; projId: string }
    const body = request.body as { content: string; percentComplete?: number }
    const update = await service.postUpdate(params.id, params.projId, currentUserId(request), body.content, body.percentComplete)
    return reply.code(201).send(update)
  })

  fastify.get('/circles/:id/projects/:projId/updates', async (request, reply) => {
    const params = request.params as { id: string; projId: string }
    const updates = await service.listUpdates(params.id, params.projId, currentUserId(request))
    return reply.send(updates)
  })
}
