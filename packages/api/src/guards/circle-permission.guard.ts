import type { FastifyRequest, FastifyReply } from 'fastify'

export type CircleRole = 'member' | 'contributor' | 'creator' | 'admin'

/**
 * PLACEHOLDER — Phase 2 will replace the body of this function.
 * Currently allows all authenticated requests through (AuthGuard handles auth).
 */
export function circlePermissionGuard(requiredRole: CircleRole) {
  return async function (_request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    void requiredRole
  }
}
