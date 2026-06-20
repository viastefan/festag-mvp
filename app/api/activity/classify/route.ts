import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyUnclassifiedSignals } from '@/lib/tagro/classify-signal'

export const runtime = 'nodejs'
export const maxDuration = 60

/** POST /api/activity/classify { project_id?, limit? } */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { project_id?: string; limit?: number }

  const classified = await classifyUnclassifiedSignals(supa as any, {
    projectId: body.project_id,
    limit: body.limit,
  })

  return NextResponse.json({ ok: true, classified })
}
