import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Owner aktiviert einen reservierten Seat explizit.
 * RLS in der DB stellt sicher, dass nur der Tenant-Owner aktivieren kann.
 *
 * Body: { seatId }
 */
export async function POST(req: NextRequest) {
  try {
    const { seatId } = await req.json()
    if (!seatId) {
      return NextResponse.json({ error: 'missing-seat-id' }, { status: 400 })
    }

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })
    }

    const { data, error } = await sb.rpc('activate_seat', { p_seat_id: seatId })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, seat: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
