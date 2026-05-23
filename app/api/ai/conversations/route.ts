import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET  /api/ai/conversations
 *   Lists the caller's conversations, newest first. Pinned bubble up.
 *
 * POST /api/ai/conversations  { title? }
 *   Creates a blank conversation owned by the caller.
 */

export async function GET(_req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data, error } = await (supa as any)
    .from('tagro_conversations')
    .select('id,title,pinned,created_at,updated_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body?.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 120) : 'Neuer Chat'

  const { data, error } = await (supa as any)
    .from('tagro_conversations')
    .insert({ user_id: user.id, title })
    .select('id,title,pinned,created_at,updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}
