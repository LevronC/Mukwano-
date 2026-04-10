import type { FastifyInstance } from 'fastify'

const MAX_NOTIFICATIONS = 30

export class NotificationService {
  constructor(private readonly app: FastifyInstance) {}

  async createForUser(userId: string, event: string, body: string): Promise<void> {
    await this.app.prisma.notification.create({
      data: { userId, event, body }
    })
  }

  async createForCircle(circleId: string, event: string, body: string): Promise<void> {
    const memberships = await this.app.prisma.circleMembership.findMany({
      where: { circleId },
      select: { userId: true }
    })

    if (memberships.length === 0) return

    await this.app.prisma.notification.createMany({
      data: memberships.map(({ userId }) => ({ userId, event, body }))
    })
  }

  async list(userId: string) {
    const notifications = await this.app.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTIFICATIONS,
      select: { id: true, event: true, body: true, read: true, createdAt: true }
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    return { notifications, unreadCount }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.app.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
  }
}
