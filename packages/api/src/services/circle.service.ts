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
    await this.ensureMember(circleId, userId)

    const circle = await this.app.prisma.circle.findUnique({
      where: { id: circleId },
      include: { governanceConfig: true }
    })

    if (!circle) throw new NotFoundError('Circle not found')

    return circle
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

  async listMembers(circleId: string, userId: string) {
    await this.ensureMember(circleId, userId)
    return this.app.prisma.circleMembership.findMany({
      where: { circleId },
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
