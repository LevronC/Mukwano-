import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'

export const notificationsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authGuard)

  fastify.get('/notifications', async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const result = await fastify.notificationService.list(userId)
    return reply.send(result)
  })

  fastify.patch('/notifications/read-all', async (request, reply) => {
    const userId = (request.user as { id: string }).id
    await fastify.notificationService.markAllRead(userId)
    return reply.code(204).send()
  })
}
