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

  fastify.get(
    '/exchange/pair',
    {
      preHandler: [authGuard],
      schema: {
        querystring: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: { type: 'string', minLength: 3, maxLength: 3 },
            to: { type: 'string', minLength: 3, maxLength: 3 }
          }
        }
      }
    },
    async (request, reply) => {
      const { from, to } = request.query as { from: string; to: string }
      const data = await service.getPair(from, to)
      return reply.send(data)
    }
  )
}
