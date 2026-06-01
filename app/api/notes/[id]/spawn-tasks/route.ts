import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/notes/:id/spawn-tasks  { indices: number[] }
 *
 * Turns the chosen Veyra task suggestions (indices into
 * notes.tagro_suggestions.tasks) into real rows in the tasks table.
 * Links each via notes_spawned_tasks so the UI can show "3 Tasks
 * aus dieser Notiz" without polluting the tasks schema.
 *
 *   • created_by_tagro=true so the dev panel knows the provenance.
 *   • source='note' + note_id surfaced in metadata.
 *   • If the note has a project_id, the task inherits it.
 *
 * Returns the created tasks so the client can update its drawer
 * inline without a refetch.
 */

type SpawnBody = { indices?: number[] }

const PRIORITY_MAP: Record<string, string> = { high: 'high', medium: 'medium', low: 'low' }

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as SpawnBody
  const indices = Array.isArray(body?.indices) ? body.indices.filter(n => Number.isInteger(n) && n >= 0) : []
  if (!indices.length) return NextResponse.json({ error: 'no indices' }, { status: 400 })

  const { data: note } = await (supa as any)
    .from('notes')
    .select('id,title,project_id,tagro_suggestions,shared_with,user_id')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const isOwnerOrShared = note.user_id === user.id || (Array.isArray(note.shared_with) && note.shared_with.includes(user.id))
  if (!isOwnerOrShared) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  const suggestions = (note.tagro_suggestions || {}) as { tasks?: Array<{ title: string; why?: string; priority?: string; estimated_hours?: number }> }
  const proposedTasks = Array.isArray(suggestions.tasks) ? suggestions.tasks : []

  const service = getServiceClient() ?? supa
  const taskRows = indices
    .map(i => ({ idx: i, t: proposedTasks[i] }))
    .filter(x => x.t && typeof x.t.title === 'string' && x.t.title.trim().length > 0)

  if (!taskRows.length) return NextResponse.json({ error: 'no valid suggestions at given indices' }, { status: 400 })

  const inserts = taskRows.map(({ t }) => ({
    title: t.title.trim(),
    description: t.why ? `${t.why}\n\n— Aus Notiz „${note.title || 'ohne Titel'}".` : `Aus Notiz „${note.title || 'ohne Titel'}".`,
    priority: PRIORITY_MAP[String(t.priority || 'medium').toLowerCase()] || 'medium',
    estimated_hours: typeof t.estimated_hours === 'number' ? t.estimated_hours : null,
    project_id: note.project_id || null,
    status: 'todo',
    source: 'note',
    created_by: user.id,
    created_by_tagro: true,
  }))

  const { data: createdTasks, error: tErr } = await (service as any)
    .from('tasks').insert(inserts).select('id,title,status,priority,project_id')
  if (tErr || !createdTasks) {
    return NextResponse.json({ error: tErr?.message || 'task insert failed' }, { status: 500 })
  }

  const links = (createdTasks as any[]).map((task, i) => ({
    note_id: ctx.params.id,
    task_id: task.id,
    suggestion_idx: taskRows[i].idx,
    spawned_by: user.id,
  }))
  await (service as any).from('notes_spawned_tasks').insert(links)

  return NextResponse.json({ tasks: createdTasks, count: createdTasks.length })
}
