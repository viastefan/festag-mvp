import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZGtvZXB3dXZwdXJvaWpqYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTMyNTksImV4cCI6MjA5MTg2OTI1OX0.XL6nisBsFNkxCKAGKdYfdqsXGytEOrWPfBzxqjsPcRk'

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

    const cookieStore = cookies()
    const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

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
    console.error('[seats/activate] error:', e)
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
