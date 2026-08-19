/**
 * Festag — Task access resolution.
 *
 * One project graph, role lenses for visibility (Architecture confirmation).
 * This is the *server-side* answer to "who is this person on this project and
 * what may they do to this task". The UI asks the same question for rendering,
 * but the API never trusts the UI's answer — it resolves again here.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskViewerRole } from '@/lib/tasks/lifecycle'

export type ProjectAccess = {
  projectId: string
  role: TaskViewerRole
  /** may see internal-only tasks and the execution vocabulary */
  executionDepth: boolean
  /** may create tasks in this project */
  canCreate: boolean
  /** may edit content fields (title, description, priority, due date, labels) */
  canEdit: boolean
  /** may hand a task to someone */
  canAssign: boolean
  /** may permanently delete */
  canDelete: boolean
}

const OWNER_ROLES = new Set(['owner', 'project_owner', 'admin', 'workspace_owner'])
const LEAD_ROLES = new Set(['lead', 'lead_dev', 'manager', 'maintainer'])
const MEMBER_ROLES = new Set(['developer', 'dev', 'member', 'contributor', 'designer', 'editor'])
const CLIENT_ROLES = new Set(['client', 'stakeholder', 'customer'])
const OBSERVER_ROLES = new Set(['observer', 'viewer', 'guest', 'read_only'])

function rankOf(role: TaskViewerRole): number {
  return role === 'owner' ? 0 : role === 'lead' ? 1 : role === 'member' ? 2 : role === 'client' ? 3 : 4
}

/** Highest privilege wins when a person holds several roles. */
function strongest(a: TaskViewerRole | null, b: TaskViewerRole | null): TaskViewerRole | null {
  if (!a) return b
  if (!b) return a
  return rankOf(a) <= rankOf(b) ? a : b
}

function mapRole(raw?: string | null): TaskViewerRole | null {
  const value = String(raw ?? '').toLowerCase().trim()
  if (!value) return null
  if (OWNER_ROLES.has(value)) return 'owner'
  if (LEAD_ROLES.has(value)) return 'lead'
  if (MEMBER_ROLES.has(value)) return 'member'
  if (CLIENT_ROLES.has(value)) return 'client'
  if (OBSERVER_ROLES.has(value)) return 'observer'
  return 'member'
}

function capabilities(projectId: string, role: TaskViewerRole): ProjectAccess {
  const execution = role === 'owner' || role === 'lead' || role === 'member'
  return {
    projectId,
    role,
    executionDepth: execution,
    canCreate: role !== 'observer',
    canEdit: execution || role === 'client',
    canAssign: role === 'owner' || role === 'lead',
    canDelete: role === 'owner' || role === 'lead',
  }
}

/**
 * Resolve one project. Returns `null` when the person has no access at all —
 * the caller must answer 404/403, never leak the project's existence.
 */
export async function resolveProjectAccess(
  sb: SupabaseClient<any>,
  projectId: string,
  userId: string,
): Promise<ProjectAccess | null> {
  if (!projectId || !userId) return null

  const { data: project } = await sb
    .from('projects')
    .select('id,user_id,client_id,workspace_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return null

  let role: TaskViewerRole | null = null
  if (project.user_id === userId) role = 'owner'
  if (project.client_id === userId) role = strongest(role, 'client')

  const [memberRes, workspaceRes, assignmentRes, profileRes] = await Promise.all([
    sb.from('project_members').select('role').eq('project_id', projectId).eq('user_id', userId).maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
    project.workspace_id
      ? sb.from('workspace_members').select('role').eq('workspace_id', project.workspace_id).eq('user_id', userId).maybeSingle()
        .then((r: any) => r, () => ({ data: null }))
      : Promise.resolve({ data: null }),
    sb.from('project_assignments').select('role_on_project,active').eq('project_id', projectId).eq('user_id', userId).eq('active', true).maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
    sb.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
  ])

  role = strongest(role, mapRole(memberRes?.data?.role))
  role = strongest(role, mapRole(workspaceRes?.data?.role))
  role = strongest(role, mapRole(assignmentRes?.data?.role_on_project))

  const globalRole = String(profileRes?.data?.role ?? '').toLowerCase()
  if (globalRole === 'admin') role = strongest(role, 'owner')
  else if (globalRole === 'dev' && role) role = strongest(role, 'lead')

  if (!role) return null
  return capabilities(projectId, role)
}

/**
 * Every project this person can reach, with the role lens per project.
 * One round trip per source, merged in memory — the list page needs all of
 * them to scope tasks without N+1 access checks.
 */
export async function resolveWorkspaceAccess(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<Map<string, ProjectAccess>> {
  const access = new Map<string, ProjectAccess>()
  if (!userId) return access

  const [ownRes, memberRes, assignmentRes, profileRes] = await Promise.all([
    sb.from('projects').select('id,user_id,client_id,workspace_id').or(`user_id.eq.${userId},client_id.eq.${userId}`)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('project_members').select('project_id,role').eq('user_id', userId)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('project_assignments').select('project_id,role_on_project').eq('user_id', userId).eq('active', true)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
  ])

  const put = (projectId: string, role: TaskViewerRole | null) => {
    if (!projectId || !role) return
    const current = access.get(projectId)
    const merged = strongest(current?.role ?? null, role)
    if (merged) access.set(projectId, capabilities(projectId, merged))
  }

  for (const project of ((ownRes?.data as any[]) ?? [])) {
    put(project.id, project.user_id === userId ? 'owner' : 'client')
  }
  for (const row of ((memberRes?.data as any[]) ?? [])) put(row.project_id, mapRole(row.role))
  for (const row of ((assignmentRes?.data as any[]) ?? [])) put(row.project_id, mapRole(row.role_on_project))

  // Workspace membership grants access to every project inside that workspace.
  const { data: workspaces } = await sb
    .from('workspace_members').select('workspace_id,role').eq('user_id', userId)
    .then((r: any) => r, () => ({ data: [] }))

  const workspaceIds = ((workspaces as any[]) ?? []).map((w) => w.workspace_id).filter(Boolean)
  if (workspaceIds.length) {
    const roleByWorkspace = new Map<string, TaskViewerRole | null>(
      ((workspaces as any[]) ?? []).map((w) => [w.workspace_id, mapRole(w.role)]),
    )
    const { data: workspaceProjects } = await sb
      .from('projects').select('id,workspace_id').in('workspace_id', workspaceIds)
      .then((r: any) => r, () => ({ data: [] }))
    for (const project of ((workspaceProjects as any[]) ?? [])) {
      put(project.id, roleByWorkspace.get(project.workspace_id) ?? 'member')
    }
  }

  if (String(profileRes?.data?.role ?? '').toLowerCase() === 'admin') {
    const { data: all } = await sb.from('projects').select('id').then((r: any) => r, () => ({ data: [] }))
    for (const project of ((all as any[]) ?? [])) put(project.id, 'owner')
  }

  return access
}

/** Client lens never sees internal-only rows. */
export function taskVisibleTo(
  task: { client_visible?: boolean | null; audience?: string | null; task_type?: string | null },
  role: TaskViewerRole,
): boolean {
  if (role === 'owner' || role === 'lead' || role === 'member') return true
  if (task.client_visible === false) return false
  if (task.audience === 'internal') return false
  if (task.task_type === 'internal' || task.task_type === 'internal_dev_task') return false
  return true
}
