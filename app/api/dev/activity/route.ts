import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { buildDevActivityFeed } from '@/lib/dev/activity-feed'

export const runtime = 'nodejs'

/** GET /api/dev/activity — unified dev execution feed (signals, git, proofs, issues) */
export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') || 50), 100)

  try {
    const data = await buildDevActivityFeed(supa as any, user.id, limit)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'activity_failed' }, { status: 500 })
  }
}
