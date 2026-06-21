import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadRecentExecuted } from '@/lib/portal/recent-executed'

export const runtime = 'nodejs'

/**
 * GET /api/portal/recent-executed
 *
 * Action-oriented sidebar feed: recent decisions + Tagro sessions
 * (summary or first user prompt), not raw project titles.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const items = await loadRecentExecuted(supa as any, user.id)
  return NextResponse.json({ items })
}
