import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export type DevSuggestion = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  role: string | null
}

/**
 * GET /api/dev/search?q=ste
 *
 * Suggestions for the "@" picker when handing a project to someone.
 * Only profiles that carry a dev_username are addressable — that handle is
 * the deliberate opt-in to being found. Never returns emails or PINs.
 *
 * An empty q returns the most recent handles, so the picker already shows
 * people the moment "@" is typed.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const raw = (req.nextUrl.searchParams.get('q') || '').trim().replace(/^@+/, '')
  const service = getServiceClient() || supa

  let query = (service as any)
    .from('profiles')
    .select('id, dev_username, full_name, first_name, last_name, avatar_url, role')
    .not('dev_username', 'is', null)
    .neq('id', user.id)
    .limit(8)

  if (raw) {
    // Escape LIKE wildcards so a literal % or _ cannot widen the search.
    const safe = raw.replace(/[%_]/g, (m) => `\\${m}`)
    query = query.or(
      `dev_username.ilike.%${safe}%,full_name.ilike.%${safe}%`,
    )
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'search_failed' }, { status: 500 })
  }

  const results: DevSuggestion[] = (data || []).map((p: any) => ({
    id: p.id,
    username: p.dev_username,
    name:
      p.full_name ||
      [p.first_name, p.last_name].filter(Boolean).join(' ') ||
      p.dev_username,
    avatarUrl: p.avatar_url || null,
    role: p.role || null,
  }))

  return NextResponse.json({ results })
}
