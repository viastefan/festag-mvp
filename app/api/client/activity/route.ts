import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listClientActivity } from '@/lib/client/client-activity'

export const runtime = 'nodejs'

/** GET /api/client/activity — client-safe timeline (signals + shared meetings) */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const items = await listClientActivity(supa as any, user.id)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'activity_failed' }, { status: 500 })
  }
}
