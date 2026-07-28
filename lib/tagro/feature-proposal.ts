/**
 * Scenario 1 — Client new idea → Tagro feature proposal → Action Card →
 * structured developer tasks.
 *
 * Docs: docs/festag-tagro-client-developer-scenarios.md
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { runDecisionPipeline } from '@/lib/decisions'
import { emitTaskEvent } from '@/lib/sync/bus'
import { findSimilarOpenTasks } from '@/lib/tagro/deduplication'
import {
  buildFeatureProposal,
  type FeatureProposal,
} from '@/lib/tagro/feature-proposal-core'
import { clampPriority } from '@/lib/tagro/rules'
import { getProjectDevelopers, logAudit, saveTagroRun } from '@/lib/tagro/task-actions'

export {
  buildFeatureProposal,
  looksLikeFeatureIdea,
  type FeatureProposal,
  type FeatureWorkItem,
} from '@/lib/tagro/feature-proposal-core'

export async function resolvePrimaryProjectId(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<string | null> {
  const { data: owned } = await sb
    .from('projects')
    .select('id,status,updated_at')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(8)

  const pick = (rows: any[] | null | undefined) => {
    const list = Array.isArray(rows) ? rows : []
    const active = list.find((p) => {
      const s = String(p.status || '').toLowerCase()
      return s !== 'done' && s !== 'archived' && s !== 'erledigt'
    })
    return (active || list[0])?.id ?? null
  }

  const fromOwned = pick(owned as any[])
  if (fromOwned) return fromOwned

  const { data: member } = await sb
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return member?.project_id ?? null
}

export async function offerFeatureProposal({
  sb,
  actorId,
  projectId,
  clientText,
  proposal: incoming,
}: {
  sb: SupabaseClient<any>
  actorId: string
  projectId: string
  clientText: string
  proposal?: FeatureProposal
}): Promise<{
  proposal: FeatureProposal
  decisionId: string
  decisionTitle: string
  created: boolean
}> {
  const proposal = incoming || buildFeatureProposal(clientText)

  const { data: project } = await sb
    .from('projects')
    .select('user_id,client_id')
    .eq('id', projectId)
    .maybeSingle()

  const requestedFor =
    (project as any)?.client_id || (project as any)?.user_id || actorId

  const question = [
    `Der Kunde möchte: ${clientText.trim()}`,
    '',
    `Vorschlag: ${proposal.feature_title}`,
    proposal.scope_note,
    '',
    `Empfohlene Arbeitspakete: ${proposal.work_items.map((w) => w.title).join(', ')}`,
  ].join('\n')

  const outcome = await runDecisionPipeline(
    sb,
    {
      kind: 'scope_drift',
      projectId,
      observation: question.slice(0, 1800),
      affectedTaskIds: [],
      severity: 'medium',
    },
    {
      createdBy: actorId,
      requestedFor,
    },
  )

  let decisionId: string
  let decisionTitle: string
  let created = false

  if (outcome.status === 'created') {
    decisionId = outcome.result.decision.id
    decisionTitle = outcome.framed.clientTitle || proposal.feature_title
    created = true

    await sb
      .from('decisions')
      .update({
        client_title: proposal.action_label,
        title: proposal.action_label,
        client_summary: proposal.client_summary,
        description: proposal.client_summary,
        impact_summary: proposal.scope_note,
        recommended_option: proposal.action_label,
        response_type: 'binary',
        decision_type: 'scope',
        options_json: [
          { id: 'opt-yes', label: proposal.action_label },
          { id: 'opt-later', label: 'Später' },
        ],
        tagro_recommendation_reason: proposal.scope_note,
      })
      .eq('id', decisionId)
      .then(() => null, () => null)
  } else if (outcome.status === 'refreshed') {
    decisionId = outcome.existing.id
    decisionTitle =
      outcome.existing.client_title || outcome.existing.title || proposal.feature_title
  } else {
    throw new Error(
      outcome.status === 'skipped'
        ? `feature_offer_skipped:${outcome.reason}`
        : 'feature_offer_failed',
    )
  }

  await saveTagroRun(sb, {
    projectId,
    runType: 'feature_proposal',
    inputJson: {
      decision_id: decisionId,
      client_text: clientText,
      kind: proposal.kind,
    },
    outputJson: proposal as unknown as Record<string, unknown>,
    status: 'completed',
  })

  await logAudit(sb, {
    actorId,
    action: 'tagro_feature_proposal_offered',
    entityType: 'decision',
    entityId: decisionId,
    metadata: {
      project_id: projectId,
      kind: proposal.kind,
      work_item_count: proposal.work_items.length,
    },
  })

  return { proposal, decisionId, decisionTitle, created }
}

export async function expandFeatureProposalFromDecision({
  sb,
  actorId,
  decisionId,
  projectId,
}: {
  sb: SupabaseClient<any>
  actorId: string
  decisionId: string
  projectId: string
}): Promise<Array<{ type: string; id: string; title: string }>> {
  const { data: runs } = await sb
    .from('tagro_runs')
    .select('id,output_json,input_json,created_at')
    .eq('project_id', projectId)
    .eq('run_type', 'feature_proposal')
    .order('created_at', { ascending: false })
    .limit(12)

  const run = ((runs as any[]) ?? []).find(
    (row) => String(row?.input_json?.decision_id || '') === decisionId,
  )
  const proposal = run?.output_json as FeatureProposal | undefined
  if (!proposal?.work_items?.length) return []

  const developers = await getProjectDevelopers(sb, projectId)
  const assignedTo = developers.length === 1 ? developers[0].user_id : null
  const created: Array<{ type: string; id: string; title: string }> = []

  for (const item of proposal.work_items) {
    const duplicate = await findSimilarOpenTasks(sb, projectId, item.title, 'change_request')
    if (duplicate?.id) {
      await sb
        .from('tasks')
        .update({
          source_decision_id: decisionId,
          latest_dev_update: item.description,
        })
        .eq('id', duplicate.id)
      created.push({ type: 'duplicate_linked', id: duplicate.id, title: duplicate.title })
      continue
    }

    const { data: task } = await sb
      .from('tasks')
      .insert({
        project_id: projectId,
        title: item.title,
        description: item.description,
        client_description: null,
        dev_description: item.description,
        source: 'decision',
        source_decision_id: decisionId,
        origin: 'tagro',
        audience: 'developer',
        task_type: 'change_request',
        group_key: 'development',
        created_by: actorId,
        assigned_to: assignedTo,
        client_visible: false,
        client_status: assignedTo ? 'assigned' : 'waiting_for_assignment',
        dev_status: 'todo',
        status: assignedTo ? 'todo' : 'waiting',
        priority: clampPriority(item.priority, 'medium'),
        progress: 0,
        latest_dev_update: `Aus Feature-Vorschlag „${proposal.feature_title}“ nach Client-Bestätigung.`,
        tagro_result_json: {
          feature_kind: proposal.kind,
          feature_title: proposal.feature_title,
          decision_id: decisionId,
        },
        requires_approval: false,
      })
      .select('id,title')
      .single()

    if (task?.id) {
      created.push({ type: 'task', id: task.id, title: task.title })
      await emitTaskEvent(sb, 'client_request_created', {
        taskId: task.id,
        projectId,
        actorId,
        actorKind: 'tagro',
        taskTitle: task.title,
        payload: {
          source: 'feature_proposal',
          decision_id: decisionId,
          feature_kind: proposal.kind,
        },
      }).catch(() => undefined)
    }
  }

  const { data: epic } = await sb
    .from('tasks')
    .insert({
      project_id: projectId,
      title: proposal.feature_title,
      description: proposal.client_summary,
      client_description: proposal.client_summary,
      dev_description: `Feature bestätigt. Arbeitspakete: ${proposal.work_items.map((w) => w.title).join(', ')}`,
      source: 'decision',
      source_decision_id: decisionId,
      origin: 'tagro',
      audience: 'client',
      task_type: 'change_request',
      group_key: 'development',
      created_by: actorId,
      assigned_to: assignedTo,
      client_visible: true,
      client_status: assignedTo ? 'assigned' : 'waiting_for_assignment',
      dev_status: 'todo',
      status: assignedTo ? 'todo' : 'waiting',
      priority: 'high',
      progress: 0,
      latest_client_update: 'Feature aufgenommen — das Team arbeitet die Umsetzung aus.',
      latest_dev_update: `${created.filter((c) => c.type === 'task').length} Arbeitspakete angelegt.`,
      tagro_result_json: proposal,
      requires_approval: false,
    })
    .select('id,title')
    .single()

  if (epic?.id) {
    created.unshift({ type: 'epic', id: epic.id, title: epic.title })
    const childIds = created.filter((c) => c.type === 'task').map((c) => c.id)
    if (childIds.length) {
      await sb
        .from('tasks')
        .update({ parent_task_id: epic.id })
        .in('id', childIds)
        .then(() => null, () => null)
    }
  }

  await logAudit(sb, {
    actorId,
    action: 'tagro_feature_proposal_expanded',
    entityType: 'decision',
    entityId: decisionId,
    metadata: {
      project_id: projectId,
      created_count: created.length,
      kind: proposal.kind,
    },
  })

  return created
}
