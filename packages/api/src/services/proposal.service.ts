import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'
import { isGlobalPlatformAdmin } from '../lib/platform-role.js'
import { assertActiveMembership, countActiveMembers } from '../lib/membership.js'
import { NotificationService } from './notification.service.js'

type MembershipRole = 'member' | 'contributor' | 'creator' | 'admin'
const ROLE_RANK: Record<MembershipRole, number> = {
  member: 1,
  contributor: 2,
  creator: 3,
  admin: 4
}

const VALID_VOTES = new Set(['yes', 'no', 'abstain'])

export class ProposalService {
  private readonly notifications: NotificationService
  constructor(private readonly app: FastifyInstance) {
    this.notifications = new NotificationService(app)
  }

  async createProposal(circleId: string, userId: string, input: { title: string; description: string; requestedAmount: number }) {
    const membership = await this.ensureMember(circleId, userId)
    const governance = await this.app.prisma.governanceConfig.findUnique({ where: { circleId } })
    if (!governance) throw new NotFoundError('Governance config not found')

    const minRole = (governance.whoCanPropose as MembershipRole) || 'contributor'
    if (ROLE_RANK[membership.role as MembershipRole] < ROLE_RANK[minRole]) {
      throw new ForbiddenError('INSUFFICIENT_ROLE_TO_PROPOSE', 'Your role cannot create proposals in this circle')
    }

    if (input.requestedAmount <= 0) {
      throw new ValidationError('Requested amount must be greater than 0', 'requestedAmount')
    }

    const now = Date.now()
    const deadline = new Date(now + governance.proposalDurationDays * 24 * 60 * 60 * 1000)

    const proposal = await this.app.prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          circleId,
          createdBy: userId,
          title: input.title,
          description: input.description,
          requestedAmount: new Prisma.Decimal(input.requestedAmount),
          votingDeadline: deadline
        }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'proposal',
          action: 'PROPOSAL_CREATED',
          metadata: { proposalId: created.id, title: created.title }
        }
      })
      return created
    })

    // Notify all circle members after commit — fire-and-forget, never blocks the response
    this.notifications.createForCircle(
      circleId,
      'NEW_PROPOSAL',
      `New proposal: "${proposal.title}" — voting closes ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    ).catch((err) => this.app.log.error({ err, proposalId: proposal.id }, 'notification.createForCircle failed silently'))

    return proposal
  }

  async listProposals(circleId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    return this.app.prisma.proposal.findMany({
      where: { circleId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        requestedAmount: true,
        votingDeadline: true,
        createdAt: true,
        finalYes: true,
        finalNo: true,
        finalAbstain: true
      }
    })
  }

  async getProposal(circleId: string, proposalId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    const proposal = await this.app.prisma.proposal.findFirst({
      where: { id: proposalId, circleId },
      include: { votes: true }
    })
    if (!proposal) throw new NotFoundError('Proposal not found')

    const yes = proposal.votes.filter((v) => v.vote === 'yes').length
    const no = proposal.votes.filter((v) => v.vote === 'no').length
    const abstain = proposal.votes.filter((v) => v.vote === 'abstain').length

    return {
      ...proposal,
      voteSummary: {
        cast: proposal.votes.length,
        yes,
        no,
        abstain
      }
    }
  }

  async castVote(circleId: string, proposalId: string, userId: string, vote: string) {
    await this.ensureMember(circleId, userId)
    if (!VALID_VOTES.has(vote)) throw new ValidationError('Invalid vote value', 'vote')

    const proposal = await this.app.prisma.proposal.findFirst({ where: { id: proposalId, circleId } })
    if (!proposal) throw new NotFoundError('Proposal not found')
    if (proposal.status !== 'open') throw new ConflictError('PROPOSAL_NOT_OPEN', 'Proposal is not open for voting')
    if (proposal.votingDeadline.getTime() <= Date.now()) {
      throw new ConflictError('PROPOSAL_VOTING_CLOSED', 'Voting deadline has passed')
    }

    try {
      return await this.app.prisma.$transaction(async (tx) => {
        const createdVote = await tx.vote.create({
          data: {
            proposalId,
            userId,
            vote
          }
        })
        await tx.auditLog.create({
          data: {
            circleId,
            actorId: userId,
            entityType: 'proposal',
            action: 'VOTE_CAST',
            metadata: { proposalId, vote }
          }
        })
        return createdVote
      })
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('DUPLICATE_VOTE', 'User has already voted on this proposal')
      }
      throw error
    }
  }

  async cancelProposal(circleId: string, proposalId: string, userId: string) {
    const proposal = await this.app.prisma.proposal.findFirst({ where: { id: proposalId, circleId } })
    if (!proposal) throw new NotFoundError('Proposal not found')
    if (proposal.status !== 'open') throw new ConflictError('PROPOSAL_NOT_OPEN', 'Only open proposals can be cancelled')

    const membership = await this.ensureMember(circleId, userId)
    const isAdmin = ROLE_RANK[membership.role as MembershipRole] >= ROLE_RANK.creator
    const isProposer = proposal.createdBy === userId
    if (!isAdmin && !isProposer) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Only proposer or admin can cancel proposal')
    }

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          closedAt: new Date()
        }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'proposal',
          action: 'PROPOSAL_CANCELLED',
          metadata: { proposalId: proposal.id }
        }
      })
      return updated
    })
  }

  async closeProposal(circleId: string, proposalId: string, userId: string) {
    await this.ensureAdmin(circleId, userId)

    const result = await this.app.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, circleId } })
      if (!proposal) throw new NotFoundError('Proposal not found')
      if (proposal.status !== 'open') throw new ConflictError('PROPOSAL_NOT_OPEN', 'Only open proposals can be closed')

      const votes = await tx.vote.findMany({ where: { proposalId: proposal.id } })
      const eligible = await countActiveMembers(tx as never, circleId)
      const cast = votes.length
      const yes = votes.filter((v: { vote: string }) => v.vote === 'yes').length
      const no = votes.filter((v: { vote: string }) => v.vote === 'no').length
      const abstain = votes.filter((v: { vote: string }) => v.vote === 'abstain').length

      const gov = await tx.governanceConfig.findUnique({ where: { circleId } })
      if (!gov) throw new NotFoundError('Governance config not found')

      const quorumRatio = eligible === 0 ? 0 : (cast / eligible) * 100
      const quorumMet = quorumRatio >= gov.quorumPercent
      const approvalRatio = cast === 0 ? 0 : (yes / cast) * 100
      const passed = quorumMet && approvalRatio >= gov.approvalPercent

      const updated = await tx.proposal.update({
        where: { id: proposal.id },
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
          actorId: userId,
          entityType: 'proposal',
          action: passed ? 'PROPOSAL_CLOSED_PASSED' : 'PROPOSAL_CLOSED_FAILED',
          metadata: { proposalId: proposal.id, yes, no, abstain, quorumMet }
        }
      })
      return { updated, passed, proposal }
    })

    const resultLine = result.passed
      ? `✓ Passed — ${result.proposal.title} (${result.updated.finalYes} yes / ${result.updated.finalNo} no)`
      : `✗ Failed — ${result.proposal.title} (quorum ${result.updated.quorumMet ? 'met' : 'not met'})`

    this.notifications.createForCircle(circleId, result.passed ? 'PROPOSAL_PASSED' : 'PROPOSAL_FAILED', resultLine)
      .catch((err) => this.app.log.error({ err, proposalId: result.proposal.id }, 'notification.createForCircle failed silently'))

    return result.updated
  }

  async adminDisableProposal(requestUserId: string, circleId: string, proposalId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, circleId } })
      if (!proposal) throw new NotFoundError('Proposal not found')
      const updated = await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: 'cancelled', cancelledAt: new Date(), closedAt: new Date() }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: requestUserId,
          entityType: 'proposal',
          action: 'PROPOSAL_DISABLED',
          metadata: { proposalId: proposal.id }
        }
      })
      return updated
    })
  }

  async adminDeleteProposal(requestUserId: string, circleId: string, proposalId: string) {
    await this.ensureGlobalAdmin(requestUserId)
    await this.app.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, circleId }, select: { id: true, status: true } })
      if (!proposal) throw new NotFoundError('Proposal not found')
      // Soft-archive: preserve audit trail and ledger integrity. Hard-delete is forbidden.
      await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: 'archived', closedAt: new Date() }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: requestUserId,
          entityType: 'proposal',
          action: 'PROPOSAL_ARCHIVED',
          metadata: { proposalId, previousStatus: proposal.status }
        }
      })
    })
    return { ok: true }
  }

  private async ensureMember(circleId: string, userId: string) {
    return assertActiveMembership(this.app.prisma, circleId, userId)
  }

  private async ensureAdmin(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (ROLE_RANK[membership.role as MembershipRole] < ROLE_RANK.creator) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Admin or creator role required')
    }
    return membership
  }

  private async ensureGlobalAdmin(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { isGlobalAdmin: true, platformRole: true }
    })
    if (!isGlobalPlatformAdmin(user)) {
      throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
    }
  }
}
