import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * Fan out a "new project landed in the pool" inbox row to every
 * approved dev. Best-effort — never blocks the calling route.
 *
 * Called from /api/ai/decompose (project + tasks inserted) and the
 * manual create path in NewProjectModal (via /api/projects/classify).
 *
 * Lives outside lib/sync/bus.ts because the bus is task-event-shaped;
 * project creation is a project-level event with a different
 * recipient computation (every approved dev, not the assigned dev).
 */
export async function notifyProjectCreated(opts: {
  sb: SupabaseClient<any>
  projectId: string
  projectTitle: string
  actorId: string | null
}) {
  const writer: any = (getServiceClient() as any) ?? opts.sb

  try {
    const { data: devs } = await writer
      .from('profiles')
      .select('id,email,full_name,role,approval_status')
      .in('role', ['dev', 'admin', 'project_owner'])
      .eq('approval_status', 'approved')

    const rows = ((devs as any[]) ?? [])
      .filter(d => d.id && d.id !== opts.actorId)
      .map(d => ({
        user_id: d.id,
        project_id: opts.projectId,
        audience: 'dev',
        kind: 'project_available',
        type: 'project_available',
        title: `Neues Projekt im Pool: ${opts.projectTitle}`,
        body: 'Schau im Dev Panel unter „Projekte" rein und trag dich ein, wenn es passt.',
        message: 'Neues Projekt im Festag Pool — Details im Dev Panel.',
        payload: { project_id: opts.projectId, project_title: opts.projectTitle },
      }))

    if (rows.length > 0) {
      await writer.from('notifications').insert(rows)
    }
  } catch {
    // soft fail — project creation must not break because of fan-out
  }
}
