import type { FastifyInstance } from 'fastify'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'

type MembershipRole = 'member' | 'contributor' | 'creator' | 'admin'

const ADMIN_ROLES: MembershipRole[] = ['creator', 'admin']

export class CircleService {
  constructor(private readonly app: FastifyInstance) {}

  async createCircle(userId: string, input: {
    name: string
    description?: string
    goalAmount: number
    governance?: {
      minContribution?: number
      votingModel?: string
      quorumPercent?: number
      approvalPercent?: number
      proposalDurationDays?: number
      whoCanPropose?: string
      requireProof?: boolean
    }
  }) {
    if (input.goalAmount <= 0) {
      throw new ValidationError('Goal amount must be greater than 0', 'goalAmount')
    }

    const result = await this.app.prisma.$transaction(async (tx) => {
      const circle = await tx.circle.create({
        data: {
          name: input.name,
          description: input.description,
          goalAmount: input.goalAmount,
          createdBy: userId
        }
      })

      await tx.governanceConfig.create({
        data: {
          circleId: circle.id,
          minContribution: input.governance?.minContribution ?? 0,
          votingModel: input.governance?.votingModel ?? 'one_member_one_vote',
          quorumPercent: input.governance?.quorumPercent ?? 51,
          approvalPercent: input.governance?.approvalPercent ?? 51,
          proposalDurationDays: input.governance?.proposalDurationDays ?? 7,
          whoCanPropose: input.governance?.whoCanPropose ?? 'contributor',
          requireProof: input.governance?.requireProof ?? true
        }
      })

      await tx.circleMembership.create({
        data: {
          circleId: circle.id,
          userId,
          role: 'creator'
        }
      })

      return circle
    })

    return result
  }

