import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** POST /api/inbox/read — mark a thread read for the caller (clears its badge). */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { threadId } = (await req.json().catch(() => ({}))) as { threadId?: string }
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const { error } = await (supa as any).rpc('mark_inbox_read', { p_thread_id: threadId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
