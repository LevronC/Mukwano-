import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { AuditLogService } from '../../../src/services/audit-log.service.js'

describe('AuditLogService', () => {
  const create = vi.fn(async () => ({ id: '1' }))
  let app: FastifyInstance

  beforeEach(() => {
    create.mockClear()
    app = { prisma: { auditLog: { create } } } as unknown as FastifyInstance
  })

  it('append writes all fields', async () => {
    const s = new AuditLogService(app)
    await s.append({
      circleId: 'c1',
      actorId: 'a1',
      subjectUserId: 's1',
      entityType: 'x',
      action: 'ACT',
      metadata: { k: 1 }
    })
    expect(create).toHaveBeenCalledWith({
      data: {
        circleId: 'c1',
        actorId: 'a1',
        subjectUserId: 's1',
        entityType: 'x',
        action: 'ACT',
        metadata: { k: 1 }
      }
    })
  })

  it('append omits nullish optional fields', async () => {
    const s = new AuditLogService(app)
    await s.append({ entityType: 'e', action: 'A' })
    expect(create).toHaveBeenCalledWith({
      data: {
        entityType: 'e',
        action: 'A'
      }
    })
  })
})
