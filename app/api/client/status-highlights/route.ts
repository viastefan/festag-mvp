import { NextResponse } from 'next/server'
import { buildStatusCardHighlights } from '@/lib/client/status-card-highlights'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** GET /api/client/status-highlights — account-specific copy for status executive cards */
export async function GET() {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const cards = await buildStatusCardHighlights(supa as any, user.id)
    return NextResponse.json({ ok: true, cards })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'status_highlights_failed' }, { status: 500 })
  }
}
