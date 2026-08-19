import { NextResponse } from 'next/server'
import { isContextError, loadTaskContext } from '@/lib/tasks/server'
import { TASK_ACTIONS, canRunAction, lifecycleLabel, type TaskAction } from '@/lib/tasks/lifecycle'
import { emitTaskEvent, type DevEventKind } from '@/lib/sync/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tasks/[id]/transition   { action, reason? }
 *
 * The only way a task changes state. Every call:
 *   1. validates the action against the lifecycle table AND the caller's role
 *   2. writes the new state (the DB trigger derives client status / progress /
 *      timestamps — this route never hand-writes them)
 *   3. records who did it and why
 *   4. fans out to activity, notifications and the client-facing update line
 *
 * A hidden button and a forged request are rejected by exactly the same check.
 */

const EVENT_FOR_ACTION: Record<TaskAction, DevEventKind> = {
  start: 'status_changed',
  pause: 'status_changed',
  resume: 'status_changed',
  block: 'blocker_reported',
  unblock: 'status_changed',
  ask: 'needs_review',
  submit: 'finished_by_dev',
  approve: 'approved_by_owner',
  request_changes: 'owner_changes_requested',
  reopen: 'status_changed',
  cancel: 'status_changed',
  restore: 'status_changed',
}

/** What the client lens is told — plain language, no execution vocabulary. */
function clientUpdateFor(action: TaskAction, reason: string | null): string {
  switch (action) {
    case 'start':   return 'Die Umsetzung hat begonnen.'
    case 'pause':   return reason ? `Die Aufgabe wurde zurückgestellt: ${reason}` : 'Die Aufgabe wurde vorübergehend zurückgestellt.'
    case 'resume':  return 'Die Arbeit an dieser Aufgabe läuft wieder.'
    case 'block':   return reason ? `Die Aufgabe wartet auf eine Klärung: ${reason}` : 'Die Aufgabe wartet auf eine Klärung.'
    case 'unblock': return 'Die Klärung ist erledigt — es geht weiter.'
    case 'ask':     return reason ? `Es gibt eine offene Rückfrage: ${reason}` : 'Es gibt eine offene Rückfrage.'
    case 'submit':  return 'Die Umsetzung ist abgeschlossen und wird geprüft.'
    case 'approve': return 'Die Aufgabe wurde freigegeben und ist abgeschlossen.'
    case 'request_changes': return reason ? `Es wurden Änderungen angefordert: ${reason}` : 'Es wurden Änderungen angefordert.'
    case 'reopen':  return 'Die Aufgabe wurde erneut geöffnet.'
    case 'cancel':  return reason ? `Die Aufgabe wird nicht weiterverfolgt: ${reason}` : 'Die Aufgabe wird nicht weiterverfolgt.'
    case 'restore': return 'Die Aufgabe wurde wieder aufgenommen.'
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response

  const { writer, task, access, flow, user } = ctx
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '') as TaskAction
  const definition = TASK_ACTIONS[action]

  if (!definition) {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }
  if (!canRunAction(action, flow, access.role)) {
    return NextResponse.json({
      error: 'action_not_available',
      message: `„${definition.label}" ist aus dem Status „${lifecycleLabel(flow, access.role)}" nicht möglich.`,
    }, { status: 409 })
  }

  const reason = String(body.reason ?? '').trim().slice(0, 600) || null
  if (definition.reason === 'required' && !reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    dev_status: definition.to,
    last_status_change_by: user.id,
    latest_client_update: clientUpdateFor(action, reason),
  }
  if (action === 'block' || action === 'pause') patch.blocked_reason = reason
  if (action === 'approve') patch.approved_by = user.id
  if (action === 'request_changes' || action === 'ask') patch.latest_dev_update = reason
  if (action === 'cancel') patch.rejected_reason = reason

  // Starting work without an owner makes the starter the owner — otherwise the
  // task would report progress with nobody responsible for it.
  if (definition.to === 'in_progress' && !task.assigned_to && access.executionDepth) {
    patch.assigned_to = user.id
  }

  const { data, error } = await (writer as any)
    .from('tasks').update(patch).eq('id', task.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await emitTaskEvent(writer as any, EVENT_FOR_ACTION[action], {
    taskId: task.id,
    projectId: task.project_id,
    actorId: user.id,
    actorKind: access.role === 'client' ? 'client' : 'human',
    taskTitle: data.title,
    payload: {
      action,
      from: flow,
      to: definition.to,
      reason,
      role: access.role,
    },
  }).catch(() => undefined)

  return NextResponse.json({
    ok: true,
    task: data,
    action,
    from: flow,
    to: definition.to,
    message: clientUpdateFor(action, reason),
  })
}
