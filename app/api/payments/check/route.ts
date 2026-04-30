import { NextRequest, NextResponse } from 'next/server'

// Hinweis: Die Doku schreibt "payground.enjyn.de" — das ist ein Typo, der echte Host ist "playground".
const ENJYN_API = 'https://playground.enjyn.de/bankapi/bank-api.php'

// Hinweis: Key wird ausschließlich serverseitig genutzt und nicht ans Frontend ausgeliefert.
// Sobald Vercel-ENV verfügbar ist, dort ENJYN_API_KEY setzen — die ENV hat Vorrang.
const ENJYN_API_KEY_FALLBACK = '0506bfde62e5e99613dd67e4f52a6be370e321816b0c3459'

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference')
    if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 })
    const apiKey = process.env.ENJYN_API_KEY || ENJYN_API_KEY_FALLBACK
    if (!apiKey) return NextResponse.json({ error: 'Payment API not configured' }, { status: 500 })

    const res = await fetch(`${ENJYN_API}?action=transactions`, {
      headers: { 'X-API-Key': apiKey },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.error ?? 'Check failed' }, { status: res.status })

    const tx = (data.transactions ?? []).find((t: any) => t.reference === reference)
    if (!tx) return NextResponse.json({ status: 'pending', reference })

    return NextResponse.json({
      status: tx.status,            // pending | done | cancelled
      reference,
      type: tx.type,
      amount_cents: tx.amount_cents,
      completed_at: tx.completed_at,
      note: tx.note,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
