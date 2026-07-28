/**
 * Propagate a decided decision into linked tasks (unblock + notes).
 * Shared by POST /api/decisions/:id/apply and auto-apply after /decide.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { expandFeatureProposalFromDecision } from '@/lib/tagro/feature-proposal'
import { devDecisionLink, notifyDevDecisionEvent } from '@/lib/sync/decision-notify'

export type ApplyPropagationResult = {
  decision: Record<string, unknown>
  propagated: {
    unblocked_tasks: string[]
    noted_tasks: string[]
    feature_tasks: string[]
  }
  already_applied?: boolean
}

export async function propagateDecisionApply(
  supa: SupabaseClient<any>,
  decisionId: string,
  userId: string,
): Promise<ApplyPropagationResult> {
  const { data: d } = await supa
    .from('decisions')
    .select('id,project_id,status,applied_at,client_title,internal_title,title,response_value,rationale,tagro_delegation_reason,created_by,source_task_id,decision_type')
    .eq('id', decisionId)
    .maybeSingle()
  if (!d) throw new Error('not_found')

  if (d.applied_at && d.status === 'applied') {
    return {
      decision: d,
      propagated: { unblocked_tasks: [], noted_tasks: [], feature_tasks: [] },
      already_applied: true,
    }
  }

  if (d.status !== 'decided' && d.status !== 'applied') {
    throw new Error('not_decided')
  }

  const { data: links } = await supa
    .from('decision_links')
    .select('id,link_kind,target_kind,target_id,metadata')
    .eq('decision_id', d.id)

  const linkRows = (links as any[]) ?? []
  const blocks = linkRows.filter((l) => l.link_kind === 'blocks' && l.target_kind === 'task')
  const affects = linkRows.filter((l) => l.link_kind === 'affects' && l.target_kind === 'task')

  const headline = d.client_title || d.internal_title || d.title || 'Entscheidung'
  const summaryForNote = d.rationale || d.tagro_delegation_reason || `Entscheidung „${headline}" wurde getroffen.`

  const unblocked: string[] = []
  for (const link of blocks) {
    try {
      const { data: task } = await supa
        .from('tasks')
        .select('id,client_status,dev_status,status,latest_dev_update')
        .eq('id', link.target_id)
        .maybeSingle()
      if (!task) continue

      const updates: Record<string, unknown> = {}
      if (task.client_status === 'waiting_for_client') updates.client_status = 'in_progress'
      if (task.dev_status === 'blocked') updates.dev_status = 'in_progress'
      if (task.status === 'blocked' || task.status === 'blocked_pending_decision') updates.status = 'ready'

      if (Object.keys(updates).length > 0) {
        await supa.from('tasks').update(updates).eq('id', task.id)
      }

      await supa.from('activity_feed').insert({
        project_id: d.project_id,
        task_id: task.id,
        kind: 'decision_unblocked_task',
        actor_user_id: userId,
        title: `Task entsperrt durch Entscheidung „${headline}"`,
        body: summaryForNote.slice(0, 400),
        payload: { decision_id: d.id, link_id: link.id },
      })

      unblocked.push(task.id)
    } catch {
      // best-effort
    }
  }

  const noted: string[] = []
  for (const link of affects) {
    try {
      const { data: task } = await supa
        .from('tasks')
        .select('id,dev_description,latest_dev_update')
        .eq('id', link.target_id)
        .maybeSingle()
      if (!task) continue

      const noteLine = `[${new Date().toISOString().slice(0, 10)}] Entscheidung „${headline}": ${summaryForNote}`
      const merged = (task.latest_dev_update ? task.latest_dev_update + '\n\n' : '') + noteLine

      await supa.from('tasks').update({
        latest_dev_update: merged.slice(0, 8000),
      }).eq('id', task.id)

      await supa.from('activity_feed').insert({
        project_id: d.project_id,
        task_id: task.id,
        kind: 'decision_affects_task',
        actor_user_id: userId,
        title: `Task betroffen von „${headline}"`,
        body: noteLine.slice(0, 400),
        payload: { decision_id: d.id, link_id: link.id },
      })

      noted.push(task.id)
    } catch {
      // best-effort
    }
  }

  const { data: updated, error } = await supa
    .from('decisions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
    })
    .eq('id', decisionId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  await supa.from('decision_events').insert({
    decision_id: decisionId,
    event_type: 'applied',
    actor_user_id: userId,
    actor_kind: 'user',
    from_status: d.status,
    to_status: 'applied',
    payload: {
      unblocked_tasks: unblocked,
      noted_tasks: noted,
      headline,
      auto: true,
    },
  })

  // Scenario 1 — accepted scope/feature proposal expands into developer tasks.
  const featureTasks: string[] = []
  const responseValue = d.response_value as Record<string, unknown> | null
  const acceptedBinary =
    responseValue &&
    typeof responseValue === 'object' &&
    'binary_value' in responseValue &&
    responseValue.binary_value === 'yes'
  const acceptedChoice =
    responseValue &&
    typeof responseValue === 'object' &&
    (('selected_option_id' in responseValue && Boolean(responseValue.selected_option_id)) ||
      ('selected_option_ids' in responseValue &&
        Array.isArray(responseValue.selected_option_ids) &&
        responseValue.selected_option_ids.length > 0))
  const rejected =
    responseValue &&
    typeof responseValue === 'object' &&
    'binary_value' in responseValue &&
    responseValue.binary_value === 'no'

  if (!rejected && (acceptedBinary || acceptedChoice)) {
    try {
      const created = await expandFeatureProposalFromDecision({
        sb: supa,
        actorId: userId,
        decisionId,
        projectId: d.project_id,
      })
      for (const row of created) {
        if (row.type === 'task' || row.type === 'epic') featureTasks.push(row.id)
      }
    } catch {
      // No stored feature proposal for this decision — fine.
    }
  }

  if (d.created_by && (unblocked.length > 0 || featureTasks.length > 0)) {
    await notifyDevDecisionEvent(supa, {
      userId: d.created_by,
      projectId: d.project_id,
      kind: 'decision_applied',
      title: featureTasks.length
        ? `Feature bestätigt: ${headline}`
        : `Entscheidung angewendet: ${headline}`,
      body: featureTasks.length
        ? `${featureTasks.length} neue Aufgaben für die Umsetzung.`
        : unblocked.length === 1
          ? 'Ein blockierter Task wurde freigegeben — du kannst weitermachen.'
          : `${unblocked.length} blockierte Tasks wurden freigegeben.`,
      link: devDecisionLink(decisionId, d.source_task_id),
      taskId: d.source_task_id ?? featureTasks[0] ?? unblocked[0] ?? null,
      payload: {
        decision_id: decisionId,
        unblocked_tasks: unblocked,
        feature_tasks: featureTasks,
      },
    })
  }

  return {
    decision: updated as Record<string, unknown>,
    propagated: {
      unblocked_tasks: unblocked,
      noted_tasks: noted,
      feature_tasks: featureTasks,
    },
  }
}
