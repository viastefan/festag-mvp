import { NextRequest, NextResponse } from 'next/server'

const ENJYN_API = 'https://payground.enjyn.de/bankapi/bank-api.php'

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference')
    if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 })
    const apiKey = process.env.ENJYN_API_KEY
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
