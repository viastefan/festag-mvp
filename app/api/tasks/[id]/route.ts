import { NextResponse } from 'next/server'
import { isContextError, loadTaskContext } from '@/lib/tasks/server'
import { normalizePriority } from '@/lib/tasks/lifecycle'
import { emitTaskEvent } from '@/lib/sync/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/tasks/[id] — the full detail bundle in one round trip. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response

  const { supabase, task, access } = ctx
  const clientLens = access.role === 'client' || access.role === 'observer'

  const [projectRes, checklistRes, logsRes, peopleRes, decisionRes] = await Promise.all([
    (supabase as any).from('projects').select('id,title,color,status,phase,workspace_id').eq('id', task.project_id).maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
    (supabase as any).from('task_checklist_items').select('id,label,done,done_at,position').eq('task_id', task.id).order('position')
      .then((r: any) => r, () => ({ data: [] })),
    buildActivityQuery(supabase, task.id, clientLens),
    loadProfiles(supabase, [task.assigned_to, task.created_by, task.approved_by].filter(Boolean) as string[]),
    task.source_decision_id
      ? (supabase as any).from('decisions').select('id,title,status').eq('id', task.source_decision_id).maybeSingle()
        .then((r: any) => r, () => ({ data: null }))
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json({
    task,
    project: projectRes?.data ?? null,
    checklist: (checklistRes?.data as any[]) ?? [],
    activity: (logsRes?.data as any[]) ?? [],
    people: peopleRes,
    decision: decisionRes?.data ?? null,
    access,
  })
}

/**
 * PATCH /api/tasks/[id] — content edits only.
 * The lifecycle never moves through here; that is /transition, so every state
 * change carries a reason, an actor and an audit entry.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response

  const { writer, task, access, user } = ctx
  if (!access.canEdit) return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  const changed: string[] = []

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 })
    if (title !== task.title) { patch.title = title; changed.push('Titel') }
  }
  if (typeof body.description === 'string') {
    const description = body.description.trim()
    if (description !== (task.description ?? '')) {
      patch.description = description || null
      // the client lens reads client_description — keep the two in step when
      // the person editing is the one the client lens belongs to
      if (access.role === 'client') patch.client_description = description || null
      changed.push('Beschreibung')
    }
  }
  if ('priority' in body) {
    const priority = normalizePriority(body.priority)
    if (priority !== (task.priority ?? null)) { patch.priority = priority; changed.push('Priorität') }
  }
  if ('dueDate' in body || 'due_date' in body) {
    const due = normalizeDate(body.dueDate ?? body.due_date)
    if (due !== (task.due_date ?? null)) { patch.due_date = due; changed.push('Termin') }
  }
  if ('definitionOfDone' in body) {
    const dod = String(body.definitionOfDone ?? '').trim()
    if (dod !== (task.definition_of_done ?? '')) { patch.definition_of_done = dod || null; changed.push('Definition of Done') }
  }
  if (Array.isArray(body.labels)) {
    const labels = body.labels.map((l: unknown) => String(l).trim()).filter(Boolean).slice(0, 8)
    patch.tags = labels.length ? labels : null
    patch.label = labels[0] ?? null
    changed.push('Labels')
  }
  if ('assignedTo' in body || 'assigned_to' in body) {
    if (!access.canAssign) return NextResponse.json({ error: 'assign_not_allowed' }, { status: 403 })
    const assignedTo = String(body.assignedTo ?? body.assigned_to ?? '').trim() || null
    if (assignedTo !== (task.assigned_to ?? null)) {
      patch.assigned_to = assignedTo
      // handing work to someone moves an untouched task out of the raw stack
      if (assignedTo && task.dev_status === 'new') patch.dev_status = 'assigned'
      if (!assignedTo && task.dev_status === 'assigned') patch.dev_status = 'new'
      changed.push('Verantwortlich')
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: true, task, changed: [] })
  }

  const { data, error } = await (writer as any).from('tasks').update(patch).eq('id', task.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (patch.assigned_to !== undefined && patch.assigned_to) {
    await emitTaskEvent(writer as any, 'task_assigned', {
      taskId: task.id,
      projectId: task.project_id,
      actorId: user.id,
      actorKind: 'human',
      taskTitle: data.title,
      payload: { assigned_to: patch.assigned_to },
    }).catch(() => undefined)
  }

  await (writer as any).from('task_activity_logs').insert({
    task_id: task.id,
    project_id: task.project_id,
    actor_id: user.id,
    actor_kind: 'human',
    event: 'task_edited',
    metadata: { taskTitle: data.title, fields: changed },
    visible_to_client: changed.some((field) => field !== 'Definition of Done'),
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true, task: data, changed })
}

/** DELETE /api/tasks/[id] — hard delete. Only owners and leads. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response

  const { writer, task, access, user } = ctx
  const isCreator = task.created_by === user.id
  if (!access.canDelete && !isCreator) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  const { error } = await (writer as any).from('tasks').delete().eq('id', task.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: task.id })
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function buildActivityQuery(supabase: any, taskId: string, clientLens: boolean) {
  let query = supabase
    .from('task_activity_logs')
    .select('id,event,actor_id,actor_kind,metadata,visible_to_client,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (clientLens) query = query.eq('visible_to_client', true)
  return query.then((r: any) => r, () => ({ data: [] }))
}

async function loadProfiles(supabase: any, ids: string[]) {
  if (!ids.length) return []
  const { data } = await supabase
    .from('profiles').select('id,full_name,first_name,email,avatar_url').in('id', Array.from(new Set(ids)))
    .then((r: any) => r, () => ({ data: [] }))
  return ((data as any[]) ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.first_name || profile.email || 'Teammitglied',
    email: profile.email ?? null,
    avatar_url: profile.avatar_url ?? null,
  }))
}
