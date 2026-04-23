import type { FastifyInstance } from 'fastify'
import {
  ONBOARDING_COUNTRY_NAMES,
  ONBOARDING_SECTOR_LABELS
} from '../constants/circle-choices.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'
import { isGlobalPlatformAdmin } from '../lib/platform-role.js'

type MembershipRole = 'member' | 'contributor' | 'creator' | 'admin'

/** ~5 MiB file as base64 data URL (~6.9M chars) + headroom */
const MAX_COVER_DATA_URL_CHARS = 8_000_000

/** Accepts https URL, app-relative path (/assets/...), or data:image/* (base64) for uploads. */
export function normalizeCoverImageUrl(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string') throw new ValidationError('Cover image must be a string', 'coverImageUrl')
  const s = raw.trim()
  if (s.length === 0) return undefined
  if (s.length > 8_200_000) throw new ValidationError('Cover image too large', 'coverImageUrl')
  if (s.startsWith('data:image/')) {
    if (s.length > MAX_COVER_DATA_URL_CHARS) throw new ValidationError('Cover image too large', 'coverImageUrl')
    return s
  }
  if (s.startsWith('/')) {
    if (s.length > 512) throw new ValidationError('coverImageUrl path too long', 'coverImageUrl')
    if (!/^\/[\w\-./%]+$/.test(s)) throw new ValidationError('Invalid cover image path', 'coverImageUrl')
    return s
  }
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol')
    if (u.href.length > 2048) throw new Error('long')
    return u.href
  } catch {
    throw new ValidationError('Invalid cover image URL', 'coverImageUrl')
  }
}

const ADMIN_ROLES: MembershipRole[] = ['creator', 'admin']

function validateCountryName(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string') throw new ValidationError('Country must be a string', 'country')
  const name = raw.trim()
  if (name.length === 0) return undefined
  if (!ONBOARDING_COUNTRY_NAMES.includes(name as (typeof ONBOARDING_COUNTRY_NAMES)[number])) {
    throw new ValidationError('Invalid country', 'country')
  }
  return name
}

function validateSectorLabel(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string') throw new ValidationError('Sector must be a string', 'sector')
  const label = raw.trim()
  if (label.length === 0) return undefined
  if (!ONBOARDING_SECTOR_LABELS.includes(label as (typeof ONBOARDING_SECTOR_LABELS)[number])) {
    throw new ValidationError('Invalid sector', 'sector')
  }
  return label
}

export class CircleService {
  constructor(private readonly app: FastifyInstance) {}

