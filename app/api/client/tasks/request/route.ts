import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { intakeClientRequest } from '@/lib/delivery/coordination-bridge'

/**
 * POST /api/client/tasks/request
 * Body: { projectId, title, description?, priority?, workType? }
 *
 * Vom Client-Portal aus: erstellt eine neue Aufgabe vom Typ
 * `client_request`. Sie taucht sofort im DEV Job Board auf, der Project
 * Owner / die zugewiesenen Devs bekommen eine Notification.
 *
 * RLS: nur Projektowner/Workspace-Member dürfen einfügen (siehe
 * Migration `tasks_client_request_insert`). Doppelte Validation hier,
 * damit der Server eine saubere Fehlermeldung gibt.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const projectId = String(body?.projectId || '')
    const title     = String(body?.title || '').trim()
    const description = body?.description ? String(body.description).slice(0, 4000) : null
    const priority  = ['critical','high','medium','low'].includes(String(body?.priority)) ? String(body.priority) : 'medium'
    const workType  = body?.workType ? String(body.workType) : null
    if (!projectId || !title) return NextResponse.json({ error: 'project_and_title_required' }, { status: 400 })

    // Validate project access (defence in depth — RLS would also catch this).
    const { data: project } = await supabase
      .from('projects').select('id,title,user_id,client_id,workspace_id').eq('id', projectId).maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const sb = getServiceClient() ?? supabase
    const result = await intakeClientRequest(sb as any, {
      projectId,
      title,
      description,
      priority: priority as 'critical' | 'high' | 'medium' | 'low',
      workType,
      actorId: user.id,
      source: 'client_portal',
    })

    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('id', result.taskId)
      .maybeSingle()

    return NextResponse.json({ ok: true, task: task ?? { id: result.taskId, title, project_id: projectId } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
