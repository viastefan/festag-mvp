import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Client Posteingang — structured inbox_items only (Visibility Layer).
 * Dev execution events live in /api/dev/execution-inbox (notifications).
 *
 *   GET   /api/inbox/items?category=client&unread=1&limit=120
 *   PATCH /api/inbox/items { id?, ids[]?, markAllRead?: true }
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const unread = url.searchParams.get('unread') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 120), 200)
  const category = url.searchParams.get('category')

  let q = supabase
    .from('inbox_items')
    .select('id,thread_id,user_id,project_id,category,type,title,body,metadata,read_at,created_at')
    .eq('user_id', user.id)
    .neq('category', 'team')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unread) q = q.is('read_at', null)
  if (category) q = q.eq('category', category)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = rows ?? []

  const { count: unreadCount } = await supabase
    .from('inbox_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('category', 'team')
    .is('read_at', null)

  const projectIds = Array.from(new Set(items.map(i => i.project_id).filter(Boolean))) as string[]
  let projects: Record<string, { title: string; color: string | null }> = {}
  if (projectIds.length) {
    const { data: projs } = await supabase.from('projects').select('id,title,color').in('id', projectIds)
    for (const p of projs ?? []) projects[p.id] = { title: p.title, color: p.color }
  }

  return NextResponse.json({ items, unread: unreadCount ?? 0, projects })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()

  if (body?.markAllRead) {
    const { data: unreadRows } = await supabase
      .from('inbox_items')
      .select('id,metadata')
      .eq('user_id', user.id)
      .neq('category', 'team')
      .is('read_at', null)

    await supabase.from('inbox_items').update({ read_at: now })
      .eq('user_id', user.id)
      .neq('category', 'team')
      .is('read_at', null)

    await syncNotificationReads(supabase, unreadRows ?? [], now)
    return NextResponse.json({ ok: true })
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String)
    : body?.id ? [String(body.id)] : []
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 })

  const { data: rows } = await supabase
    .from('inbox_items')
    .select('id,metadata,category')
    .eq('user_id', user.id)
    .neq('category', 'team')
    .in('id', ids)

  if (!rows?.length) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await supabase.from('inbox_items').update({ read_at: now })
    .eq('user_id', user.id)
    .in('id', ids)

  await syncNotificationReads(supabase, rows, now)
  return NextResponse.json({ ok: true })
}

async function syncNotificationReads(
  sb: ReturnType<typeof createClient>,
  rows: { id: string; metadata: unknown }[],
  readAt: string,
) {
  const notifIds = rows
    .map(r => (r.metadata as Record<string, unknown> | null)?.notification_id)
    .filter((id): id is string => typeof id === 'string')
  if (!notifIds.length) return
  await sb.from('notifications')
    .update({ read: true, read_at: readAt })
    .in('id', notifIds)
    .then(() => null, () => null)
}
