import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clientStatusFromDevStatus } from '@/lib/tagro/status-mapper'
import { completedAtForStatus } from '@/lib/tasks/status'

/**
 * POST /api/dev/tasks/status
 * Body: { taskId, devStatus: 'todo'|'accepted'|'in_progress'|'blocked'|'review'|'done'|'cancelled',
 *         devNote?: string, blockerDescription?: string, branchName?: string }
 *
 * Single entry point a developer uses to advance a task. It:
 *   - validates the status, computes the client-safe mirror, writes both
 *     to the task row
 *   - records a `developer_updates` row so the change shows up in the
 *     dev-side feed and in Tagro's source data
 *   - on `blocked` or `review` or `done`, pings the workspace messages
 *     channel via Tagro's pre-existing mirror flow (best-effort)
 *
 * The route never produces a client-visible report on its own — that is
 * the job of Tagro's daily status report job. We only set the visibility
 * flags so the client surface stays consistent.
 */

const ALLOWED = new Set(['todo','accepted','in_progress','blocked','review','done','cancelled'])

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const taskId    = String(body?.taskId || '')
    const devStatus = String(body?.devStatus || '')
    const devNote   = body?.devNote ? String(body.devNote).slice(0, 4000) : null
    const blockerDescription = body?.blockerDescription ? String(body.blockerDescription).slice(0, 800) : null
    const branchName = body?.branchName ? String(body.branchName).slice(0, 200) : undefined
    if (!taskId || !ALLOWED.has(devStatus)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id,title,project_id,assigned_to,dev_status,client_status,status,completed_at')
      .eq('id', taskId).maybeSingle()
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

    const clientStatus = clientStatusFromDevStatus(devStatus as any, {
      waitingForClient: devStatus === 'blocked' && !!blockerDescription,
    })

    // Mirror to legacy `status` column for older surfaces that still read it.
    const legacyStatus =
      devStatus === 'done' ? 'done'
      : devStatus === 'review' ? 'ready_review'
      : devStatus === 'blocked' ? 'blocked'
      : devStatus === 'in_progress' ? 'in_progress'
      : devStatus === 'cancelled' ? 'cancelled'
      : 'todo'

    const now = new Date().toISOString()
    const taskUpdate: Record<string, any> = {
      dev_status: devStatus,
      client_status: clientStatus,
      status: legacyStatus,
      completed_at: completedAtForStatus(legacyStatus, (task as any).completed_at),
      last_dev_action_at: now,
      last_status_change_by: user.id,
      updated_at: now,
    }
    if (branchName !== undefined) taskUpdate.branch_name = branchName || null
    if (devStatus === 'done') taskUpdate.progress = 100

    const { error: updErr } = await supabase.from('tasks').update(taskUpdate).eq('id', taskId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    // Log a developer_update so it surfaces in the dev feed
    const updateStatusLabel = devStatus === 'done' ? 'done' : devStatus === 'blocked' ? 'blocked' : 'in_progress'
    const updateText = devNote
      ?? (devStatus === 'done' ? `„${(task as any).title}" abgeschlossen.`
        : devStatus === 'review' ? `„${(task as any).title}" zur Prüfung freigegeben.`
        : devStatus === 'blocked' ? `„${(task as any).title}" blockiert${blockerDescription ? `: ${blockerDescription}` : '.'}`
        : `„${(task as any).title}" → ${devStatus}.`)

    await supabase.from('developer_updates').insert({
      developer_id: user.id,
      project_id: (task as any).project_id ?? null,
      task_id: taskId,
      update_text: updateText,
      status: updateStatusLabel,
      blocker: devStatus === 'blocked',
      blocker_description: blockerDescription,
    }).then(() => null, () => null)

    // Mirror to project messages (Tagro voice) — only when there's a hand-off signal.
    if (['blocked', 'review', 'done'].includes(devStatus) && (task as any).project_id) {
      const msg =
        devStatus === 'blocked'
          ? `Developer meldet einen Blocker bei „${(task as any).title}". Tagro bereitet die Einordnung vor.`
          : devStatus === 'review'
            ? `Developer hat „${(task as any).title}" zur Prüfung freigegeben.`
            : `Developer hat „${(task as any).title}" abgeschlossen. Tagro bereitet das Update vor.`
      await supabase.from('messages').insert({
        project_id: (task as any).project_id,
        sender_id: user.id,
        message: msg,
        is_ai: true,
      }).then(() => null, () => null)
    }

    // Audit
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'task_dev_status_change',
      entity_type: 'task',
      entity_id: taskId,
      metadata: { dev_status: devStatus, client_status: clientStatus, had_note: !!devNote },
    }).then(() => null, () => null)

    return NextResponse.json({
      ok: true,
      task: { id: taskId, dev_status: devStatus, client_status: clientStatus, status: legacyStatus },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
