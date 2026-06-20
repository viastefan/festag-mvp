import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildActivityFeed } from '@/lib/activity/build-feed'

export const runtime = 'nodejs'

/** GET /api/activity/feed?project_id=&limit= */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id') || undefined
  const limit = Math.min(Number(params.get('limit') || 80), 150)

  const { items, unclassified_signals } = await buildActivityFeed(supa as any, {
    projectId,
    limit,
  })

  return NextResponse.json({
    items,
    count: items.length,
    unclassified_signals,
  })
}
