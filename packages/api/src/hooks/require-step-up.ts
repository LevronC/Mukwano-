import type { FastifyRequest, FastifyReply } from 'fastify'

const STEP_UP_TTL_S = 300

/**
 * Must run after authGuard. Requires a valid step-up token (TOTP verified within last 5 min).
 * If TOTP is not yet enabled for the user, the check is skipped (Phase 1: TOTP optional).
 */
export async function requireStepUp(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user as { totpEnabled?: boolean; stepUpAt?: number }
  if (!user.totpEnabled) return

  const now = Math.floor(Date.now() / 1000)
  if (!user.stepUpAt || now - user.stepUpAt > STEP_UP_TTL_S) {
    return reply.code(403).send({
      error: {
        code: 'STEP_UP_REQUIRED',
        message: 'This action requires step-up authentication. Please verify with your authenticator app.',
        action: 'step_up_required',
        field: null,
        status: 403,
      },
    })
  }
}
