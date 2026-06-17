import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { createStripeCheckoutSession } from '@/lib/payments/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const milestoneId: string | undefined = body?.milestoneId
    if (!milestoneId) return NextResponse.json({ error: 'missing_milestoneId' }, { status: 400 })

    const { data: milestone } = await sb
      .from('milestones')
      .select('id,project_id,title,amount,currency,status')
      .eq('id', milestoneId)
      .maybeSingle()
    if (!milestone) return NextResponse.json({ error: 'milestone_not_found' }, { status: 404 })
    if (milestone.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,assigned_dev,workspace_id,client_id')
      .eq('id', milestone.project_id)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const isOwner = project.user_id === user.id || project.client_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const { data: profile } = await sb
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const amountCents = Math.round((milestone.amount ?? 0) * 100)
    const currency = milestone.currency || 'EUR'

    const { data: payment } = await sb
      .from('payments')
      .insert({
        user_id: user.id,
        project_id: project.id,
        milestone_id: milestoneId,
        provider: 'stripe',
        payment_method: 'stripe',
        amount: milestone.amount,
        currency,
        status: 'pending',
        description: `${project.title} — ${milestone.title}`,
      })
      .select('id')
      .single()

    const result = await createStripeCheckoutSession({
      amountCents,
      currency,
      description: `${project.title} — ${milestone.title}`,
      metadata: {
        projectId: project.id,
        milestoneId,
        clientUserId: user.id,
        devUserId: project.assigned_dev || '',
      },
      successUrl: `${origin}/project/${project.id}?paid=${milestoneId}`,
      cancelUrl: `${origin}/project/${project.id}?cancel=${milestoneId}`,
      customerEmail: profile?.email,
    })

    if (payment?.id) {
      await sb
        .from('payments')
        .update({
          stripe_checkout_session_id: result.sessionId,
          stripe_payment_intent_id: result.paymentIntentId,
        })
        .eq('id', payment.id)
    }

    return NextResponse.json({ checkoutUrl: result.url })
  } catch (e: any) {
    if (e?.message === 'stripe_not_configured') {
      return NextResponse.json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' }, { status: 500 })
    }
    return NextResponse.json({ error: e?.message || 'stripe_checkout_failed' }, { status: 500 })
  }
}
