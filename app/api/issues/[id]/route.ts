import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ISSUE_TERMINAL_STATUSES,
  isValidIssueSeverity,
  isValidIssueStatus,
  isValidIssueType,
  type IssueUpdateInput,
} from '@/lib/issues/types'

export const runtime = 'nodejs'

const PATCHABLE = new Set([
  'title',
  'description',
  'issue_type',
  'severity',
  'status',
  'impact',
  'owner',
  'labels',
  'tagro_summary',
  'tagro_confidence',
])

/**
 * GET    /api/issues/:id?expand=tasks
 * PATCH  /api/issues/:id
 * DELETE /api/issues/:id   — soft-close unless ?hard=1
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const expand = new URL(req.url).searchParams.get('expand')?.split(',') ?? []
  const wantTasks = expand.includes('tasks')

  const { data, error } = await (supa as any)
    .from('issues')
    .select('*')
    .eq('id', ctx.params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let project: any = null
  if (data.project_id) {
    const { data: p } = await (supa as any)
      .from('projects')
      .select('id,title,color,status')
      .eq('id', data.project_id)
      .maybeSingle()
    project = p
  }

  let linked_tasks: any[] = []
  if (wantTasks) {
    const { data: links } = await (supa as any)
      .from('issue_task_links')
      .select('id,task_id,link_kind,created_at')
      .eq('issue_id', ctx.params.id)

    const taskIds = (links ?? []).map((l: any) => l.task_id)
    if (taskIds.length > 0) {
      const { data: tasks } = await (supa as any)
        .from('tasks')
        .select('id,title,status,dev_status,client_status,priority')
        .in('id', taskIds)
      const taskMap = new Map((tasks ?? []).map((t: any) => [t.id, t]))
      linked_tasks = (links ?? []).map((l: any) => ({
        ...l,
        task: taskMap.get(l.task_id) ?? null,
      }))
    }
  }

  return NextResponse.json({ issue: data, project, linked_tasks })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as IssueUpdateInput
  const patch: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body)) {
    if (!PATCHABLE.has(key)) continue
    if (key === 'title' && typeof value === 'string') patch.title = value.trim().slice(0, 240)
    else if (key === 'description') patch.description = value ? String(value).slice(0, 8000) : null
    else if (key === 'impact') patch.impact = value ? String(value).slice(0, 2000) : null
    else if (key === 'issue_type' && isValidIssueType(String(value))) patch.issue_type = value
    else if (key === 'severity' && isValidIssueSeverity(String(value))) patch.severity = value
    else if (key === 'status' && isValidIssueStatus(String(value))) patch.status = value
    else if (key === 'owner') patch.owner = value || null
    else if (key === 'labels' && Array.isArray(value)) {
      patch.labels = value.map(v => String(v).trim()).filter(Boolean).slice(0, 20)
    }
    else if (key === 'tagro_summary') patch.tagro_summary = value ? String(value).slice(0, 4000) : null
    else if (key === 'tagro_confidence' && typeof value === 'number') {
      patch.tagro_confidence = Math.max(0, Math.min(1, value))
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
  }

  if (patch.status && ISSUE_TERMINAL_STATUSES.has(patch.status as any)) {
    patch.resolved_at = new Date().toISOString()
  } else if (patch.status === 'open' || patch.status === 'in_progress') {
    patch.resolved_at = null
  }

  const { data, error } = await (supa as any)
    .from('issues')
    .update(patch)
    .eq('id', ctx.params.id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({ issue: data })
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'

  if (hard) {
    const { error } = await (supa as any).from('issues').delete().eq('id', ctx.params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: true })
  }

  const { data, error } = await (supa as any)
    .from('issues')
    .update({ status: 'closed', resolved_at: new Date().toISOString() })
    .eq('id', ctx.params.id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({ issue: data, closed: true })
}
