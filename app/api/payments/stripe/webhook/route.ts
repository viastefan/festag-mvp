import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/payments/stripe'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 500 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'webhook_secret_missing' }, { status: 500 })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 })

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const milestoneId = session.metadata?.milestoneId
      const projectId = session.metadata?.projectId
      const devUserId = session.metadata?.devUserId
      const clientUserId = session.metadata?.clientUserId

      if (milestoneId) {
        const amountPaid = session.amount_total ? session.amount_total / 100 : null

        await sb
          .from('payments')
          .update({
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('stripe_checkout_session_id', session.id)

        await sb
          .from('milestones')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_amount: amountPaid,
          })
          .eq('id', milestoneId)

        if (devUserId && projectId) {
          await sb.from('notifications').insert({
            user_id: devUserId,
            project_id: projectId,
            audience: 'dev',
            kind: 'milestone_paid',
            type: 'milestone_paid',
            title: 'Milestone bezahlt',
            body: `Ein Milestone wurde bezahlt — du kannst loslegen.`,
            message: 'Milestone-Zahlung eingegangen.',
            read: false,
            payload: { milestone_id: milestoneId, amount: amountPaid },
          })
        }

        if (clientUserId && projectId) {
          await sb.from('notifications').insert({
            user_id: clientUserId,
            project_id: projectId,
            audience: 'client',
            kind: 'payment_confirmed',
            type: 'payment_confirmed',
            title: 'Zahlung erfolgreich',
            body: `Deine Zahlung wurde erfolgreich verarbeitet.`,
            message: 'Zahlung bestätigt.',
            read: false,
            payload: { milestone_id: milestoneId, amount: amountPaid },
          })
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object
      await sb
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', intent.id)

      const { data: failedPayment } = await sb
        .from('payments')
        .select('user_id,project_id,milestone_id')
        .eq('stripe_payment_intent_id', intent.id)
        .maybeSingle()

      if (failedPayment?.user_id) {
        await sb.from('notifications').insert({
          user_id: failedPayment.user_id,
          project_id: failedPayment.project_id,
          audience: 'client',
          kind: 'payment_failed',
          type: 'payment_failed',
          title: 'Zahlung fehlgeschlagen',
          body: 'Deine Zahlung konnte nicht verarbeitet werden. Bitte versuche es erneut.',
          message: 'Zahlung fehlgeschlagen.',
          read: false,
          payload: { milestone_id: failedPayment.milestone_id },
        })
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const paymentIntentId = charge.payment_intent

      await sb
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)

      const { data: refundedPayment } = await sb
        .from('payments')
        .select('milestone_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (refundedPayment?.milestone_id) {
        await sb
          .from('milestones')
          .update({ status: 'pending', paid_at: null, paid_amount: null })
          .eq('id', refundedPayment.milestone_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
