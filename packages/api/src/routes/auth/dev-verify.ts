import type { FastifyPluginAsync } from 'fastify'

/**
 * Test-only endpoint: marks a user's email as verified without a real token.
 * Strictly gated to non-production environments. Never registered in production.
 */
export const devVerifyRoute: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === 'production') return

  fastify.post('/auth/dev-verify', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { email } = request.body as { email: string }
    const user = await fastify.prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    await fastify.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
    return reply.code(204).send()
  })
}
