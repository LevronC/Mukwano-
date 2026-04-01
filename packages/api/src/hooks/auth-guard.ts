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
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      return reply.code(401).send({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Session expired',
          field: null,
          status: 401
        }
      })
    }
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
