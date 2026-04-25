import Stripe from 'stripe'

export interface PaymentAdapter {
  mode: 'demo' | 'live'
  createCheckoutSession(args: {
    contributionId: string
    circleId: string
    amount: number
    currency: string
    successUrl: string
    cancelUrl: string
  }): Promise<{ sessionId: string; checkoutUrl: string }>
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event
}

export class DemoPaymentAdapter implements PaymentAdapter {
  mode: 'demo' = 'demo'

  async createCheckoutSession(_args: Parameters<PaymentAdapter['createCheckoutSession']>[0]): Promise<{ sessionId: string; checkoutUrl: string }> {
    throw new Error('Stripe payments are disabled in DEMO_MODE')
  }

  constructWebhookEvent(_rawBody: Buffer, _signature: string): Stripe.Event {
    throw new Error('Stripe webhooks are disabled in DEMO_MODE')
  }
}

export class StripePaymentAdapter implements PaymentAdapter {
  mode: 'live' = 'live'
  private readonly stripe: Stripe
  private readonly webhookSecret: string

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey)
    this.webhookSecret = webhookSecret
  }

  async createCheckoutSession(args: {
    contributionId: string
    circleId: string
    amount: number
    currency: string
    successUrl: string
    cancelUrl: string
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    // Stripe amounts are in smallest currency unit (cents for USD)
    const unitAmount = Math.round(args.amount * 100)

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: args.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: { name: 'Circle Contribution' },
          },
          quantity: 1,
        },
      ],
      metadata: {
        contributionId: args.contributionId,
        circleId: args.circleId,
      },
      client_reference_id: args.contributionId,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    })

    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
  }
}
