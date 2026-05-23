import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET    /api/ai/conversations/:id   → meta + ordered messages
 * PATCH  /api/ai/conversations/:id   → rename / pin
 * DELETE /api/ai/conversations/:id   → hard delete (messages cascade)
 */

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: conv, error: convErr } = await (supa as any)
    .from('tagro_conversations')
    .select('id,title,pinned,created_at,updated_at')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: msgs } = await (supa as any)
    .from('tagro_messages')
    .select('id,role,content,thinking,created_at')
    .eq('conversation_id', ctx.params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ conversation: conv, messages: msgs ?? [] })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body?.title === 'string') patch.title = body.title.trim().slice(0, 120) || 'Neuer Chat'
  if (typeof body?.pinned === 'boolean') patch.pinned = body.pinned

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'nothing to patch' }, { status: 400 })
  }

  const { data, error } = await (supa as any)
    .from('tagro_conversations')
    .update(patch)
    .eq('id', ctx.params.id)
    .select('id,title,pinned,created_at,updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { error } = await (supa as any)
    .from('tagro_conversations').delete().eq('id', ctx.params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
