import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Mark today's Overview briefing as read / archived for the current user.
 * Soft-fail friendly: preview and missing tables still return ok after local UI ack.
 */
export async function POST(req: Request) {
  let briefingDate = ''
  let readAt = new Date().toISOString()
  try {
    const body = await req.json()
    if (typeof body?.briefingDate === 'string') briefingDate = body.briefingDate.slice(0, 10)
    if (typeof body?.readAt === 'string') readAt = body.readAt
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(briefingDate)) {
    return NextResponse.json({ ok: false, error: 'invalid_date' }, { status: 400 })
  }

  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: true, stored: false, reason: 'anonymous' })
    }

    const { error } = await sb.from('overview_briefing_reads').upsert(
      {
        user_id: user.id,
        briefing_date: briefingDate,
        read_at: readAt,
        archived: true,
      },
      { onConflict: 'user_id,briefing_date' },
    )

    if (error) {
      // Table may not exist yet — UI already persisted locally.
      return NextResponse.json({ ok: true, stored: false, reason: error.message })
    }

    return NextResponse.json({ ok: true, stored: true })
  } catch (e: any) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: e?.message || 'unavailable',
    })
  }
}
