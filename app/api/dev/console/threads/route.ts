import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/dev/console/threads[?projectId=]
 *
 * The chat-history sidebar: the dev's tagro threads, pinned first then by
 * recency. With projectId → scoped to that project (console rail); without →
 * all projects (global Dev sidebar history). RLS scopes to the caller.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')

  let q = (supa as any).from('inbox_threads')
    .select('id, title, summary, unread_count, pinned, last_item_at, created_at, project_id')
    .eq('user_id', user.id).eq('category', 'tagro')
  if (projectId) q = q.eq('project_id', projectId)

  const { data, error } = await q
    .order('pinned', { ascending: false })
    .order('last_item_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ threads: data ?? [] })
}
