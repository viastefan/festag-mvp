import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { InboxFeedItem } from '@/components/inbox/useInboxFeed'

type NotificationRow = {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  audience: string | null
  kind: string | null
  type: string | null
  title: string | null
  body: string | null
  message: string | null
  link: string | null
  payload: Record<string, unknown> | null
  read: boolean | null
  read_at: string | null
  created_at: string
}

function toFeedItem(n: NotificationRow): InboxFeedItem {
  const kind = n.kind ?? n.type ?? ''
  return {
    id: n.id,
    thread_id: n.id,
    user_id: n.user_id,
    project_id: n.project_id,
    category: 'execution',
    type: kind || 'system_event',
    title: n.title ?? n.body ?? n.message ?? 'Update',
    body: n.body ?? n.message ?? null,
    metadata: {
      kind,
      audience: n.audience,
      link: n.link,
      task_id: n.task_id,
      notification_id: n.id,
      source_label: 'Festag Ops',
      ...(n.payload ?? {}),
    },
    read_at: n.read ? (n.read_at ?? n.created_at) : null,
    created_at: n.created_at,
  }
}

/**
 * Dev Execution Inbox — notifications table (Human Execution Layer).
 * Completely separate from client Posteingang (/api/inbox/items).
 *
 *   GET   /api/dev/execution-inbox?unread=1&limit=200
 *   PATCH /api/dev/execution-inbox { id?, ids[]?, markAllRead?: true }
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const unread = url.searchParams.get('unread') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 200)

  let q = supabase
    .from('notifications')
    .select('id,user_id,project_id,task_id,audience,kind,type,title,body,message,link,payload,read,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unread) q = q.eq('read', false)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = ((rows as NotificationRow[] | null) ?? []).map(toFeedItem)

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

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
    await supabase.from('notifications')
      .update({ read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('read', false)
    return NextResponse.json({ ok: true })
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String)
    : body?.id ? [String(body.id)] : []
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 })

  await supabase.from('notifications')
    .update({ read: true, read_at: now })
    .eq('user_id', user.id)
    .in('id', ids)

  return NextResponse.json({ ok: true })
}
