import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET    /api/notes/:id          → full note row
 * PATCH  /api/notes/:id          → partial update (title, body, tags, project_id, status, shared_with)
 * DELETE /api/notes/:id          → soft delete (status='archived'), unless ?hard=1 then hard delete
 */

const PATCHABLE = ['title', 'body', 'tags', 'project_id', 'status', 'shared_with', 'pinned', 'note_type'] as const
const NOTE_TYPES = new Set(['journal', 'brief', 'meeting', 'research'])

/**
 * Re-extract [[Backlinks]] from the body and write the notes_mentions table.
 * Resolves each title against the user's own notes (case-insensitive, first match wins).
 * Best-effort: failures are silent — backlinks are a convenience layer, not a constraint.
 */
async function rebuildMentions(supa: any, sourceId: string, body: string | null, userId: string) {
  try {
    await supa.from('notes_mentions').delete().eq('source_note_id', sourceId)
    if (!body) return
    const re = /\[\[([^\]\n]{1,200})\]\]/g
    const titleSet = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = re.exec(body)) !== null) {
      const t = match[1].trim()
      if (t) titleSet.add(t)
    }
    const titles = Array.from(titleSet)
    if (!titles.length) return
    const { data: matches } = await supa
      .from('notes')
      .select('id,title')
      .eq('user_id', userId)
      .in('title', titles)
    if (!matches?.length) return
    const links = matches
      .filter((m: any) => m.id !== sourceId)
      .map((m: any) => ({ source_note_id: sourceId, target_note_id: m.id }))
    if (links.length) await supa.from('notes_mentions').insert(links)
  } catch {
    /* swallow — mentions are non-critical */
  }
}

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

  // Backlinks: which other notes point to this one ("erwähnt von").
  const { data: backlinks } = await (supa as any)
    .from('notes_mentions')
    .select('source_note_id, source:notes!notes_mentions_source_note_id_fkey(id,title,updated_at)')
    .eq('target_note_id', ctx.params.id)
    .limit(50)

  return NextResponse.json({
    note: data,
    spawned: spawned ?? [],
    backlinks: (backlinks ?? []).map((b: any) => b.source).filter(Boolean),
  })
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
  if (typeof patch.pinned === 'string') patch.pinned = patch.pinned === 'true'
  if (typeof patch.note_type === 'string' && !NOTE_TYPES.has(patch.note_type as string)) {
    delete patch.note_type
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'no patchable fields' }, { status: 400 })
  }

  const { data, error } = await (supa as any).from('notes')
    .update(patch).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If body changed, rebuild backlinks for this note.
  if ('body' in patch) {
    await rebuildMentions(supa, ctx.params.id, (patch.body as string) ?? null, user.id)
  }

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
