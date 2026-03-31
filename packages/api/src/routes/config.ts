import type { FastifyPluginAsync } from 'fastify'

export const configRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/config', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            demoMode: { type: 'boolean' },
            currency: { type: 'string' },
            escrowLabel: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const demoMode = fastify.config.DEMO_MODE === 'true'

    return reply.send({
      demoMode,
      currency: 'USD',
      escrowLabel: demoMode ? 'Simulated escrow \u2014 no real funds' : 'Live escrow'
    })
  })
}
