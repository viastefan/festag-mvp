import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emitTaskEvent } from '@/lib/sync/bus'

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

    const { data: task, error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: title.slice(0, 240),
      description,
      client_description: description,
      priority,
      work_type: workType,
      task_type: 'client_request',
      source: 'client_manual',
      origin: 'client_request',
      group_key: 'client_action',
      audience: 'client',
      created_by: user.id,
      client_visible: true,
      client_status: 'submitted',
      dev_status: 'new',
      status: 'todo',
    }).select('id,title,project_id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Fan out the event — owner + assigned devs get the inbox entry.
    await emitTaskEvent(supabase as any, 'client_request_created', {
      taskId: (task as any).id,
      projectId,
      actorId: user.id,
      actorKind: 'client',
      taskTitle: (task as any).title,
      payload: { source: 'client_portal' },
    })

    return NextResponse.json({ ok: true, task })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
