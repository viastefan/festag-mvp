import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/inbox/read — clear a badge for the caller.
 *   { threadId }  → mark one thread read
 *   { category }  → mark every unread item of that category read (across projects)
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { threadId, category } = (await req.json().catch(() => ({}))) as { threadId?: string; category?: string }

  if (category) {
    const { error } = await (supa as any).rpc('mark_inbox_category_read', { p_category: category })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (threadId) {
    const { error } = await (supa as any).rpc('mark_inbox_read', { p_thread_id: threadId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'threadId or category required' }, { status: 400 })
}
