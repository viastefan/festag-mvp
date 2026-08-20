import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNews } from '@/lib/news/build'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/news — the workspace newsroom, scoped to what this person can see.
 *
 * Everything is resolved server-side: which projects they reach, which role
 * lens they read through, and whether a row is client-safe. The page renders
 * what it is handed and never re-decides visibility.
 */
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const payload = await buildNews(supabase as any, user.id)
    return NextResponse.json(payload)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'server_error' }, { status: 500 })
  }
}
