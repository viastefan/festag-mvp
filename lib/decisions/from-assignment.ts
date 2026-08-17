// ─────────────────────────────────────────────────────────────────────────────
// Assignment → Decision
//
// Handing work to someone in another account is not a notification, it is a
// question: "will you take this on?". Until now an assignment silently set
// tasks.assigned_to and the other side found out by looking. This turns the
// crossing itself into a decision in the assignee's account, with the same
// engine, audit trail and deadline machinery as every other decision.
//
// The rule matters more than the mechanism. If every assignment became a
// decision, the board would fill with noise and stop being the place where the
// few things that need a human live. So the gate is narrow and explicit, and
// every rejection reason is named.
// ─────────────────────────────────────────────────────────────────────────────

import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'

export type AssignmentSignal = {
  taskId: string
  projectId: string
  /** Who the work is being handed to. */
  assignedTo: string
  /** Who is handing it over. */
  assignedBy: string
  /** Optional note from the assigner — becomes the decision's context. */
  note?: string | null
  /** Hard deadline for accepting, if the assigner set one. */
  respondBy?: string | null
}

export type AssignmentOutcome =
  | { status: 'created'; decisionId: string }
  | { status: 'skipped'; reason: SkipReason }

export type SkipReason =
  | 'no_assignee'
  | 'self_assignment'
  | 'same_account_no_crossing'
  | 'already_pending'
  | 'task_not_found'

/** Human wording for the audit trail and for logs. */
export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
  no_assignee: 'Keine Person zugewiesen.',
  self_assignment: 'Selbst zugewiesen — niemand muss zustimmen.',
  same_account_no_crossing: 'Zuweisung innerhalb desselben Kontos.',
  already_pending: 'Für diese Aufgabe wartet bereits eine Übernahme-Entscheidung.',
  task_not_found: 'Aufgabe nicht gefunden.',
}

/**
 * Should this assignment become a decision?
 *
 * Yes only when the work crosses to another person. Assigning to yourself,
 * re-assigning to the person who already holds it, or piling a second request
 * on top of an unanswered one all stay silent — the board earns its meaning by
 * what it refuses to show.
 */
export function shouldRaiseDecision(
  signal: AssignmentSignal,
  ctx: { currentAssignee: string | null; hasPendingHandover: boolean },
): { raise: true } | { raise: false; reason: SkipReason } {
  if (!signal.assignedTo) return { raise: false, reason: 'no_assignee' }
  if (signal.assignedTo === signal.assignedBy) return { raise: false, reason: 'self_assignment' }
  if (ctx.currentAssignee === signal.assignedTo) {
    return { raise: false, reason: 'same_account_no_crossing' }
  }
  if (ctx.hasPendingHandover) return { raise: false, reason: 'already_pending' }
  return { raise: true }
}

/**
 * Performs the assignment and, when the gate opens, raises the decision that
 * asks the assignee to accept it. The task is linked as blocked by the
 * decision, so the existing apply-propagation unblocks it on acceptance —
 * no second code path for the same effect.
 */
export async function assignWithDecision(
  supa: any,
  signal: AssignmentSignal,
): Promise<AssignmentOutcome> {
  const { data: task } = await supa
    .from('tasks')
    .select('id, title, project_id, assigned_to, priority')
    .eq('id', signal.taskId)
    .maybeSingle()

  if (!task) return { status: 'skipped', reason: 'task_not_found' }

  // Is there already an unanswered handover for this task?
  const { data: pending } = await supa
    .from('decisions')
    .select('id')
    .eq('source_task_id', signal.taskId)
    .eq('source', 'task_handover')
    .in('status', DECISION_OPEN_STATUS_LIST)
    .limit(1)

  const gate = shouldRaiseDecision(signal, {
    currentAssignee: task.assigned_to ?? null,
    hasPendingHandover: (pending?.length ?? 0) > 0,
  })

  if (!gate.raise) {
    // Still perform the plain assignment — the decision is the ceremony, not
    // the act. Skipping the ceremony must never skip the work.
    if (signal.assignedTo) {
      await supa.from('tasks').update({ assigned_to: signal.assignedTo }).eq('id', signal.taskId)
    }
    return { status: 'skipped', reason: gate.reason }
  }

  const title = task.title || 'Aufgabe'
  const { data: decision, error } = await supa.from('decisions').insert({
    project_id: signal.projectId,
    source: 'task_handover',
    source_task_id: signal.taskId,
    title: `Aufgabe übernehmen: ${title}`,
    description: signal.note?.slice(0, 4000) || null,
    client_title: `Übernimmst du „${title}"?`,
    client_summary: signal.note?.slice(0, 400)
      || 'Jemand aus dem Team möchte diese Aufgabe an dich übergeben.',
    status: 'pending_client',
    decision_type: 'approval',
    response_type: 'binary',
    authority: 'client',
    reversibility: 'two_way_door',
    auto_resolve_strategy: 'escalate_only',
    delegate_allowed: false,
    visible_to_client: true,
    urgency: task.priority === 'critical' ? 'critical'
      : task.priority === 'high' ? 'high'
      : 'normal',
    deadline_hard: signal.respondBy || null,
    created_by: signal.assignedBy,
    requested_for: signal.assignedTo,
    tagro_reasoning:
      'Diese Aufgabe wurde dir übergeben. Solange du nicht zugesagt hast, '
      + 'bleibt offen, wer sie umsetzt — deshalb liegt sie hier als Entscheidung.',
  }).select('id').single()

  if (error || !decision) {
    // The handover question failed; do not lose the assignment itself.
    await supa.from('tasks').update({ assigned_to: signal.assignedTo }).eq('id', signal.taskId)
    return { status: 'skipped', reason: 'task_not_found' }
  }

  // The task waits on the answer. Accepting runs through the normal apply
  // propagation, which unblocks it — one path, not two.
  await supa.from('decision_links').insert({
    decision_id: decision.id,
    target_kind: 'task',
    target_id: signal.taskId,
    link_kind: 'blocks',
    metadata: { handover: true, from: signal.assignedBy, to: signal.assignedTo },
  }).then(() => null, () => null)

  await supa.from('decision_events').insert({
    decision_id: decision.id,
    event_type: 'created',
    actor_user_id: signal.assignedBy,
    actor_kind: 'user',
    to_status: 'pending_client',
    payload: {
      origin: 'task_handover',
      task_id: signal.taskId,
      from_user: signal.assignedBy,
      to_user: signal.assignedTo,
      previous_assignee: task.assigned_to ?? null,
    },
  }).then(() => null, () => null)

  return { status: 'created', decisionId: decision.id }
}
