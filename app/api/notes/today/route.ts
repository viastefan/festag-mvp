import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/notes/today
 *   Returns the user's "Daily Note" for today — creates one on first call.
 *
 * The Daily Note is the persistent quick-capture buffer Stefan wants on
 * the left rail. Idempotent thanks to the uq_notes_daily unique index on
 * (user_id, daily_date) WHERE is_daily.
 *
 * Title format: "Notizen — 25.05.2026" (locale: de-DE).
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const today = new Date()
  const dailyDate = today.toISOString().slice(0, 10) // YYYY-MM-DD

  const { data: existing } = await (supa as any)
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_daily', true)
    .eq('daily_date', dailyDate)
    .maybeSingle()

  if (existing) return NextResponse.json({ note: existing })

  const title = `Notizen — ${today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  const { data, error } = await (supa as any).from('notes').insert({
    user_id: user.id,
    title,
    body: '',
    note_type: 'journal',
    is_daily: true,
    daily_date: dailyDate,
    pinned: true, // Daily is always pinned for that day
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
