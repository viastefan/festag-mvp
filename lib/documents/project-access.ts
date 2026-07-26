/** Whether a user may create/read agency documents tied to a project. */
export async function userCanAccessProjectDocuments(
  sb: any,
  userId: string,
  projectId: string,
): Promise<{ ok: boolean; workspaceId?: string | null }> {
  const { data: project } = await sb
    .from('projects')
    .select('id,workspace_id,user_id,client_id,assigned_dev')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return { ok: false }

  if (
    project.user_id === userId
    || project.client_id === userId
    || project.assigned_dev === userId
  ) {
    return { ok: true, workspaceId: project.workspace_id }
  }

  const { data: assignment } = await sb
    .from('project_assignments')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (assignment) return { ok: true, workspaceId: project.workspace_id }

  if (project.workspace_id) {
    const { data: ws } = await sb
      .from('workspaces')
      .select('primary_owner_id')
      .eq('id', project.workspace_id)
      .maybeSingle()
    if (ws?.primary_owner_id === userId) {
      return { ok: true, workspaceId: project.workspace_id }
    }
  }

  return { ok: false }
}
