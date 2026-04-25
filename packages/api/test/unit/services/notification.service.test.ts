import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { NotificationService } from '../../../src/services/notification.service.js'

function mockApp(overrides: {
  create?: () => Promise<unknown>
  findManyNotif?: () => Promise<Array<{ id: string; read: boolean }>>
  findManyMem?: () => Promise<Array<{ userId: string }>>
  createMany?: () => Promise<unknown>
  updateMany?: () => Promise<unknown>
} = {}) {
  const prisma = {
    notification: {
      create: vi.fn(overrides.create ?? (async () => ({ id: '1' }))),
      findMany: vi.fn(
        overrides.findManyNotif ??
          (async () => [
            { id: 'a', read: false },
            { id: 'b', read: true }
          ])
      ),
      createMany: vi.fn(overrides.createMany ?? (async () => ({ count: 1 }))),
      updateMany: vi.fn(overrides.updateMany ?? (async () => ({ count: 1 })))
    },
    circleMembership: {
      findMany: vi.fn(overrides.findManyMem ?? (async () => [{ userId: 'u1' }]))
    }
  }
  return { prisma } as unknown as FastifyInstance
}

describe('NotificationService', () => {
  let app: FastifyInstance

  beforeEach(() => {
    app = mockApp()
  })

  it('createForUser delegates to prisma', async () => {
    const s = new NotificationService(app)
    await s.createForUser('u1', 'E', 'body')
    expect(app.prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'u1', event: 'E', body: 'body' }
    })
  })

  it('createForCircle skips createMany when no members', async () => {
    const app2 = mockApp({ findManyMem: async () => [] })
    const s = new NotificationService(app2)
    await s.createForCircle('c1', 'E', 'b')
    expect(app2.prisma.notification.createMany).not.toHaveBeenCalled()
  })

  it('createForCircle creates for each member', async () => {
    const s = new NotificationService(app)
    await s.createForCircle('c1', 'E', 'b')
    expect(app.prisma.notification.createMany).toHaveBeenCalled()
  })

  it('list returns notifications and unreadCount', async () => {
    const s = new NotificationService(app)
    const r = await s.list('u1')
    expect(r.unreadCount).toBe(1)
    expect(r.notifications).toHaveLength(2)
  })

  it('markAllRead updates', async () => {
    const s = new NotificationService(app)
    await s.markAllRead('u1')
    expect(app.prisma.notification.updateMany).toHaveBeenCalled()
  })
})
