import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyInstance } from 'fastify'
import { captureFinancialException } from '../lib/observability/sentry.js'

const TICK_MS = 60 * 1000

const deadlineCronPlugin: FastifyPluginAsync = fp(async (app) => {
  const tick = () => runDeadlineTick(app)

  const timer = setInterval(() => {
    tick().catch((err) => {
      app.log.error({ err }, 'deadline-cron tick crashed')
      captureFinancialException(err, 'deadline_cron.tick')
    })
  }, TICK_MS)

  tick().catch((err) => {
    app.log.error({ err }, 'deadline-cron startup tick failed')
    captureFinancialException(err, 'deadline_cron.startup')
  })
  app.addHook('onClose', async () => clearInterval(timer))
})

async function runDeadlineTick(app: FastifyInstance): Promise<void> {
  const expired = await app.prisma.proposal.findMany({
    where: { status: 'open', votingDeadline: { lte: new Date() } },
    select: { id: true, circleId: true }
  })
  if (expired.length === 0) return

  let closed = 0
  for (const p of expired) {
    try {
      await autoCloseProposal(app, p.circleId, p.id)
      closed++
    } catch (err) {
      app.log.error({ err, proposalId: p.id }, 'deadline-cron: failed to auto-close proposal')
      captureFinancialException(err, 'deadline_cron.auto_close', { proposalId: p.id, circleId: p.circleId })
    }
  }
  app.log.info({ closed }, 'deadline-cron: auto-closed expired proposals')
}

async function autoCloseProposal(app: FastifyInstance, circleId: string, proposalId: string): Promise<void> {
  await app.prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.findFirst({ where: { id: proposalId, circleId } })
    if (!proposal || proposal.status !== 'open') return

    const votes = await tx.vote.findMany({ where: { proposalId } })
    const eligible = await tx.circleMembership.count({ where: { circleId } })
    const gov = await tx.governanceConfig.findUnique({ where: { circleId } })
    if (!gov) return

    const cast = votes.length
    const yes = votes.filter((v) => v.vote === 'yes').length
    const no = votes.filter((v) => v.vote === 'no').length
    const abstain = votes.filter((v) => v.vote === 'abstain').length

    const quorumRatio = eligible === 0 ? 0 : (cast / eligible) * 100
    const quorumMet = quorumRatio >= gov.quorumPercent
    const approvalRatio = cast === 0 ? 0 : (yes / cast) * 100
    const passed = quorumMet && approvalRatio >= gov.approvalPercent

    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: passed ? 'closed_passed' : 'closed_failed',
        quorumMet,
        finalYes: yes,
        finalNo: no,
        finalAbstain: abstain,
        closedAt: new Date()
      }
    })
    await tx.auditLog.create({
      data: {
        circleId,
        actorId: null,
        entityType: 'proposal',
        action: passed ? 'PROPOSAL_CLOSED_PASSED' : 'PROPOSAL_CLOSED_FAILED',
        metadata: { proposalId, yes, no, abstain, quorumMet, triggeredBy: 'system' }
      }
    })
  })
}

export { deadlineCronPlugin }
