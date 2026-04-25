import type { FastifyPluginAsync } from 'fastify'
import { captureFinancialException } from '../lib/observability/sentry.js'
import { ContributionService } from '../services/contribution.service.js'

/**
 * Stripe webhook endpoint. Must NOT be wrapped in fp() so that the
 * addContentTypeParser override is scoped only to this plugin's routes.
 *
 * The raw buffer body is required for Stripe signature verification.
 */
export const webhooksRoute: FastifyPluginAsync = async (fastify) => {
  const service = new ContributionService(fastify)

  // Override the JSON parser to receive raw buffer — scoped to this plugin only
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body as Buffer)
  })

  fastify.post('/webhooks/stripe', async (request, reply) => {
    if (fastify.demoMode) {
      return reply.code(400).send({ error: { code: 'DEMO_MODE', message: 'Stripe webhooks disabled in demo mode', status: 400 } })
    }

    const sig = request.headers['stripe-signature'] as string | undefined
    if (!sig) {
      return reply.code(400).send({ error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header', status: 400 } })
    }

    let event
    try {
      event = fastify.paymentAdapter.constructWebhookEvent(request.body as Buffer, sig)
    } catch (err) {
      fastify.log.warn({ err }, 'stripe webhook signature verification failed')
      return reply.code(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed', status: 400 } })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: { contributionId?: string; circleId?: string }; payment_status?: string; id: string }

      if (session.payment_status === 'paid' && session.metadata?.contributionId && session.metadata?.circleId) {
        try {
          await service.handleStripePaymentConfirmed(
            session.metadata.circleId,
            session.metadata.contributionId,
            session.id
          )
        } catch (err) {
          fastify.log.error({ err, sessionId: session.id }, 'stripe webhook: failed to auto-verify contribution')
          captureFinancialException(err, 'webhooks.stripe.checkout_session_completed', { sessionId: session.id })
          // Return 200 to prevent Stripe from retrying — we log the failure for manual recovery
        }
      }
    }

    return reply.code(200).send({ received: true })
  })
}
