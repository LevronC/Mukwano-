import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'

type MembershipRole = 'member' | 'contributor' | 'creator' | 'admin'
const ROLE_RANK: Record<MembershipRole, number> = {
  member: 1,
  contributor: 2,
  creator: 3,
  admin: 4
}

const VALID_VOTES = new Set(['yes', 'no', 'abstain'])

export class ProposalService {
  constructor(private readonly app: FastifyInstance) {}

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

    return this.app.prisma.proposal.create({
      data: {
        circleId,
        createdBy: userId,
        title: input.title,
        description: input.description,
        requestedAmount: new Prisma.Decimal(input.requestedAmount),
        votingDeadline: deadline
      }
    })
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
      return await this.app.prisma.vote.create({
        data: {
          proposalId,
          userId,
          vote
        }
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

    return this.app.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        closedAt: new Date()
      }
    })
  }

  async closeProposal(circleId: string, proposalId: string, userId: string) {
    await this.ensureAdmin(circleId, userId)

    return this.app.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, circleId } })
      if (!proposal) throw new NotFoundError('Proposal not found')
      if (proposal.status !== 'open') throw new ConflictError('PROPOSAL_NOT_OPEN', 'Only open proposals can be closed')

      const votes = await tx.vote.findMany({ where: { proposalId: proposal.id } })
      const eligible = await tx.circleMembership.count({ where: { circleId } })
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

      return tx.proposal.update({
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
    })
  }

  private async ensureMember(circleId: string, userId: string) {
    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })
    if (!membership) throw new ForbiddenError('NOT_A_MEMBER', 'You must be a member of this circle')
    return membership
  }

  private async ensureAdmin(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (ROLE_RANK[membership.role as MembershipRole] < ROLE_RANK.creator) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Admin or creator role required')
    }
    return membership
  }
}
