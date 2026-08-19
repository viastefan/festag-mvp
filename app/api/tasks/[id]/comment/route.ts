import { NextResponse } from 'next/server'
import { isContextError, loadTaskContext } from '@/lib/tasks/server'
import { emitTaskEvent } from '@/lib/sync/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tasks/[id]/comment   { body, internal? }
 *
 * A task update. Execution roles may keep a note internal; the client lens
 * always writes visible updates — an update nobody can read is not an update.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response

  const { writer, task, access, user } = ctx
  const payload = await req.json().catch(() => ({}))
  const text = String(payload.body ?? payload.message ?? '').trim()

  if (!text) return NextResponse.json({ error: 'body_required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'body_too_long' }, { status: 400 })
  if (access.role === 'observer') return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

  const internal = Boolean(payload.internal) && access.executionDepth

  const { error } = await (writer as any).from('task_activity_logs').insert({
    task_id: task.id,
    project_id: task.project_id,
    actor_id: user.id,
    actor_kind: access.role === 'client' ? 'client' : 'human',
    event: 'comment',
    metadata: { taskTitle: task.title, body: text, role: access.role },
    visible_to_client: !internal,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A visible update is the newest thing the client knows about this task.
  if (!internal) {
    await (writer as any).from('tasks')
      .update({ latest_client_update: text.slice(0, 400) })
      .eq('id', task.id)
      .then(() => null, () => null)
    await emitTaskEvent(writer as any, 'work_log', {
      taskId: task.id,
      projectId: task.project_id,
      actorId: user.id,
      actorKind: access.role === 'client' ? 'client' : 'human',
      taskTitle: task.title,
      payload: { body: text.slice(0, 400) },
    }).catch(() => undefined)
  }

  return NextResponse.json({ ok: true })
}