  async listCircles() {
    return this.app.prisma.circle.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        goalAmount: true,
        currency: true,
        status: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true
      }
    })
  }

  async getCircleOverview(circleId: string, userId: string) {
    const circle = await this.app.prisma.circle.findUnique({
      where: { id: circleId },
      include: { governanceConfig: true }
    })

    if (!circle) throw new NotFoundError('Circle not found')

    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })

    return { ...circle, membershipRole: membership?.role ?? null }
  }

  async updateCircle(circleId: string, userId: string, body: Record<string, unknown>) {
    await this.ensureAdmin(circleId, userId)

    const data: { name?: string; description?: string | null; goalAmount?: number } = {}

    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.description === 'string') data.description = body.description
    if (body.description === null) data.description = null
    if (typeof body.goalAmount === 'number') {
      if (body.goalAmount <= 0) throw new ValidationError('Goal amount must be greater than 0', 'goalAmount')
      data.goalAmount = body.goalAmount
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No valid fields provided')
    }

    return this.app.prisma.circle.update({ where: { id: circleId }, data })
  }

  async updateGovernance(circleId: string, userId: string, body: Record<string, unknown>) {
    await this.ensureAdmin(circleId, userId)

    const data: {
      minContribution?: number
      votingModel?: string
      quorumPercent?: number
      approvalPercent?: number
      proposalDurationDays?: number
      whoCanPropose?: MembershipRole
      requireProof?: boolean
    } = {}

    if (typeof body.minContribution === 'number') {
      if (body.minContribution < 0) throw new ValidationError('minContribution must be 0 or higher', 'minContribution')
      data.minContribution = body.minContribution
    }
    if (typeof body.votingModel === 'string') data.votingModel = body.votingModel
    if (typeof body.quorumPercent === 'number') {
      if (body.quorumPercent < 1 || body.quorumPercent > 100) throw new ValidationError('quorumPercent must be 1-100', 'quorumPercent')
      data.quorumPercent = body.quorumPercent
    }
    if (typeof body.approvalPercent === 'number') {
      if (body.approvalPercent < 1 || body.approvalPercent > 100) throw new ValidationError('approvalPercent must be 1-100', 'approvalPercent')
      data.approvalPercent = body.approvalPercent
    }
    if (typeof body.proposalDurationDays === 'number') {
      if (body.proposalDurationDays < 1) throw new ValidationError('proposalDurationDays must be at least 1', 'proposalDurationDays')
      data.proposalDurationDays = body.proposalDurationDays
    }
    if (typeof body.whoCanPropose === 'string') {
      if (!['member', 'contributor', 'creator', 'admin'].includes(body.whoCanPropose)) {
        throw new ValidationError('Invalid role for whoCanPropose', 'whoCanPropose')
      }
      data.whoCanPropose = body.whoCanPropose as MembershipRole
    }
    if (typeof body.requireProof === 'boolean') data.requireProof = body.requireProof

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No valid governance fields provided')
    }

    await this.ensureCircleExists(circleId)
    return this.app.prisma.governanceConfig.update({
      where: { circleId },
      data
    })
  }

  async getPermissions(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    const isAdmin = ADMIN_ROLES.includes(membership.role as MembershipRole)
    return {
      role: membership.role,
      canManageCircle: isAdmin,
      canManageGovernance: isAdmin,
      canManageMembers: isAdmin,
      canVerifyContributions: isAdmin,
      canCreateProposal: ['contributor', 'creator', 'admin'].includes(membership.role),
      canCreateContribution: true
    }
  }

  async closeCircle(circleId: string, userId: string) {
    await this.ensureAdmin(circleId, userId)
    return this.app.prisma.circle.update({
      where: { id: circleId },
      data: { status: 'closed' }
    })
  }

  async joinCircle(circleId: string, userId: string) {
    await this.ensureCircleExists(circleId)

    const existing = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })

    if (existing) {
      throw new ConflictError('ALREADY_MEMBER', 'User is already a member of this circle')
    }

    return this.app.prisma.circleMembership.create({
      data: { circleId, userId, role: 'member' }
    })
  }

  async requestJoinCircle(circleId: string, userId: string) {
    await this.ensureCircleExists(circleId)

    const existing = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })

    if (existing) {
      if (existing.role === 'rejected') {
        return this.app.prisma.circleMembership.update({
          where: { circleId_userId: { circleId, userId } },
          data: { role: 'pending', joinedAt: new Date() }
        })
      }
      throw new ConflictError('ALREADY_MEMBER', 'User already has membership or pending request for this circle')
    }

    return this.app.prisma.circleMembership.create({
      data: { circleId, userId, role: 'pending' }
    })
  }

  async listJoinRequests(circleId: string, adminUserId: string) {
    await this.ensureAdmin(circleId, adminUserId)
    return this.app.prisma.circleMembership.findMany({
      where: { circleId, role: 'pending' },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            country: true,
            sector: true
          }
        }
      }
    })
  }

  async approveJoinRequest(circleId: string, adminUserId: string, userId: string) {
    await this.ensureAdmin(circleId, adminUserId)
    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })
    if (!membership || membership.role !== 'pending') {
      throw new NotFoundError('Join request not found')
    }

    return this.app.prisma.circleMembership.update({
      where: { circleId_userId: { circleId, userId } },
      data: { role: 'member' }
    })
  }

  async rejectJoinRequest(circleId: string, adminUserId: string, userId: string) {
    await this.ensureAdmin(circleId, adminUserId)
    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })
    if (!membership || membership.role !== 'pending') {
      throw new NotFoundError('Join request not found')
    }

    await this.app.prisma.circleMembership.update({
      where: { circleId_userId: { circleId, userId } }
      ,
      data: { role: 'rejected' }
    })
    return { message: 'Join request rejected' }
  }

  async listMyJoinRequests(userId: string) {
    return this.app.prisma.circleMembership.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: {
        circle: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })
  }

  async leaveCircle(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (membership.role === 'creator') {
      throw new ForbiddenError('CREATOR_CANNOT_LEAVE', 'Circle creator cannot leave the circle')
    }

    await this.app.prisma.circleMembership.delete({
      where: { circleId_userId: { circleId, userId } }
    })

    return { message: 'Left circle successfully' }
  }

  async listMembers(circleId: string, _userId: string) {
    await this.ensureCircleExists(circleId)
    return this.app.prisma.circleMembership.findMany({
      where: { circleId, role: { notIn: ['pending', 'rejected'] } },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            country: true,
            sector: true,
            isGlobalAdmin: true
          }
        }
      }
    })
  }

  async updateMemberRole(circleId: string, adminUserId: string, memberUserId: string, role: MembershipRole) {
    await this.ensureAdmin(circleId, adminUserId)

    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId: memberUserId } }
    })

    if (!membership) throw new NotFoundError('Member not found')
    if (membership.role === 'creator') {
      throw new ForbiddenError('CANNOT_CHANGE_CREATOR_ROLE', 'Creator role cannot be changed')
    }

    return this.app.prisma.circleMembership.update({
      where: { circleId_userId: { circleId, userId: memberUserId } },
      data: { role }
    })
  }

  private async ensureCircleExists(circleId: string) {
    const circle = await this.app.prisma.circle.findUnique({ where: { id: circleId }, select: { id: true } })
    if (!circle) throw new NotFoundError('Circle not found')
  }

  private async ensureMember(circleId: string, userId: string) {
    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId } }
    })

    if (!membership) throw new ForbiddenError('NOT_A_MEMBER', 'You must be a member of this circle')
    if (membership.role === 'pending') {
      throw new ForbiddenError('MEMBERSHIP_PENDING_APPROVAL', 'Your request to join this circle is pending committee approval')
    }
    return membership
  }

  private async ensureAdmin(circleId: string, userId: string) {
    const membership = await this.ensureMember(circleId, userId)
    if (!ADMIN_ROLES.includes(membership.role as MembershipRole)) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Admin or creator role required')
    }
    return membership
  }
}
