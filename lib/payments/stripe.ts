import Stripe from 'stripe'

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any })
}

export type StripeCheckoutInput = {
  amountCents: number
  currency: string
  description: string
  metadata: {
    projectId: string
    milestoneId: string
    clientUserId: string
    devUserId: string
  }
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput) {
  const stripe = getStripe()
  if (!stripe) throw new Error('stripe_not_configured')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: input.customerEmail,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: input.currency.toLowerCase(),
        unit_amount: input.amountCents,
        product_data: { name: input.description },
      },
    }],
    metadata: input.metadata,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  })

  return {
    sessionId: session.id,
    url: session.url,
    paymentIntentId: session.payment_intent as string | null,
  }
}
