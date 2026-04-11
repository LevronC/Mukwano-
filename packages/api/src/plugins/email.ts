import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { EmailService } from '../services/email.service.js'

const emailPlugin: FastifyPluginAsync = fp(async (server) => {
  const emailService = new EmailService(server)
  server.decorate('emailService', emailService)
})

export { emailPlugin }
