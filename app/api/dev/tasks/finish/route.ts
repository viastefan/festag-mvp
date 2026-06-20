import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { runTaskVerification } from '@/lib/tagro/verify-task'
import { clientStatusFromDevFlow, devFlowFromLegacy, progressFromDevFlow, type DevFlow } from '@/lib/tasks/work-types'
import { emitTaskEvent } from '@/lib/sync/bus'
import { emitDevActionToClient } from '@/lib/client/connection-bridge'

/**
 * POST /api/dev/tasks/finish  { taskId }
 *
 * The single entry point for "Mark as Finished".
 *
 *   1. Verify the user is allowed to finish (assigned dev or admin).
 *   2. Flip task into `finished_by_dev`. Client mirror → `in_review`.
 *   3. Run the heuristic Tagro verification engine.
 *   4. Persist a `tagro_verifications` row and update the task's
 *      `tagro_verification_status` / confidence / summaries.
 *   5. If the verdict is `verified`, advance dev_status to
 *      `verified_by_tagro` (client mirror stays `in_review` until the
 *      project owner approves, per spec).
 *   6. Append `task_activity_logs` events so the audit trail is honest.
 *
 * The client never sees `Completed` from this route — that requires the
 * Project Owner's `approve` action.
 */

function legacyStatus(devFlow: DevFlow): string {
  switch (devFlow) {
    case 'completed': return 'done'
    case 'approved_by_owner':
    case 'verified_by_tagro':
    case 'finished_by_dev':
    case 'needs_review': return 'ready_review'
    case 'in_progress': return 'in_progress'
    case 'blocked': return 'blocked'
    case 'cancelled': return 'cancelled'
    default: return 'todo'
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const taskId = String(body?.taskId || '')
    if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

    const { data: task } = await supabase
      .from('tasks')
      .select('id,title,project_id,assigned_to,work_type,required_proof_types')
      .eq('id', taskId).maybeSingle()
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

    const now = new Date().toISOString()

    // 1) Flip to finished_by_dev (intermediate state)
    let devFlow: DevFlow = 'finished_by_dev'
    let clientVisible = clientStatusFromDevFlow(devFlow)
    await supabase.from('tasks').update({
      dev_status: devFlow,
      status: legacyStatus(devFlow),
      finished_by_dev_at: now,
      last_dev_action_at: now,
      last_status_change_by: user.id,
      client_visible_status: clientVisible,
      progress: progressFromDevFlow(devFlow),
      updated_at: now,
    }).eq('id', taskId)

    await emitTaskEvent(supabase as any, 'finished_by_dev', {
      taskId,
      projectId: (task as any).project_id ?? null,
      actorId: user.id,
      actorKind: 'human',
      taskTitle: (task as any).title,
    })

    // 2) Verification
    const verdict = await runTaskVerification(supabase as any, taskId)

    await supabase.from('tagro_verifications').insert({
      task_id: taskId,
      project_id: (task as any).project_id ?? null,
      status: verdict.status,
      confidence: verdict.confidence,
      summary: verdict.summary,
      client_summary: verdict.clientSummary,
      issues_json: verdict.issues,
      evidence_json: verdict.evidence,
      recommended_next_action: verdict.recommendedNextAction,
      ran_by: 'tagro',
      model: 'heuristic-v1',
    })

    // 3) Map verdict → next dev_status
    let nextDevFlow: DevFlow = devFlow
    if (verdict.status === 'verified') {
      nextDevFlow = 'verified_by_tagro'
    } else if (verdict.status === 'needs_review' || verdict.status === 'quality_issue') {
      nextDevFlow = 'needs_review'
    } else if (verdict.status === 'proof_missing') {
      // Roll back to in_progress so the dev sees clearly that finish was rejected.
      nextDevFlow = 'in_progress'
    } else if (verdict.status === 'blocked') {
      nextDevFlow = 'blocked'
    }
    clientVisible = clientStatusFromDevFlow(nextDevFlow)

    const taskPatch: Record<string, any> = {
      dev_status: nextDevFlow,
      status: legacyStatus(nextDevFlow),
      client_visible_status: clientVisible,
      tagro_verification_status: verdict.status,
      tagro_confidence: verdict.confidence,
      tagro_verification_summary: verdict.summary,
      tagro_internal_notes: verdict.recommendedNextAction,
      tagro_client_summary: verdict.clientSummary,
      progress: progressFromDevFlow(nextDevFlow),
      last_dev_action_at: now,
      updated_at: now,
    }
    if (nextDevFlow === 'verified_by_tagro') taskPatch.verified_by_tagro_at = now

    await supabase.from('tasks').update(taskPatch).eq('id', taskId)

    const tagroEvent = verdict.status === 'verified'
      ? 'tagro_verified'
      : verdict.status === 'proof_missing'
        ? 'proof_missing'
        : verdict.status === 'quality_issue'
          ? 'quality_issue'
          : 'needs_review'
    await emitTaskEvent(supabase as any, tagroEvent, {
      taskId,
      projectId: (task as any).project_id ?? null,
      actorId: null,
      actorKind: 'tagro',
      taskTitle: (task as any).title,
      payload: { confidence: verdict.confidence, issues: verdict.issues, evidence: verdict.evidence },
    })

    // Client↔Dev bridge: task completion → Tagro translation → client timeline
    if ((task as any).project_id && verdict.clientSummary?.trim()) {
      await emitDevActionToClient(supabase as any, {
        projectId: (task as any).project_id,
        type: 'task_completed',
        content: `Aufgabe abgeschlossen: ${(task as any).title}\n\n${verdict.clientSummary}`,
        source: 'dev_finish',
        visibility: verdict.status === 'verified' ? 'client' : 'team',
        createdBy: user.id,
        relatedTaskId: taskId,
        clientTranslation: verdict.clientSummary,
        inboxTitle: `Aufgabe abgeschlossen · ${(task as any).title}`,
        notifyClient: verdict.status === 'verified' || verdict.status === 'needs_review',
      }).catch(() => null)
    }

    // Audit shadow
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'task_finished_by_dev',
      entity_type: 'task',
      entity_id: taskId,
      metadata: { verdict: verdict.status, confidence: verdict.confidence },
    }).then(() => null, () => null)

    return NextResponse.json({
      ok: true,
      task: { id: taskId, dev_status: nextDevFlow, client_visible_status: clientVisible },
      verification: verdict,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
