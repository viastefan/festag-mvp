import { canAccessExecutionPanel } from '@/lib/execution-panel/access'
import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { devPanelSurfaceForProject } from '@/lib/projects/delivery-bridge'
import { resolveWorkspaceIdsForUser } from '@/lib/workspace/resolve'

export const runtime = 'nodejs'

/**
 * GET /api/dev/projects/available
 *
 * Workspace-scoped pool for the Execution perspective:
 *   - Projects in workspaces the user belongs to
 *   - Plus festag_delivery projects (platform pool for approved `dev`)
 *   - Always include projects the user is already assigned to
 *
 * @see docs/festag-workspace-portal-system.md
 */
export async function GET(req: Request) {
  let user: { id: string; role?: string } | null = getDevUserFromRequest(req)
  if (!user) {
    try {
      const supa = createClient()
      const result = await Promise.race([
        supa.auth.getUser(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
      user = result.data?.user ?? null
    } catch {
      // continue without supabase auth
    }
  }
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  }

  const { data: profile } = await (service as any)
    .from('profiles')
    .select('role,approval_status')
    .eq('id', user.id)
    .maybeSingle()
  if (!canAccessExecutionPanel(profile)) {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  const workspaceIds = await resolveWorkspaceIdsForUser(service as any, user.id)
  const isPlatformDev = profile?.role === 'dev' || profile?.role === 'admin'

  // Assignments first — always visible in "mine"
  const { data: myActiveAll } = await (service as any)
    .from('project_assignments')
    .select('project_id,role_on_project,created_at')
    .eq('user_id', user.id)
    .eq('active', true)
  const mineIds = new Set((myActiveAll ?? []).map((row: any) => row.project_id).filter(Boolean))

  let projectQuery = (service as any)
    .from('projects')
    .select('id,title,description,scope_summary,color,status,project_type,delivery_model,created_at,user_id,workspace_id,client_id,budget_min,budget_max,budget_currency')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(120)

  // Restrict the candidate set: workspace projects ∪ festag pool ∪ already assigned
  const orParts: string[] = []
  if (workspaceIds.length) {
    orParts.push(`workspace_id.in.(${workspaceIds.join(',')})`)
  }
  if (isPlatformDev) {
    orParts.push('delivery_model.eq.festag_delivery')
  }
  if (mineIds.size) {
    orParts.push(`id.in.(${Array.from(mineIds).join(',')})`)
  }

  if (orParts.length === 0) {
    return NextResponse.json({ available: [], mine: [], pendingProposals: [] })
  }

  projectQuery = projectQuery.or(orParts.join(','))

  const { data: projects } = await projectQuery
  const ids = (projects ?? []).map((p: any) => p.id)

  const { data: assignCounts } = ids.length ? await (service as any)
    .from('project_assignments')
    .select('project_id')
    .in('project_id', ids)
    .eq('active', true) : { data: [] as any[] }
  const countByProject = new Map<string, number>()
  ;(assignCounts ?? []).forEach((row: any) => {
    countByProject.set(row.project_id, (countByProject.get(row.project_id) ?? 0) + 1)
  })

  const workspaceIdsOnProjects = Array.from(new Set((projects ?? []).map((p: any) => p.workspace_id).filter(Boolean)))
  const clientIds = Array.from(new Set((projects ?? []).map((p: any) => p.client_id).filter(Boolean)))
  const workspaceName = new Map<string, string>()
  const clientName = new Map<string, string>()
  if (workspaceIdsOnProjects.length) {
    const { data: ws } = await (service as any).from('workspaces').select('id,name').in('id', workspaceIdsOnProjects)
    ;(ws ?? []).forEach((w: any) => workspaceName.set(w.id, w.name))
  }
  if (clientIds.length) {
    const { data: cp } = await (service as any).from('profiles').select('id,full_name,email').in('id', clientIds)
    ;(cp ?? []).forEach((c: any) => clientName.set(c.id, c.full_name || c.email || null))
  }

  let proposalProjectIds = new Set<string>()
  let projectsWithActiveProposal = new Set<string>()
  let pendingProposals: any[] = []
  try {
    const { data: myProposals } = ids.length ? await (service as any)
      .from('project_proposals')
      .select('project_id,status')
      .eq('dev_id', user.id)
      .in('project_id', ids)
      .in('status', ['proposed', 'budget_clarification', 'accepted']) : { data: [] as any[] }
    proposalProjectIds = new Set((myProposals ?? []).map((p: any) => p.project_id))

    const { data: activeProposals } = ids.length ? await (service as any)
      .from('project_proposals')
      .select('project_id')
      .in('project_id', ids)
      .in('status', ['proposed', 'budget_clarification', 'accepted']) : { data: [] as any[] }
    projectsWithActiveProposal = new Set((activeProposals ?? []).map((p: any) => p.project_id))

    const { data: pp } = await (service as any)
      .from('project_proposals')
      .select('id,project_id,status,dev_proposed_price,dev_clarification_translated,client_response_translated,role_on_project,is_team_lead,created_at,expires_at')
      .eq('dev_id', user.id)
      .in('status', ['proposed', 'budget_clarification'])
      .order('created_at', { ascending: false })
    pendingProposals = pp ?? []
  } catch { /* proposals table may be missing */ }

  const available: any[] = []
  const mine: any[] = []
  const userWs = new Set(workspaceIds)

  for (const p of (projects ?? [])) {
    const inUserWorkspace = p.workspace_id && userWs.has(p.workspace_id)
    const shape = {
      id: p.id,
      title: p.title,
      description: p.description,
      scope_summary: p.scope_summary,
      color: p.color,
      status: p.status,
      project_type: p.project_type,
      created_at: p.created_at,
      assigned_count: countByProject.get(p.id) ?? 0,
      workspace_name: p.workspace_id ? (workspaceName.get(p.workspace_id) ?? null) : null,
      client_name: p.client_id ? (clientName.get(p.client_id) ?? null) : null,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      budget_currency: p.budget_currency,
    }
    if (mineIds.has(p.id)) { mine.push(shape); continue }

    // Pool pickup: festag_delivery for platform devs, or workspace-local visibility
    const surface = devPanelSurfaceForProject({
      deliveryModel: p.delivery_model,
      devHasActiveAssignment: false,
      devHasActiveProposal: proposalProjectIds.has(p.id),
      projectHasBlockingProposal: projectsWithActiveProposal.has(p.id),
    })
    if (surface !== 'pool_available') continue
    if (p.delivery_model === 'festag_delivery' && isPlatformDev) {
      available.push(shape)
      continue
    }
    if (inUserWorkspace) available.push(shape)
  }

  return NextResponse.json({ available, mine, pendingProposals: pendingProposals ?? [] })
}
