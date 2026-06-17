import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET  /api/notes
 *   Lists the current user's own notes + everything shared with them.
 *   Query: ?project=<id> filters to a project, ?archived=1 includes archived.
 *
 * POST /api/notes  { title?, body?, project_id? }
 *   Creates an empty note owned by the current user.
 */

export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get('project')
  const includeArchived = url.searchParams.get('archived') === '1'

  let q = (supa as any).from('notes').select('*').order('updated_at', { ascending: false }).limit(200)
  if (projectId) q = q.eq('project_id', projectId)
  if (!includeArchived) q = q.neq('status', 'archived')

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { data, error } = await (supa as any).from('notes').insert({
    user_id: user.id,
    title: (body?.title || 'Neue Notiz').slice(0, 200),
    body: body?.body || null,
    project_id: body?.project_id || null,
    tags: Array.isArray(body?.tags) ? body.tags.slice(0, 20) : [],
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
