import { NextResponse } from 'next/server'
import { assertDevRole, devAccessibleProjectIds, resolveDevApiContext } from '@/lib/dev-api'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'

export const runtime = 'nodejs'

/**
 * GET /api/dev/decisions
 * Lists decisions across projects the dev can access.
 */
export async function GET(req: Request) {
  const ctx = await resolveDevApiContext(req)
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const isDev = await assertDevRole(ctx.db, ctx.user.id)
  if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

  const url = new URL(req.url)
  const taskId = url.searchParams.get('task_id')

  const projectIds = await devAccessibleProjectIds(ctx.db, ctx.user.id)
  if (!projectIds.length) {
    return NextResponse.json({ decisions: [], projects: [], open_count: 0 })
  }

  let q = (ctx.db as any)
    .from('decisions')
    .select('id,project_id,title,client_title,status,urgency,response_type,decision_type,requested_for,created_by,source_task_id,created_at,updated_at,decided_at,tagro_delegation_reason,escalation_level,due_at,due_date')
    .order('created_at', { ascending: false })
    .limit(taskId ? 20 : 200)

  if (taskId) {
    q = q.eq('source_task_id', taskId).in('project_id', projectIds)
  } else {
    q = q.in('project_id', projectIds)
  }

  const { data: decisions, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: projects } = await (ctx.db as any)
    .from('projects')
    .select('id,title,color')
    .in('id', projectIds)

  const rows = (decisions as any[]) ?? []
  const openCount = rows.filter(d => DECISION_OPEN_STATUS_LIST.includes(d.status)).length

  return NextResponse.json({
    decisions: rows,
    projects: projects ?? [],
    open_count: openCount,
  })
}
