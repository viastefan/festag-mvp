import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { publishTagroClientUpdate } from '@/lib/sync/client-bridge'
import { emitTaskEvent } from '@/lib/sync/bus'

/**
 *   GET  /api/dev/tasks/work-log?taskId=…
 *   POST /api/dev/tasks/work-log { taskId, text, status?: 'in_progress'|'done'|'blocked', blockerDescription? }
 *
 * Writes a free-text developer update tied to a task. We re-use the
 * `developer_updates` table (already exists) AND mirror an entry into
 * `task_activity_logs` so the drawer can show a unified history.
 */

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

  // Pull both the legacy developer_updates rows and the task_activity_logs
  // entries — combined client-side for a single chronological feed.
  const [{ data: updates }, { data: activity }] = await Promise.all([
    supabase
      .from('developer_updates')
      .select('id,developer_id,update_text,status,blocker,blocker_description,created_at')
      .eq('task_id', taskId).order('created_at', { ascending: false }).limit(30),
    supabase
      .from('task_activity_logs')
      .select('id,actor_id,actor_kind,event,metadata,visible_to_client,created_at')
      .eq('task_id', taskId).order('created_at', { ascending: false }).limit(80),
  ])
  return NextResponse.json({ updates: updates ?? [], activity: activity ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const taskId = String(body?.taskId || '')
  const text   = String(body?.text || '').trim()
  const status = body?.status ? String(body.status) : 'in_progress'
  const blockerDescription = body?.blockerDescription ? String(body.blockerDescription).slice(0, 800) : null
  const publishToClient = !!body?.publishToClient
  if (!taskId || !text) return NextResponse.json({ error: 'task_and_text_required' }, { status: 400 })

  const { data: task } = await supabase.from('tasks').select('id,title,project_id,projects(title,user_id,client_id)').eq('id', taskId).maybeSingle()

  const { data: log, error } = await supabase.from('developer_updates').insert({
    developer_id: user.id,
    project_id: (task as any)?.project_id ?? null,
    task_id: taskId,
    update_text: text.slice(0, 4000),
    status,
    blocker: status === 'blocked' || !!body?.blocker,
    blocker_description: blockerDescription,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await emitTaskEvent(supabase as any, 'work_log', {
    taskId,
    projectId: (task as any)?.project_id ?? null,
    actorId: user.id,
    actorKind: 'human',
    taskTitle: (task as any)?.title ?? '',
    payload: { status, blocker: status === 'blocked', preview: text.slice(0, 140) },
  })

  await supabase.from('tasks').update({
    latest_dev_update: text.slice(0, 400),
    last_dev_action_at: new Date().toISOString(),
  }).eq('id', taskId).then(() => null, () => null)

  let clientPublished = false
  if (publishToClient && (task as any)?.project_id) {
    const writer = getServiceClient() ?? supabase
    const clientId = (task as any).projects?.client_id ?? (task as any).projects?.user_id
    if (clientId) {
      await publishTagroClientUpdate({
        writer: writer as any,
        clientId,
        projectId: (task as any).project_id,
        projectTitle: (task as any).projects?.title ?? (task as any).title,
        devText: text,
        actorId: user.id,
        taskId,
        sourceTable: 'developer_updates',
        sourceId: String((log as any).id),
        link: `/project/${(task as any).project_id}`,
      })
      clientPublished = true
    }
  }

  return NextResponse.json({ ok: true, log, clientPublished })
}
