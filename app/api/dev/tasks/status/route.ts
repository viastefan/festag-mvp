import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completedAtForStatus } from '@/lib/tasks/status'
import {
  DEV_FLOW, clientStatusFromDevFlow, progressFromDevFlow, type DevFlow,
} from '@/lib/tasks/work-types'

/**
 * POST /api/dev/tasks/status
 * Body: {
 *   taskId,
 *   devStatus: 'new'|'assigned'|'in_progress'|'needs_review'|'blocked'|'cancelled',
 *   note?, blockerDescription?, branchName?
 * }
 *
 * NOTE: the developer cannot move a task into `finished_by_dev` /
 * `verified_by_tagro` / `approved_by_owner` / `completed` through this
 * endpoint. Those transitions belong to:
 *   • /api/dev/tasks/finish   (Mark as Finished → triggers verification)
 *   • /api/tagro/verify-task  (re-verify)
 *   • /api/dev/tasks/approve  (owner approval)
 *
 * Status updates here mirror to client_visible_status and the legacy
 * `status` column so older surfaces keep working.
 */

const ALLOWED: ReadonlyArray<DevFlow> = ['new','assigned','in_progress','needs_review','blocked','cancelled']

function legacyStatusFor(devFlow: DevFlow): string {
  switch (devFlow) {
    case 'in_progress': return 'in_progress'
    case 'needs_review': return 'ready_review'
    case 'blocked': return 'blocked'
    case 'cancelled': return 'cancelled'
    default: return 'todo'
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const taskId    = String(body?.taskId || '')
    const devStatus = String(body?.devStatus || '') as DevFlow
    const note      = body?.note ? String(body.note).slice(0, 4000) : null
    const blockerDescription = body?.blockerDescription ? String(body.blockerDescription).slice(0, 800) : null
    const branchName = body?.branchName !== undefined ? (body.branchName ? String(body.branchName).slice(0, 200) : null) : undefined
    if (!taskId || !ALLOWED.includes(devStatus)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id,title,project_id,assigned_to,dev_status,client_visible_status,status,completed_at')
      .eq('id', taskId).maybeSingle()
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

    const clientVisible = clientStatusFromDevFlow(devStatus)
    const legacy = legacyStatusFor(devStatus)
    const now = new Date().toISOString()

    const patch: Record<string, any> = {
      dev_status: devStatus,
      status: legacy,
      completed_at: completedAtForStatus(legacy, (task as any).completed_at),
      client_visible_status: clientVisible,
      progress: progressFromDevFlow(devStatus),
      last_dev_action_at: now,
      last_status_change_by: user.id,
      updated_at: now,
    }
    if (branchName !== undefined) patch.branch_name = branchName

    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Activity log
    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      project_id: (task as any).project_id ?? null,
      actor_id: user.id,
      actor_kind: 'human',
      event: 'status_changed',
      metadata: { from: (task as any).dev_status ?? null, to: devStatus, had_note: !!note },
      visible_to_client: false,
    }).then(() => null, () => null)

    // Optional work log entry
    if (note || blockerDescription) {
      await supabase.from('developer_updates').insert({
        developer_id: user.id,
        project_id: (task as any).project_id ?? null,
        task_id: taskId,
        update_text: note ?? `Status: ${devStatus}.`,
        status: devStatus === 'blocked' ? 'blocked' : devStatus === 'needs_review' ? 'in_progress' : devStatus,
        blocker: devStatus === 'blocked',
        blocker_description: blockerDescription,
      }).then(() => null, () => null)
    }

    // Client mirror message — only on hand-off signals
    if (['needs_review', 'blocked'].includes(devStatus) && (task as any).project_id) {
      const msg = devStatus === 'blocked'
        ? `„${(task as any).title}" ist aktuell blockiert. Tagro bereitet die Einordnung vor.`
        : `„${(task as any).title}" ist bereit zur Prüfung.`
      await supabase.from('messages').insert({
        project_id: (task as any).project_id,
        sender_id: user.id,
        message: msg,
        is_ai: true,
      }).then(() => null, () => null)
    }

    return NextResponse.json({
      ok: true,
      task: { id: taskId, dev_status: devStatus, client_visible_status: clientVisible, status: legacy },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
