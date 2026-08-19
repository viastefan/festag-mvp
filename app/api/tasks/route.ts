import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveProjectAccess, resolveWorkspaceAccess, taskVisibleTo } from '@/lib/tasks/access'
import { bucketOf, isTaskLifecycle, normalizePriority, type TaskBucket } from '@/lib/tasks/lifecycle'
import { createManualClientTask, createTagroClientTask } from '@/lib/tagro/task-actions'
import { TASK_PROPOSAL_RUN } from '@/lib/tagro/model/runs'
import { runTagroModel } from '@/lib/tagro/run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TASK_FIELDS = [
  'id', 'project_id', 'title', 'description', 'client_description', 'dev_description',
  'dev_status', 'client_visible_status', 'status', 'client_status', 'priority', 'progress',
  'assigned_to', 'created_by', 'due_date', 'blocked_reason', 'label', 'tags',
  'task_type', 'group_key', 'work_type', 'audience', 'client_visible', 'source', 'origin',
  'latest_client_update', 'latest_dev_update', 'tagro_client_summary', 'customer_update',
  'definition_of_done', 'expected_outcome', 'tagro_verification_status', 'tagro_confidence',
  'created_at', 'updated_at', 'completed_at', 'started_at', 'cancelled_at',
  'source_decision_id', 'parent_task_id',
].join(',')

/**
 * GET /api/tasks
 *
 * The canonical task list. Scoped by real project access (not by RLS luck),
 * shaped per role lens, with the counts the UI renders without recomputing.
 *
 *   ?project=<uuid|all>  ?view=<bucket|attention|all>  ?q=  ?assignee=me|unassigned|<uuid>
 *   ?priority=  ?limit=  ?includeDone=1
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const projectParam = url.searchParams.get('project') || 'all'
    const view = url.searchParams.get('view') || 'all'
    const q = (url.searchParams.get('q') || '').trim()
    const assignee = url.searchParams.get('assignee') || 'all'
    const priority = url.searchParams.get('priority') || 'all'
    const limit = Math.min(500, Math.max(20, Number(url.searchParams.get('limit')) || 300))

    const access = await resolveWorkspaceAccess(supabase as any, user.id)
    const projectIds = Array.from(access.keys())

    if (!projectIds.length) {
      return NextResponse.json({
        tasks: [], projects: [], people: [], access: {},
        counts: emptyCounts(), viewer: { id: user.id },
      })
    }

    const scopedIds = projectParam !== 'all' && access.has(projectParam) ? [projectParam] : projectIds

    let query = (supabase as any)
      .from('tasks')
      .select(TASK_FIELDS)
      .in('project_id', scopedIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,client_description.ilike.%${q}%`)
    if (assignee === 'me') query = query.eq('assigned_to', user.id)
    else if (assignee === 'unassigned') query = query.is('assigned_to', null)
    else if (assignee !== 'all') query = query.eq('assigned_to', assignee)
    if (priority !== 'all') query = query.eq('priority', priority)

    const [tasksRes, projectsRes] = await Promise.all([
      query,
      (supabase as any).from('projects').select('id,title,color,status,phase').in('id', projectIds).order('title'),
    ])

    if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })

    const rows = ((tasksRes.data as any[]) ?? []).filter((row) => {
      const grant = access.get(row.project_id)
      return grant ? taskVisibleTo(row, grant.role) : false
    })

    // people who can own work here — powers assignment without a second request
    const people = await loadPeople(supabase as any, projectIds)

    const counts = countBuckets(rows)
    const filtered = view === 'all' || !view
      ? rows
      : view === 'attention'
        ? rows.filter((row) => needsAttention(row, user.id))
        : rows.filter((row) => bucketOf(normalizeFlow(row.dev_status)) === (view as TaskBucket))

    return NextResponse.json({
      tasks: filtered,
      projects: (projectsRes.data as any[]) ?? [],
      people,
      access: Object.fromEntries(access),
      counts,
      viewer: { id: user.id },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'server_error' }, { status: 500 })
  }
}

/**
 * POST /api/tasks
 *
 * Create a task. Two modes, one row:
 *   mode=manual  → written exactly as the person typed it
 *   mode=tagro   → Tagro structures it first; `confirm` persists the proposal
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const projectId = String(body.projectId || body.project_id || '').trim()
    const mode = body.mode === 'tagro' ? 'tagro' : 'manual'
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()

    if (!projectId) return NextResponse.json({ error: 'project_required' }, { status: 400 })
    if (!title && !description) return NextResponse.json({ error: 'title_required' }, { status: 400 })

    const grant = await resolveProjectAccess(supabase as any, projectId, user.id)
    if (!grant) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (!grant.canCreate) return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

    const sb = (getServiceClient() as any) ?? supabase
    const labels: string[] = Array.isArray(body.labels)
      ? body.labels.map((l: unknown) => String(l).trim()).filter(Boolean).slice(0, 8)
      : []
    const dueDate = normalizeDueDate(body.dueDate ?? body.due_date)

    // ── Tagro mode: structure first, persist only on confirm ──────────────
    if (mode === 'tagro') {
      let proposal = body.proposal
      if (!proposal || body.regenerate) {
        const result = await runTagroModel({
          sb,
          definition: TASK_PROPOSAL_RUN,
          input: {
            title: title || description.split(/\s+/).slice(0, 9).join(' '),
            description: body.regenerate
              ? `${description || title}\n\nBitte kürzer, klarer und prüfbarer formulieren.`
              : description,
          },
          projectId,
          actorId: user.id,
        })
        proposal = { ...(result.output as any), used_operational_dna: result.usedOperationalDna }
      }
      if (!body.confirm) {
        return NextResponse.json({ ok: true, proposal })
      }
      const task = await createTagroClientTask({
        sb, actorId: user.id, projectId, proposal,
        originalText: description || title, dueDate, labels,
      })
      const finished = await applyCreateExtras(sb, task, body, grant, user.id)
      return NextResponse.json({ ok: true, task: finished })
    }

    // ── Manual mode ───────────────────────────────────────────────────────
    const task = await createManualClientTask({
      sb,
      actorId: user.id,
      projectId,
      title: title || description.split(/\s+/).slice(0, 9).join(' '),
      description,
      priority: normalizePriority(body.priority) ?? 'none',
      dueDate,
      labels,
    })
    const finished = await applyCreateExtras(sb, task, body, grant, user.id)
    return NextResponse.json({ ok: true, task: finished })
  } catch (error: any) {
    const message = error?.message || 'create_failed'
    const status = message === 'project_access_denied' ? 403 : message === 'project_not_found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Fields the creation helpers don't know about — assignment, definition of
 * done, work type, acceptance checklist. Applied in one follow-up write so
 * the lifecycle trigger sees a single coherent row.
 */
