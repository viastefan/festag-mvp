/**
 * Delivery Coordination Bridge
 *
 * End-to-end orchestration for client requests → dev proposals → client
 * decisions → task completion, without email/WhatsApp. Tagro frames every
 * handoff; notifications and status reports stay in sync.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { runDecisionPipeline } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'
import { emitTaskEvent } from '@/lib/sync/bus'
import { emitDevActionToClient } from '@/lib/client/connection-bridge'
import { notifyDevDecisionEvent } from '@/lib/sync/decision-notify'
import { appendCoordinationSnippet } from '@/lib/delivery/status-report-snippet'
import type {
  CoordinationEvent,
  CoordinationState,
  DecisionOutcomeInput,
  DevProposeInput,
  IntakeClientRequestInput,
} from '@/lib/delivery/coordination-types'

const OPEN_DECISION_STATUSES = new Set([
  'drafted', 'pending_client', 'awaiting_clarification', 'open', 'waiting_for_client', 'in_progress',
])

export async function intakeClientRequest(
  sb: SupabaseClient<any>,
  input: IntakeClientRequestInput,
): Promise<{ taskId: string; events: CoordinationEvent[] }> {
  const { data: project } = await sb
    .from('projects')
    .select('id, title, client_id')
    .eq('id', input.projectId)
    .maybeSingle()
  if (!project) throw new Error('project_not_found')

  const { data: task, error } = await sb.from('tasks').insert({
    project_id: input.projectId,
    title: input.title.slice(0, 240),
    description: input.description?.slice(0, 4000) ?? null,
    client_description: input.description?.slice(0, 4000) ?? null,
    priority: input.priority ?? 'medium',
    work_type: input.workType ?? 'design',
    task_type: 'client_request',
    source: input.source ?? 'client_portal',
    origin: 'client_request',
    group_key: 'client_action',
    audience: 'client',
    created_by: input.actorId,
    client_visible: true,
    client_status: 'submitted',
    dev_status: 'new',
    status: 'todo',
  }).select('id, title').single()

  if (error || !task) throw new Error(error?.message ?? 'task_insert_failed')

  await emitTaskEvent(sb, 'client_request_created', {
    taskId: task.id,
    projectId: input.projectId,
    actorId: input.actorId,
    actorKind: 'client',
    taskTitle: task.title,
    payload: { source: input.source ?? 'client_portal', coordination: true },
  })

  const snippet = `Kundenwunsch: ${task.title}`
  await appendCoordinationSnippet(sb, {
    projectId: input.projectId,
    line: snippet,
    section: 'dev_followups_json',
    taskId: task.id,
  })

  await emitDevActionToClient(sb, {
    projectId: input.projectId,
    type: 'client_request',
    content: `Neuer Kundenwunsch: ${task.title}${input.description ? ` — ${input.description.slice(0, 200)}` : ''}`,
    visibility: 'client',
    createdBy: input.actorId,
    relatedTaskId: task.id,
    notifyClient: false,
    inboxTitle: 'Anfrage an das Team gesendet',
  })

  const events: CoordinationEvent[] = [{
    id: `task:${task.id}`,
    kind: 'client_request',
    title: task.title,
    body: input.description ?? null,
    actor: 'client',
    timestamp: new Date().toISOString(),
    taskId: task.id,
    status: 'submitted',
    link: `/dev/tasks?id=${task.id}`,
  }]

  return { taskId: task.id, events }
}

export async function devProposeOptions(
  sb: SupabaseClient<any>,
  input: DevProposeInput,
): Promise<{ decisionId: string; events: CoordinationEvent[] }> {
  const { data: project } = await sb
    .from('projects')
    .select('user_id, client_id')
    .eq('id', input.projectId)
    .maybeSingle()
  if (!project) throw new Error('project_not_found')

  const requestedFor = (project as any).client_id || (project as any).user_id || null

  const question = input.recommendation
    ? `${input.question.trim()}\n\nTagro empfiehlt: ${input.recommendation.trim()}`
    : input.question.trim()

  const signal: DecisionSignal = {
    kind: 'dev_request',
    projectId: input.projectId,
    taskId: input.taskId ?? undefined,
    authorUserId: input.actorId,
    question: question.slice(0, 4000),
    suggestedOptions: input.suggestedOptions?.filter(Boolean).slice(0, 4),
    suggestedResponseType: input.suggestedOptions?.length ? 'single_choice' : undefined,
    suggestedDecisionType: 'approval',
    urgency: input.urgency ?? 'normal',
  }

  const outcome = await runDecisionPipeline(sb, signal, {
    requestedFor,
    createdBy: input.actorId,
  })

  if (outcome.status === 'skipped') {
    throw new Error(`pipeline_skipped:${outcome.reason}`)
  }

  const decision = outcome.status === 'created'
    ? outcome.result.decision
    : outcome.existing

  if (input.taskId) {
    await sb.from('decision_links').insert({
      decision_id: decision.id,
      target_kind: 'task',
      target_id: input.taskId,
      link_kind: 'blocks',
      metadata: { coordination: true },
    }).then(() => null, () => null)

    await sb.from('tasks').update({
      dev_status: 'blocked',
      status: 'blocked_pending_decision',
      client_status: 'waiting_for_client',
      client_visible_status: 'Wartet auf deine Entscheidung',
    }).eq('id', input.taskId)
  }

  const title = decision.client_title || decision.title || 'Abstimmung'
  await appendCoordinationSnippet(sb, {
    projectId: input.projectId,
    line: `Abstimmung offen: ${title}`,
    section: 'decisions_needed_json',
    taskId: input.taskId ?? null,
    decisionId: decision.id,
  })

  const events: CoordinationEvent[] = [{
    id: `decision:${decision.id}`,
    kind: 'dev_proposal',
    title,
    body: decision.client_summary || decision.description || null,
    actor: 'dev',
    timestamp: new Date().toISOString(),
    taskId: input.taskId ?? null,
    decisionId: decision.id,
    status: decision.status,
    actionable: false,
    link: `/decisions?open=${decision.id}`,
  }]

  return { decisionId: decision.id, events }
}

export async function handleDecisionOutcome(
  sb: SupabaseClient<any>,
  input: DecisionOutcomeInput,
): Promise<{ counterDecisionId?: string; events: CoordinationEvent[] }> {
  const events: CoordinationEvent[] = []
  const headline = input.responseLabel?.trim() || (input.accepted ? 'Angenommen' : 'Abgelehnt')

  await appendCoordinationSnippet(sb, {
    projectId: input.projectId,
    line: input.accepted
      ? `Entscheidung getroffen: ${headline}`
      : `Entscheidung abgelehnt — Tagro prüft Alternativen`,
    section: input.accepted ? 'completed_work_json' : 'decisions_needed_json',
    taskId: input.taskId ?? null,
    decisionId: input.decisionId,
  })

  events.push({
    id: `outcome:${input.decisionId}`,
    kind: input.accepted ? 'decision_accepted' : 'decision_rejected',
    title: headline,
    body: input.rationale ?? null,
    actor: 'client',
    timestamp: new Date().toISOString(),
    taskId: input.taskId ?? null,
    decisionId: input.decisionId,
    status: input.accepted ? 'decided' : 'rejected',
  })

  if (input.accepted && input.taskId) {
    await sb.from('tasks').update({
      dev_status: 'in_progress',
      status: 'in_progress',
      client_status: 'in_progress',
      client_visible_status: 'In Umsetzung',
    }).eq('id', input.taskId)
  }

  let counterDecisionId: string | undefined

  if (!input.accepted) {
    const { data: original } = await sb
      .from('decisions')
      .select('client_title, title, internal_description, created_by, tagro_recommendation_reason')
      .eq('id', input.decisionId)
      .maybeSingle()

    const rejectContext = [
      `Der Kunde hat die vorherige Empfehlung abgelehnt.`,
      original?.client_title || original?.title ? `Betreff: ${original?.client_title || original?.title}` : '',
      input.rationale ? `Begründung: ${input.rationale}` : '',
      'Formuliere eine präzisere Alternative mit klaren Optionen, die zum Projekt und zur Website passen.',
    ].filter(Boolean).join('\n')

    const signal: DecisionSignal = {
      kind: 'dev_request',
      projectId: input.projectId,
      taskId: input.taskId ?? undefined,
      authorUserId: null,
      question: rejectContext.slice(0, 4000),
      suggestedResponseType: 'single_choice',
      suggestedDecisionType: 'direction',
      urgency: 'high',
    }

    try {
      const { data: proj } = await sb.from('projects').select('client_id, user_id').eq('id', input.projectId).maybeSingle()
      const outcome = await runDecisionPipeline(sb, signal, {
        requestedFor: (proj as any)?.client_id || (proj as any)?.user_id || null,
        createdBy: original?.created_by ?? input.actorId,
      })

      if (outcome.status === 'created' || outcome.status === 'refreshed') {
        const counter = outcome.status === 'created' ? outcome.result.decision : outcome.existing
        counterDecisionId = counter.id

        if (input.taskId) {
          await sb.from('decision_links').insert({
            decision_id: counter.id,
            target_kind: 'task',
            target_id: input.taskId,
            link_kind: 'blocks',
            metadata: { coordination: true, supersedes: input.decisionId },
          }).then(() => null, () => null)
        }

        await appendCoordinationSnippet(sb, {
          projectId: input.projectId,
          line: `Tagro schlägt Alternative vor: ${counter.client_title || counter.title}`,
          section: 'decisions_needed_json',
          taskId: input.taskId ?? null,
          decisionId: counter.id,
        })

        if (original?.created_by) {
          await notifyDevDecisionEvent(sb, {
            userId: original.created_by,
            projectId: input.projectId,
            kind: 'decision_requested',
            title: `Kunde lehnte ab — Tagro hat Alternative formuliert`,
            body: (counter.client_title || counter.title || '').slice(0, 200),
            link: `/dev/decisions?open=${counter.id}`,
            taskId: input.taskId ?? null,
            payload: { decision_id: counter.id, superseded: input.decisionId },
          })
        }

        events.push({
          id: `counter:${counter.id}`,
          kind: 'tagro_counter',
          title: counter.client_title || counter.title || 'Alternative von Tagro',
          body: counter.client_summary || counter.tagro_recommendation_reason || null,
          actor: 'tagro',
          timestamp: new Date().toISOString(),
          taskId: input.taskId ?? null,
          decisionId: counter.id,
          status: counter.status,
          actionable: true,
          link: `/decisions?open=${counter.id}`,
        })
      }
    } catch {
      // Counter-proposal is best-effort — rejection is still recorded.
    }
  }

  return { counterDecisionId, events }
}

export async function getCoordinationState(
  sb: SupabaseClient<any>,
  input: { projectId: string; taskId?: string | null },
): Promise<CoordinationState> {
  const events: CoordinationEvent[] = []

  let taskQuery = sb
    .from('tasks')
    .select('id, title, description, client_description, task_type, dev_status, client_status, created_at, updated_at')
    .eq('project_id', input.projectId)
    .order('created_at', { ascending: false })
    .limit(input.taskId ? 1 : 12)

  if (input.taskId) taskQuery = taskQuery.eq('id', input.taskId)

  const { data: tasks } = await taskQuery

  for (const t of (tasks ?? []) as any[]) {
    if (t.task_type === 'client_request' || input.taskId) {
      events.push({
        id: `task:${t.id}`,
        kind: 'client_request',
        title: t.title,
        body: t.client_description || t.description,
        actor: 'client',
        timestamp: t.created_at,
        taskId: t.id,
        status: t.dev_status || t.client_status,
        link: `/dev/tasks?id=${t.id}`,
      })
    }
  }

  let decQuery = sb
    .from('decisions')
    .select('id, title, client_title, client_summary, status, urgency, tagro_recommendation_reason, recommended_option, source_task_id, created_at, updated_at, decided_at')
    .eq('project_id', input.projectId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (input.taskId) decQuery = decQuery.eq('source_task_id', input.taskId)

  const { data: decisions } = await decQuery

  const openDecisions: CoordinationState['openDecisions'] = []

  for (const d of (decisions ?? []) as any[]) {
    const isOpen = OPEN_DECISION_STATUSES.has(d.status)
    if (isOpen) {
      openDecisions.push({
        id: d.id,
        title: d.client_title || d.title,
        status: d.status,
        urgency: d.urgency,
        tagroRecommended: d.recommended_option || d.tagro_recommendation_reason,
      })
      events.push({
        id: `decision:${d.id}`,
        kind: 'decision_pending',
        title: d.client_title || d.title,
        body: d.client_summary,
        actor: 'tagro',
        timestamp: d.created_at,
        taskId: d.source_task_id,
        decisionId: d.id,
        status: d.status,
        actionable: true,
        link: `/decisions?open=${d.id}`,
      })
    } else if (d.status === 'decided' || d.status === 'applied') {
      events.push({
        id: `decided:${d.id}`,
        kind: 'decision_accepted',
        title: d.client_title || d.title,
        actor: 'client',
        timestamp: d.decided_at || d.updated_at,
        taskId: d.source_task_id,
        decisionId: d.id,
        status: d.status,
      })
    } else if (d.status === 'rejected') {
      events.push({
        id: `rejected:${d.id}`,
        kind: 'decision_rejected',
        title: d.client_title || d.title,
        actor: 'client',
        timestamp: d.updated_at,
        taskId: d.source_task_id,
        decisionId: d.id,
        status: d.status,
      })
    }
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const pendingClientActions = openDecisions.length
  const pendingDevActions = (tasks ?? []).filter((t: any) =>
    t.task_type === 'client_request'
    && ['new', 'assigned', 'todo'].includes(String(t.dev_status || '').toLowerCase()),
  ).length

  return {
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    events: events.slice(0, 24),
    openDecisions,
    pendingClientActions,
    pendingDevActions,
  }
}
