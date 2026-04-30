import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Optional: Webhook-Secret in Enjyn-Stammdaten waehlen und hier eintragen
// (oder per ENJYN_WEBHOOK_SECRET als Vercel-ENV-Var). Bleibt dies leer,
// werden Webhook-Calls ohne Signatur-Pruefung akzeptiert.
const WEBHOOK_SECRET_FALLBACK = ''

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    const signature = req.headers.get('x-signature') ?? ''
    const secret = process.env.ENJYN_WEBHOOK_SECRET || WEBHOOK_SECRET_FALLBACK

    if (secret) {
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(bodyText).digest('hex')
      const a = Buffer.from(expected)
      const b = Buffer.from(signature)
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    }

    const data = bodyText ? JSON.parse(bodyText) : null
    const tx = data?.transaction
    // In den Vercel-Function-Logs sichtbar — fuer Debugging und Audit
    console.log('[Enjyn Webhook]', {
      event: data?.event,
      reference: tx?.reference,
      amount_eur: tx?.amount_eur,
      status: tx?.status,
      received_at: tx?.received_at,
      underpaid: tx?.underpaid,
      overpaid: tx?.overpaid,
    })

    // Hier koennten wir spaeter die addon_purchases-Tabelle aktualisieren,
    // sobald ein DB-Schema dafuer existiert. Vorerst reicht 200 OK — das
    // Frontend-Polling bzw. der Page-Reload-Recheck holt den Status nach.

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Enjyn Webhook] error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}

// GET zum schnellen Pruefen ob die Route lebt
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/payments/webhook',
    expects: 'POST mit JSON-Body und optional Header X-Signature: sha256=<hmac>',
  })
}
