import { NextRequest, NextResponse } from 'next/server'

/**
 * Mollie payment session creation.
 * Requires env: MOLLIE_API_KEY (test_xxx or live_xxx).
 *
 * POST { amount: number (EUR), description: string, metadata?: any }
 * → { checkoutUrl, paymentId }
 *
 * Webhook handler should be at /api/payments/mollie/webhook (TODO).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, description, metadata, redirectUrl } = body

    const key = process.env.MOLLIE_API_KEY
    if (!key) return NextResponse.json({ error: 'Mollie not configured. Set MOLLIE_API_KEY env var.' }, { status: 500 })

    const amt = Number(amount)
    if (!amt || amt <= 0) return NextResponse.json({ error: 'invalid amount' }, { status: 400 })

    const origin = req.headers.get('origin') ?? new URL(req.url).origin
    const back = redirectUrl || `${origin}/billing?status=mollie`

    const res = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { currency: 'EUR', value: amt.toFixed(2) },
        description: String(description ?? 'Festag Plan').slice(0, 255),
        redirectUrl: back,
        webhookUrl: `${origin}/api/payments/mollie/webhook`,
        metadata: metadata ?? {},
      }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.detail ?? data?.title ?? 'Mollie error' }, { status: res.status })

    return NextResponse.json({
      checkoutUrl: data._links?.checkout?.href,
      paymentId: data.id,
      status: data.status,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
