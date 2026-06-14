import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET   /api/dev/console/thread/:id  — full transcript of a tagro chat.
 * PATCH /api/dev/console/thread/:id  — rename / pin / archive.
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: thread } = await (supa as any).from('inbox_threads')
    .select('id, title, summary, pinned, project_id, user_id')
    .eq('id', ctx.params.id).eq('user_id', user.id).maybeSingle()
  if (!thread) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: items } = await (supa as any).from('inbox_items')
    .select('id, type, title, body, actor_id, metadata, created_at')
    .eq('thread_id', ctx.params.id).order('created_at', { ascending: true }).limit(500)

  return NextResponse.json({ thread, items: items ?? [] })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as { title?: string; pinned?: boolean; archived?: boolean }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof b.title === 'string') patch.title = b.title.slice(0, 80)
  if (typeof b.pinned === 'boolean') patch.pinned = b.pinned
  if (b.archived === true) patch.status = 'archived'

  const { data, error } = await (supa as any).from('inbox_threads')
    .update(patch).eq('id', ctx.params.id).eq('user_id', user.id).select('id, title, pinned, status').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ thread: data })
}
