import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'

export type AppendAuditInput = {
  circleId?: string | null
  actorId?: string | null
  subjectUserId?: string | null
  entityType: string
  action: string
  metadata?: Prisma.InputJsonValue
}

/** Centralized append-only audit writer. */
export class AuditLogService {
  constructor(private readonly app: FastifyInstance) {}

  async append(input: AppendAuditInput) {
    return this.app.prisma.auditLog.create({
      data: {
        circleId: input.circleId ?? undefined,
        actorId: input.actorId ?? undefined,
        subjectUserId: input.subjectUserId ?? undefined,
        entityType: input.entityType,
        action: input.action,
        metadata: input.metadata ?? undefined
      }
    })
  }
}
