import type { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError } from '../errors/http-errors.js'

export type CircleRole = 'member' | 'contributor' | 'creator' | 'admin'

export function circlePermissionGuard(requiredRole: CircleRole) {
  const roleRank: Record<CircleRole, number> = {
    member: 1,
    contributor: 2,
    admin: 3,
    creator: 4
  }

  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, string | undefined>
    const circleId = params.id ?? params.circleId
    const userId = (request.user as { id?: string } | undefined)?.id

    if (!circleId || !userId) {
      throw new ForbiddenError('INSUFFICIENT_CONTEXT', 'Circle context and authenticated user are required')
    }

    const membership = await request.server.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true }
    })

    if (!membership) {
      throw new ForbiddenError('NOT_A_MEMBER', 'You must be a member of this circle')
    }

    const currentRank = roleRank[membership.role as CircleRole] ?? 0
    if (currentRank < roleRank[requiredRole]) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', `${requiredRole} role required`)
    }
  }
}