async function applyCreateExtras(
  sb: any,
  task: any,
  body: any,
  grant: { canAssign: boolean },
  actorId: string,
) {
  if (!task?.id) return task
  const patch: Record<string, unknown> = {}

  const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo.trim() : ''
  if (assignedTo && grant.canAssign) {
    patch.assigned_to = assignedTo
    patch.dev_status = 'assigned'
  }
  const dod = String(body.definitionOfDone || '').trim()
  if (dod) patch.definition_of_done = dod
  const workType = String(body.workType || '').trim()
  if (workType) patch.work_type = workType
  const priority = normalizePriority(body.priority)
  if (priority) patch.priority = priority

  let updated = task
  if (Object.keys(patch).length) {
    const { data } = await sb.from('tasks').update(patch).eq('id', task.id).select('*').maybeSingle()
    if (data) updated = data
  }

  const checklist: string[] = Array.isArray(body.checklist)
    ? body.checklist.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 20)
    : []
  if (checklist.length) {
    await sb.from('task_checklist_items').insert(
      checklist.map((label, index) => ({
        task_id: task.id, position: index, label, created_by: actorId,
      })),
    ).then(() => null, () => null)
  }

  return updated
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function normalizeFlow(value: unknown) {
  return isTaskLifecycle(value) ? value : 'new'
}

/* Kein Export: Next lässt in Route-Modulen nur die Handler zu — ein weiterer
   Export ist ein Typfehler (TS2344), auch wenn der Build ihn verschluckt. */
function normalizeDueDate(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const date = new Date(`${match[0]}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : match[0]
}

function emptyCounts() {
  return { all: 0, open: 0, active: 0, waiting: 0, review: 0, done: 0, attention: 0 }
}

function countBuckets(rows: any[]) {
  const counts = emptyCounts()
  for (const row of rows) {
    const bucket = bucketOf(normalizeFlow(row.dev_status))
    counts[bucket] += 1
    if (bucket !== 'done') counts.all += 1
  }
  counts.attention = rows.filter((row) => needsAttention(row, null)).length
  return counts
}

function needsAttention(row: any, userId: string | null) {
  const flow = normalizeFlow(row.dev_status)
  if (flow === 'completed' || flow === 'approved_by_owner' || flow === 'cancelled') return false
  if (flow === 'blocked' || flow === 'needs_review') return true
  if (flow === 'finished_by_dev' || flow === 'verified_by_tagro') return true
  if (row.due_date && new Date(`${row.due_date}T23:59:59`).getTime() < Date.now()) return true
  if (!row.assigned_to && flow === 'new') return true
  if (userId && row.assigned_to === userId && flow === 'assigned') return true
  return false
}

async function loadPeople(sb: any, projectIds: string[]) {
  const [membersRes, projectsRes] = await Promise.all([
    sb.from('project_members').select('project_id,user_id,role').in('project_id', projectIds)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('projects').select('id,user_id,client_id').in('id', projectIds)
      .then((r: any) => r, () => ({ data: [] })),
  ])

  const ids = new Set<string>()
  for (const row of ((membersRes?.data as any[]) ?? [])) if (row.user_id) ids.add(row.user_id)
  for (const row of ((projectsRes?.data as any[]) ?? [])) {
    if (row.user_id) ids.add(row.user_id)
    if (row.client_id) ids.add(row.client_id)
  }
  if (!ids.size) return []

  const { data } = await sb
    .from('profiles')
    .select('id,full_name,first_name,email,avatar_url,role')
    .in('id', Array.from(ids))
    .then((r: any) => r, () => ({ data: [] }))

  const byProject = new Map<string, string[]>()
  for (const row of ((membersRes?.data as any[]) ?? [])) {
    if (!row.user_id) continue
    const list = byProject.get(row.project_id) ?? []
    list.push(row.user_id)
    byProject.set(row.project_id, list)
  }
  for (const row of ((projectsRes?.data as any[]) ?? [])) {
    const list = byProject.get(row.id) ?? []
    if (row.user_id && !list.includes(row.user_id)) list.push(row.user_id)
    byProject.set(row.id, list)
  }

  return ((data as any[]) ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.first_name || profile.email || 'Teammitglied',
    email: profile.email ?? null,
    avatar_url: profile.avatar_url ?? null,
    projects: Array.from(byProject.entries()).filter(([, users]) => users.includes(profile.id)).map(([id]) => id),
  }))
}
