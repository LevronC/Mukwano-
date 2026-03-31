import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.accessJwtVerify()
    const u = request.user as { id?: string; sub?: string; email: string; isGlobalAdmin: boolean }
    request.user = {
      id: u.id ?? u.sub ?? '',
      email: u.email,
      isGlobalAdmin: u.isGlobalAdmin
    }
  } catch {
    return reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        field: null,
        status: 401
      }
    })
  }
}
