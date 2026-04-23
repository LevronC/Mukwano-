import type { FastifyPluginAsync } from 'fastify'
import { authGuard } from '../hooks/auth-guard.js'
import { ExchangeService } from '../services/exchange.service.js'

export const exchangeRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ExchangeService(fastify)

  fastify.get(
    '/exchange/dashboard',
    { preHandler: [authGuard] },
    async (request, reply) => {
      const userId = (request.user as { id: string }).id
      const data = await service.getDashboardExchange(userId)
      return reply.send(data)
    }
  )
}
