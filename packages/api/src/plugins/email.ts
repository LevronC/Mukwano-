import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { EmailService } from '../services/email.service.js'

const emailPlugin: FastifyPluginAsync = fp(async (server) => {
  const emailService = new EmailService(server)
  server.decorate('emailService', emailService)

  server.addHook('onReady', async () => {
    const key = (server.config.RESEND_API_KEY ?? '').trim()
    if (!key) {
      server.log.warn(
        '[email] RESEND_API_KEY is not set (or is only whitespace). Verification and password-reset emails will not be sent. Add it to the API project on Vercel, not only the web app.'
      )
    } else {
      const appUrl = (server.config.APP_URL ?? '').replace(/\/+$/, '') || '(default localhost)'
      server.log.info({ appUrl, fromConfigured: !!(server.config.RESEND_FROM ?? '').trim() }, '[email] Resend API key loaded; outbound email enabled')
    }
  })
})

export { emailPlugin }
