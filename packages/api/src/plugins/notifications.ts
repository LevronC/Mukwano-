import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { NotificationService } from '../services/notification.service.js'

const notificationsPlugin: FastifyPluginAsync = fp(async (server) => {
  const notificationService = new NotificationService(server)
  server.decorate('notificationService', notificationService)
})

export { notificationsPlugin }
