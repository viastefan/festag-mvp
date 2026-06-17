import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichTagroObjectContext } from '@/lib/tagro/context-enrich'

export const runtime = 'nodejs'

/**
 * GET /api/tagro/context/enrich?type=task&id=…&subtitle=…&status=…&projectId=…
 * Lightweight live metadata for Tagro overlay headers before the first preview call.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const enriched = await enrichTagroObjectContext({
    type: sp.get('type') || undefined,
    id: sp.get('id') || undefined,
    title: sp.get('title') || undefined,
    subtitle: sp.get('subtitle') || undefined,
    status: sp.get('status'),
    projectId: sp.get('projectId') || undefined,
  })

  return NextResponse.json({ ok: true, ...enriched })
}
