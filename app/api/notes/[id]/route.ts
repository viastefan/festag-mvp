import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET    /api/notes/:id          → full note row
 * PATCH  /api/notes/:id          → partial update (title, body, tags, project_id, status, shared_with)
 * DELETE /api/notes/:id          → soft delete (status='archived'), unless ?hard=1 then hard delete
 */

const PATCHABLE = ['title', 'body', 'tags', 'project_id', 'status', 'shared_with'] as const

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data, error } = await (supa as any).from('notes').select('*').eq('id', ctx.params.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Also fetch spawned tasks for the detail drawer.
  const { data: spawned } = await (supa as any)
    .from('notes_spawned_tasks')
    .select('task_id,suggestion_idx,spawned_at,task:tasks(id,title,status,priority)')
    .eq('note_id', ctx.params.id)

  return NextResponse.json({ note: data, spawned: spawned ?? [] })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const k of PATCHABLE) {
    if (k in body) patch[k] = body[k]
  }
  if (Array.isArray(patch.tags)) patch.tags = (patch.tags as string[]).slice(0, 20)
  if (Array.isArray(patch.shared_with)) patch.shared_with = (patch.shared_with as string[]).slice(0, 50)
  if (typeof patch.title === 'string') patch.title = (patch.title as string).slice(0, 200)
  if (typeof patch.body === 'string') patch.body = (patch.body as string).slice(0, 20000)

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'no patchable fields' }, { status: 400 })
  }

  const { data, error } = await (supa as any).from('notes')
    .update(patch).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'
  if (hard) {
    const { error } = await (supa as any).from('notes').delete().eq('id', ctx.params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: 'hard' })
  }

  const { error } = await (supa as any).from('notes')
    .update({ status: 'archived' }).eq('id', ctx.params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: 'soft' })
}
