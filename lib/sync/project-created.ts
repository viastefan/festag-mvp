import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase/service'
import { canAccessExecutionPanel } from '@/lib/execution-panel/access'
import {
  resolveWorkspaceIdForProject,
  resolveWorkspaceMemberIds,
} from '@/lib/workspace/resolve'

/**
 * Fan out "new project in pool" to the right Execution perspective users.
 *
 * Workspace-first (portal system):
 *   1. Approved exec-capable members of the project's workspace
 *   2. For festag_delivery only: also approved platform `dev` roles
 *      (Festag finds a developer — still not every project_owner globally)
 *
 * Never fans out to every approved project_owner on the platform.
 */
export async function notifyProjectCreated(opts: {
  sb: SupabaseClient<any>
  projectId: string
  projectTitle: string
  actorId: string | null
  deliveryModel?: string | null
}) {
  const writer: any = (getServiceClient() as any) ?? opts.sb

  try {
    const workspaceId = await resolveWorkspaceIdForProject(writer, opts.projectId)
    const recipientIds = new Set<string>()

    if (workspaceId) {
      const memberIds = await resolveWorkspaceMemberIds(writer, workspaceId)
      if (memberIds.length) {
        const { data: members } = await writer
          .from('profiles')
          .select('id,role,approval_status')
          .in('id', memberIds)
        for (const p of (members as any[]) ?? []) {
          if (p.id && p.id !== opts.actorId && canAccessExecutionPanel(p)) {
            recipientIds.add(p.id)
          }
        }
      }
    }

    const isFestagPool = (opts.deliveryModel ?? 'festag_delivery') === 'festag_delivery'
    if (isFestagPool) {
      const { data: platformDevs } = await writer
        .from('profiles')
        .select('id,role,approval_status')
        .eq('role', 'dev')
        .eq('approval_status', 'approved')
      for (const p of (platformDevs as any[]) ?? []) {
        if (p.id && p.id !== opts.actorId) recipientIds.add(p.id)
      }
    }

    const rows = Array.from(recipientIds).map(userId => ({
      user_id: userId,
      project_id: opts.projectId,
      audience: 'dev',
      kind: 'project_available',
      type: 'project_available',
      title: `Neues Projekt im Pool: ${opts.projectTitle}`,
      body: 'Schau im Execution Panel unter „Projekte“ rein und trag dich ein, wenn es passt.',
      message: 'Neues Projekt im Festag Pool — Details im Execution Panel.',
      payload: {
        project_id: opts.projectId,
        project_title: opts.projectTitle,
        workspace_id: workspaceId,
      },
    }))

    if (rows.length > 0) {
      await writer.from('notifications').insert(rows)
    }
  } catch {
    // soft fail — project creation must not break because of fan-out
  }
}
