import type { PrismaClient } from '@prisma/client'
import { ForbiddenError } from '../errors/http-errors.js'

/** Roles that count as fully active circle members (can access data and take actions). */
export const ACTIVE_ROLES = new Set(['member', 'contributor', 'creator', 'admin'])

/**
 * Asserts that `userId` holds an active membership in `circleId`.
 * Throws ForbiddenError for missing rows, and for `pending` / `rejected` rows.
 * Returns the membership row on success.
 */
export async function assertActiveMembership(
  prisma: PrismaClient,
  circleId: string,
  userId: string
) {
  const membership = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId, userId } }
  })

  if (!membership) {
    throw new ForbiddenError('NOT_A_MEMBER', 'You must be a member of this circle')
  }

  if (membership.role === 'pending') {
    throw new ForbiddenError('MEMBERSHIP_PENDING', 'Your join request is still pending approval')
  }

  if (membership.role === 'rejected') {
    throw new ForbiddenError('MEMBERSHIP_REJECTED', 'Your join request was not approved')
  }

  return membership
}

/**
 * Count of fully active voting members in a circle (excludes pending / rejected).
 * Use this as the denominator for all quorum calculations.
 */
export async function countActiveMembers(
  prisma: PrismaClient,
  circleId: string
): Promise<number> {
  return prisma.circleMembership.count({
    where: {
      circleId,
      role: { in: ['member', 'contributor', 'creator', 'admin'] }
    }
  })
}
