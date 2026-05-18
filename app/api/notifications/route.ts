import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 *   GET   /api/notifications?unread=1&limit=20
 *   PATCH /api/notifications { id? | ids[]?, read?: true, markAllRead?: true }
 *
 * Per-user inbox. RLS already restricts reads to `user_id = auth.uid()`.
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const unread = url.searchParams.get('unread') === '1'
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 30), 100)
  const projectId = url.searchParams.get('projectId')

  let q = supabase
    .from('notifications')
    .select('id,project_id,task_id,audience,kind,type,title,body,message,link,payload,read,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (unread) q = q.eq('read', false)
  if (projectId) q = q.eq('project_id', projectId)

  const { data } = await q

  // Unread count regardless of `unread` filter
  const { count: unreadCount } = await supabase
    .from('notifications').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('read', false)

  return NextResponse.json({ notifications: data ?? [], unread: unreadCount ?? 0 })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()

  if (body?.markAllRead) {
    await supabase.from('notifications').update({ read: true, read_at: now })
      .eq('user_id', user.id).eq('read', false)
    return NextResponse.json({ ok: true })
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String)
    : body?.id ? [String(body.id)] : []
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 })

  await supabase.from('notifications').update({ read: true, read_at: now })
    .eq('user_id', user.id).in('id', ids)
  return NextResponse.json({ ok: true })
}
