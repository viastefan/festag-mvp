import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/notes/search?q=<query>
 *
 * Lightweight typeahead for [[backlink]] autocomplete.
 * Matches against the user's own + shared notes, returns up to 8 hits.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ notes: [] })

  const { data } = await (supa as any)
    .from('notes')
    .select('id,title,updated_at,project_id')
    .neq('status', 'archived')
    .ilike('title', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(8)

  return NextResponse.json({ notes: data ?? [] })
}
