import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/dev/console/threads?projectId=
 *
 * The chat-history sidebar: all of the dev's tagro threads for a project,
 * pinned first then by recency. RLS scopes to the calling user's own threads.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const { data, error } = await (supa as any).from('inbox_threads')
    .select('id, title, summary, unread_count, pinned, last_item_at, created_at')
    .eq('user_id', user.id).eq('project_id', projectId).eq('category', 'tagro')
    .order('pinned', { ascending: false })
    .order('last_item_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ threads: data ?? [] })
}
