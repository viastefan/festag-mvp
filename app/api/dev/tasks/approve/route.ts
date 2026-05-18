import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clientStatusFromDevFlow, progressFromDevFlow } from '@/lib/tasks/work-types'

/**
 * POST /api/dev/tasks/approve  { taskId, decision: 'approve' | 'reject', reason?: string }
 *
 * Nur Admins / Project Owner. „approve" hebt einen Task von
 * `verified_by_tagro` (oder `needs_review`) auf `approved_by_owner` und
 * spiegelt im Client-Portal als `completed`. „reject" wirft den Task auf
 * `in_progress` zurück und schreibt eine sichtbare Begründung.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const isOwner = ['admin', 'project_owner'].includes((prof as any)?.role)
    if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const taskId   = String(body?.taskId || '')
    const decision = String(body?.decision || '') as 'approve' | 'reject'
    const reason   = body?.reason ? String(body.reason).slice(0, 600) : null
    if (!taskId || !['approve','reject'].includes(decision)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }

    const { data: task } = await supabase
      .from('tasks').select('id,project_id,title,dev_status,tagro_verification_status')
      .eq('id', taskId).maybeSingle()
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

    const now = new Date().toISOString()

    if (decision === 'approve') {
      const nextFlow = 'approved_by_owner' as const
      const clientVisible = clientStatusFromDevFlow(nextFlow)
      await supabase.from('tasks').update({
        dev_status: nextFlow,
        status: 'done',
        approved_by: user.id,
        approved_by_owner_at: now,
        approved_at: now,
        client_visible_status: clientVisible,
        client_status: 'completed',
        progress: progressFromDevFlow(nextFlow),
        last_dev_action_at: now,
        last_status_change_by: user.id,
        updated_at: now,
      }).eq('id', taskId)

      await supabase.from('task_activity_logs').insert({
        task_id: taskId,
        project_id: (task as any).project_id,
        actor_id: user.id,
        actor_kind: 'human',
        event: 'approved_by_owner',
        metadata: { reason: reason ?? null },
        visible_to_client: true,
      }).then(() => null, () => null)

      // Activity feed entry for the client side — translated message
      if ((task as any).project_id) {
        await supabase.from('messages').insert({
          project_id: (task as any).project_id,
          sender_id: user.id,
          message: `„${(task as any).title}" ist abgeschlossen und für den Client sichtbar.`,
          is_ai: true,
        }).then(() => null, () => null)
      }
    } else {
      // reject → back to in_progress, log
      const nextFlow = 'in_progress' as const
      await supabase.from('tasks').update({
        dev_status: nextFlow,
        status: 'in_progress',
        rejected_reason: reason,
        client_visible_status: clientStatusFromDevFlow(nextFlow),
        progress: progressFromDevFlow(nextFlow),
        last_dev_action_at: now,
        last_status_change_by: user.id,
        updated_at: now,
      }).eq('id', taskId)

      await supabase.from('task_activity_logs').insert({
        task_id: taskId,
        project_id: (task as any).project_id,
        actor_id: user.id,
        actor_kind: 'human',
        event: 'owner_changes_requested',
        metadata: { reason: reason ?? null },
        visible_to_client: false,
      }).then(() => null, () => null)
    }

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: decision === 'approve' ? 'task_approved_by_owner' : 'task_rejected_by_owner',
      entity_type: 'task',
      entity_id: taskId,
      metadata: { reason: reason ?? null },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
