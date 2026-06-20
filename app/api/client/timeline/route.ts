import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildClientTimeline } from '@/lib/client/timeline'

export const runtime = 'nodejs'

/** GET /api/client/timeline — unified client project timeline */
export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const limit = Math.min(50, Math.max(5, Number(new URL(req.url).searchParams.get('limit') || 30)))

  try {
    const items = await buildClientTimeline(supa as any, user.id, limit)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'timeline_failed' }, { status: 500 })
  }
}
