import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ISSUE_OPEN_STATUSES,
  isValidIssueSeverity,
  isValidIssueSource,
  isValidIssueStatus,
  isValidIssueType,
  type IssueCreateInput,
} from '@/lib/issues/types'
import { isMissingTableError } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/**
 * GET /api/issues
 *   Lists issues for projects the current user can access.
 *   Query: project_id?, status?, open=1, severity?, limit?
 *
 * POST /api/issues
 *   Body: IssueCreateInput
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id')
  const status = params.get('status')
  const severity = params.get('severity')
  const onlyOpen = params.get('open') === '1'
  const limit = Math.min(Number(params.get('limit') || 200), 500)

  let q = (supa as any)
    .from('issues')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (projectId) q = q.eq('project_id', projectId)
  if (status && isValidIssueStatus(status)) q = q.eq('status', status)
  if (severity && isValidIssueSeverity(severity)) q = q.eq('severity', severity)
  if (onlyOpen) q = q.in('status', Array.from(ISSUE_OPEN_STATUSES))

  const { data, error } = await q
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        issues: [],
        count: 0,
        open_count: 0,
        table_ready: false,
        hint: 'Migration ausführen: supabase db push',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as any[]
  const openCount = rows.filter(r => ISSUE_OPEN_STATUSES.has(r.status)).length

  return NextResponse.json({
    issues: rows,
    count: rows.length,
    open_count: openCount,
  })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as IssueCreateInput

  if (!body.project_id || !body.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  const { data: project, error: projectErr } = await (supa as any)
    .from('projects')
    .select('id,workspace_id')
    .eq('id', body.project_id)
    .maybeSingle()

  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const issueType = isValidIssueType(body.issue_type) ? body.issue_type : 'bug'
  const severity = isValidIssueSeverity(body.severity) ? body.severity : 'medium'
  const status = isValidIssueStatus(body.status) ? body.status : 'open'
  const source = isValidIssueSource(body.source) ? body.source : 'manual'

  const labels = Array.isArray(body.labels)
    ? body.labels.map(l => String(l).trim()).filter(Boolean).slice(0, 20)
    : []

  const { data: issue, error } = await (supa as any)
    .from('issues')
    .insert({
      project_id: body.project_id,
      workspace_id: project.workspace_id ?? null,
      title: body.title.trim().slice(0, 240),
      description: body.description?.slice(0, 8000) || null,
      issue_type: issueType,
      severity,
      status,
      impact: body.impact?.slice(0, 2000) || null,
      owner: body.owner || user.id,
      reporter: user.id,
      source,
      source_id: body.source_id?.slice(0, 200) || null,
      source_url: body.source_url?.slice(0, 2000) || null,
      labels,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const taskIds = Array.isArray(body.task_ids)
    ? body.task_ids.filter(Boolean).slice(0, 20)
    : []

  if (taskIds.length > 0) {
    const links = taskIds.map(taskId => ({
      issue_id: issue.id,
      task_id: taskId,
      link_kind: 'related',
    }))
    await (supa as any).from('issue_task_links').insert(links)
  }

  try {
    const { emitDevActionToClient } = await import('@/lib/client/connection-bridge')
    await emitDevActionToClient(supa as any, {
      projectId: body.project_id,
      type: 'risk_reported',
      content: `Issue gemeldet: ${body.title.trim()} (${severity})${body.description ? `\n${body.description.slice(0, 400)}` : ''}`,
      source: 'issue_create',
      visibility: 'team',
      createdBy: user.id,
      notifyClient: false,
    })
  } catch { /* non-blocking */ }

  return NextResponse.json({ issue })
}
