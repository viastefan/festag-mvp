import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rememberTagroMemory } from '@/lib/tagro-memory'

export const runtime = 'nodejs'

/**
 * POST /api/tagro/memory
 * Persist a short Tagro handoff note after the user accepts a preview.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const content = String(body.content || '').trim()
  if (!content) return NextResponse.json({ ok: false, error: 'content_required' }, { status: 400 })

  const projectId = typeof body.projectId === 'string' ? body.projectId : null
  const scope = body.scope === 'project' ? 'project' : body.scope === 'handoff' ? 'handoff' : 'account'
  const key = typeof body.key === 'string' ? body.key : null

  const id = await rememberTagroMemory({
    userId: user.id,
    projectId,
    scope,
    key,
    content: content.slice(0, 1200),
    source: 'tagro-overlay',
    confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
  })

  return NextResponse.json({ ok: true, id })
}
