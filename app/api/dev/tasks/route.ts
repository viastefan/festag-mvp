import { NextResponse } from 'next/server'
import { assertDevRole, devAccessibleProjectIds, resolveDevApiContext } from '@/lib/dev-api'

export const runtime = 'nodejs'

/**
 * GET /api/dev/tasks
 *
 * Task list for the dev panel. PIN devs have no Supabase session, so this
 * route reads through the service client with assignment-based filtering.
 */
export async function GET(req: Request) {
  const ctx = await resolveDevApiContext(req)
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const isDev = await assertDevRole(ctx.db, ctx.user.id)
  if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

  const uid = ctx.user.id
  const { data: pa } = await (ctx.db as any)
    .from('project_assignments')
    .select('project_id,projects(id,title,color)')
    .eq('user_id', uid)
    .eq('active', true)

  const projects = ((pa as any[]) ?? []).map(r => r.projects).filter(Boolean)
  const projIds = projects.map((p: any) => p.id)

  let q = (ctx.db as any)
    .from('tasks')
    .select('id,title,description,dev_description,client_description,status,dev_status,client_status,client_visible_status,priority,project_id,parent_task_id,assigned_to,estimated_hours,branch_name,work_type,definition_of_done,expected_outcome,required_proof_types,tagro_verification_status,tagro_confidence,tagro_verification_summary,tagro_internal_notes,tagro_client_summary,finished_by_dev_at,verified_by_tagro_at,approved_by_owner_at,last_dev_action_at,created_at,updated_at,due_date,projects(title,color,user_id,client_id)')
    .order('last_dev_action_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(300)

  if (projIds.length > 0) {
    q = q.or(`assigned_to.eq.${uid},project_id.in.(${projIds.join(',')})`)
  } else {
    q = q.eq('assigned_to', uid)
  }

  const { data: tasks, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projectIds = await devAccessibleProjectIds(ctx.db, uid)

  return NextResponse.json({
    tasks: tasks ?? [],
    projects,
    accessible_project_ids: projectIds,
  })
}
