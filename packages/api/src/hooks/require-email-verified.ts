import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Must run after authGuard. Blocks routes for users whose email is not yet verified.
 * The emailVerified claim in the JWT is set at token issuance time, so it is safe
 * to use here without an extra DB lookup.
 */
export async function requireEmailVerified(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user as { emailVerified?: boolean; email?: string }
  if (!user.emailVerified) {
    return reply.code(403).send({
      error: {
        code: 'EMAIL_UNVERIFIED',
        message: 'Please verify your email address before performing this action',
        field: null,
        status: 403,
      },
    })
  }
}
