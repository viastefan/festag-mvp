import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { buildDevVisibilityFeed } from '@/lib/dev/visibility-feed'

export const runtime = 'nodejs'

/** GET /api/dev/visibility — what reached (or will reach) the client */
export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const overview = await buildDevVisibilityFeed(supa as any, user.id)
    return NextResponse.json(overview)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'visibility_failed' }, { status: 500 })
  }
}
