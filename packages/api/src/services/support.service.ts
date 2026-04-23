import type { FastifyInstance } from 'fastify'
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/http-errors.js'
import { isGlobalPlatformAdmin } from '../lib/platform-role.js'
import { AuditLogService } from './audit-log.service.js'

const OPEN = 'open'
const CLOSED = 'closed'
const TRIAGED = 'triaged'

export class SupportService {
  constructor(private readonly app: FastifyInstance) {}

  private async ensureGlobalAdmin(requestUserId: string) {
    const u = await this.app.prisma.user.findUnique({
      where: { id: requestUserId },
      select: { isGlobalAdmin: true, platformRole: true }
    })
    if (!isGlobalPlatformAdmin(u)) throw new ForbiddenError('GLOBAL_ADMIN_REQUIRED', 'Global admin access required')
  }

  /** Any authenticated user can flag another user for admin review. */
  async createFlag(reporterId: string, input: { subjectUserId?: string | null; reason: string; metadata?: object }) {
    const reason = input.reason?.trim()
    if (!reason || reason.length > 2000) {
      throw new ValidationError('Reason is required (max 2000 characters)', 'reason')
    }
    if (input.subjectUserId) {
      const exists = await this.app.prisma.user.findUnique({
        where: { id: input.subjectUserId },
        select: { id: true }
      })
      if (!exists) throw new NotFoundError('Subject user not found')
    }

    const row = await this.app.prisma.supportFlag.create({
      data: {
        reporterId,
        subjectUserId: input.subjectUserId ?? null,
        subjectType: 'user',
        reason,
        status: OPEN,
        metadata: input.metadata ?? undefined
      },
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        subjectUser: { select: { id: true, displayName: true, email: true } }
      }
    })

    const audit = new AuditLogService(this.app)
    await audit.append({
      actorId: reporterId,
      subjectUserId: input.subjectUserId ?? null,
      entityType: 'support_flag',
      action: 'SUPPORT_FLAG_CREATED',
      metadata: { flagId: row.id, reasonPreview: reason.slice(0, 120) }
    })

    return row
  }

  async listFlags(requestUserId: string, status?: string) {
    await this.ensureGlobalAdmin(requestUserId)
    return this.app.prisma.supportFlag.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        subjectUser: { select: { id: true, displayName: true, email: true } }
      }
    })
  }

  async updateFlagStatus(requestUserId: string, flagId: string, status: string) {
    await this.ensureGlobalAdmin(requestUserId)
    if (![OPEN, TRIAGED, CLOSED].includes(status)) {
      throw new ValidationError('Invalid status', 'status')
    }
    const existing = await this.app.prisma.supportFlag.findUnique({ where: { id: flagId } })
    if (!existing) throw new NotFoundError('Flag not found')
    if (existing.status === status) {
      return this.app.prisma.supportFlag.findUniqueOrThrow({
        where: { id: flagId },
        include: {
          reporter: { select: { id: true, displayName: true, email: true } },
          subjectUser: { select: { id: true, displayName: true, email: true } }
        }
      })
    }

    const updated = await this.app.prisma.supportFlag.update({
      where: { id: flagId },
      data: { status },
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        subjectUser: { select: { id: true, displayName: true, email: true } }
      }
    })

    const audit = new AuditLogService(this.app)
    await audit.append({
      actorId: requestUserId,
      subjectUserId: existing.subjectUserId,
      entityType: 'support_flag',
      action: 'SUPPORT_FLAG_STATUS',
      metadata: { flagId, from: existing.status, to: status }
    })

    return updated
  }
}
