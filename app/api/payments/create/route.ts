import { NextRequest, NextResponse } from 'next/server'

const ENJYN_API = 'https://payground.enjyn.de/bankapi/bank-api.php'

export async function POST(req: NextRequest) {
  try {
    const { amount, note } = await req.json()
    const apiKey = process.env.ENJYN_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Payment API not configured' }, { status: 500 })

    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })

    const safeNote = String(note ?? '').slice(0, 500)

    const res = await fetch(`${ENJYN_API}?action=create_payment`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountNum, note: safeNote }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.error ?? 'Payment creation failed' }, { status: res.status })

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
