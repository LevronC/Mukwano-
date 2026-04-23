import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError } from '../errors/http-errors.js'
import { isGlobalPlatformAdmin } from '../lib/platform-role.js'

/**
 * DB-backed global admin check (do not rely on JWT alone for privilege).
 * Must run after `authGuard` so `request.user.id` is set.
 */
export function createRequireGlobalAdmin(app: FastifyInstance) {
  return async function requireGlobalAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const userId = (request.user as { id: string }).id
    const row = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { isGlobalAdmin: true, platformRole: true }
    })
    if (!isGlobalPlatformAdmin(row)) {
      throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
    }
  }
}