  async createCircle(userId: string, input: {
    name: string
    description?: string
    country?: string
    sector?: string
    coverImageUrl?: string | null
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

    const coverImageUrl = normalizeCoverImageUrl(input.coverImageUrl)
    const country = validateCountryName(input.country)
    const sector = validateSectorLabel(input.sector)

    const result = await this.app.prisma.$transaction(async (tx) => {
      const circle = await tx.circle.create({
        data: {
          name: input.name,
          description: input.description,
          country: country ?? null,
          sector: sector ?? null,
          coverImageUrl: coverImageUrl ?? null,
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

      await tx.auditLog.create({
        data: {
          circleId: circle.id,
          actorId: userId,
          entityType: 'circle',
          action: 'CIRCLE_CREATED',
          metadata: { circleId: circle.id, name: circle.name }
        }
      })

      return circle
    })

    return result
  }

  async listCircles() {
    const circles = await this.app.prisma.circle.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        country: true,
        sector: true,
        coverImageUrl: true,
        goalAmount: true,
        currency: true,
        status: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const verifiedSums = await this.app.prisma.contribution.groupBy({
      by: ['circleId'],
      where: { status: 'verified' },
      _sum: { amount: true }
    })
    const raisedByCircle = new Map(
      verifiedSums.map((row) => [row.circleId, row._sum.amount?.toString() ?? '0'])
    )

    return circles.map((c) => ({
      ...c,
      verifiedRaisedAmount: raisedByCircle.get(c.id) ?? '0'
    }))
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

    const data: { name?: string; description?: string | null; goalAmount?: number; coverImageUrl?: string | null } = {}

    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.description === 'string') data.description = body.description
    if (body.description === null) data.description = null
    if (typeof body.goalAmount === 'number') {
      if (body.goalAmount <= 0) throw new ValidationError('Goal amount must be greater than 0', 'goalAmount')
      data.goalAmount = body.goalAmount
    }
    if (Object.prototype.hasOwnProperty.call(body, 'coverImageUrl')) {
      if (body.coverImageUrl === null) data.coverImageUrl = null
      else if (typeof body.coverImageUrl === 'string') {
        data.coverImageUrl = normalizeCoverImageUrl(body.coverImageUrl) ?? null
      }
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No valid fields provided')
    }

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.circle.update({ where: { id: circleId }, data })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'circle',
          action: 'CIRCLE_UPDATED',
          metadata: data
        }
      })
      return updated
    })
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
    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.governanceConfig.update({
        where: { circleId },
        data
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'governance',
          action: 'GOVERNANCE_UPDATED',
          metadata: data
        }
      })
      return updated
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
    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.circle.update({
        where: { id: circleId },
        data: { status: 'closed' }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: userId,
          entityType: 'circle',
          action: 'CIRCLE_DISABLED',
          metadata: { status: 'closed' }
        }
      })
      return updated
    })
  }

  async joinCircle(circleId: string, userId: string) {
    await this.ensureCircleAcceptingMembers(circleId)

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
    await this.ensureCircleAcceptingMembers(circleId)

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

  async listMembers(circleId: string, userId: string) {
    await this.ensureMember(circleId, userId)
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
    const adminMembership = await this.ensureAdmin(circleId, adminUserId)

    const membership = await this.app.prisma.circleMembership.findUnique({
      where: { circleId_userId: { circleId, userId: memberUserId } }
    })

    if (!membership) throw new NotFoundError('Member not found')
    if (membership.role === 'creator') {
      throw new ForbiddenError('CANNOT_CHANGE_CREATOR_ROLE', 'Creator role cannot be changed')
    }
    if (role === 'admin' && adminMembership.role !== 'creator') {
      throw new ForbiddenError(
        'ONLY_CREATOR_ASSIGNS_CIRCLE_ADMIN',
        'Only the circle creator can grant the circle admin role'
      )
    }
    if (membership.role === 'admin' && role !== 'admin' && adminMembership.role !== 'creator') {
      throw new ForbiddenError(
        'ONLY_CREATOR_REVOKES_CIRCLE_ADMIN',
        'Only the circle creator can remove a circle admin'
      )
    }
    if (membership.role === role) {
      return membership
    }

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.circleMembership.update({
        where: { circleId_userId: { circleId, userId: memberUserId } },
        data: { role }
      })
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: adminUserId,
          subjectUserId: memberUserId,
          entityType: 'membership',
          action: 'MEMBER_ROLE_UPDATED',
          metadata: { memberUserId, previousRole: membership.role, role }
        }
      })
      return updated
    })
  }

  async adminDeleteCircle(requestUserId: string, circleId: string) {
    const admin = await this.app.prisma.user.findUnique({
      where: { id: requestUserId },
      select: { isGlobalAdmin: true, platformRole: true }
    })
    if (!isGlobalPlatformAdmin(admin)) {
      throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
    }

    const circle = await this.app.prisma.circle.findUnique({ where: { id: circleId }, select: { id: true } })
    if (!circle) throw new NotFoundError('Circle not found')

    await this.app.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          circleId,
          actorId: requestUserId,
          entityType: 'circle',
          action: 'CIRCLE_DELETED',
          metadata: { circleId }
        }
      })
      await tx.circle.delete({ where: { id: circleId } })
    })

    return { ok: true }
  }

  private async ensureCircleExists(circleId: string) {
    const circle = await this.app.prisma.circle.findUnique({ where: { id: circleId }, select: { id: true } })
    if (!circle) throw new NotFoundError('Circle not found')
  }

  /** Circle exists and is open for joins / join requests. */
  private async ensureCircleAcceptingMembers(circleId: string) {
    const circle = await this.app.prisma.circle.findUnique({
      where: { id: circleId },
      select: { id: true, status: true }
    })
    if (!circle) throw new NotFoundError('Circle not found')
    if (circle.status !== 'active') {
      throw new ValidationError('This circle is not accepting new members', 'circleId')
    }
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
