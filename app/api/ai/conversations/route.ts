import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET  /api/ai/conversations
 *   Lists the caller's conversations, newest first. Pinned bubble up.
 *
 * POST /api/ai/conversations  { title? }
 *   Creates a blank conversation owned by the caller.
 */

const VALID_MODES = ['tagro', 'developer', 'owner', 'support'] as const
type Mode = typeof VALID_MODES[number]

export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Filter by status / mode via query params. Default hides archived.
  const url = new URL(req.url)
  const includeArchived = url.searchParams.get('archived') === '1'
  const modeFilter = url.searchParams.get('mode') as Mode | null

  let q = (supa as any)
    .from('tagro_conversations')
    .select('id,title,pinned,mode,project_id,status,summary,created_at,updated_at,ended_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(200)
  if (!includeArchived) q = q.neq('status', 'archived')
  if (modeFilter && VALID_MODES.includes(modeFilter)) q = q.eq('mode', modeFilter)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body?.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 120) : 'Neuer Chat'
  const mode: Mode = VALID_MODES.includes(body?.mode) ? body.mode : 'tagro'
  const projectId: string | null = typeof body?.projectId === 'string' && body.projectId
    ? body.projectId : null

  const { data, error } = await (supa as any)
    .from('tagro_conversations')
    .insert({
      user_id: user.id,
      title,
      mode,
      project_id: projectId,
      status: 'active',
    })
    .select('id,title,pinned,mode,project_id,status,summary,created_at,updated_at,ended_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}
