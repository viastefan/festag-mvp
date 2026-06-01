// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Persistence
//
// Writes a FramedDecision into the database as one logical unit:
//   1. INSERT into decisions (carries the bidirectional framing + state)
//   2. INSERT into decision_options (one row per option, ordinal preserved)
//   3. INSERT into decision_links (blocks[] and affects[] from the intent)
//
// We rely on the audit trigger trg_decisions_status_event to emit the
// 'created' event automatically — no explicit decision_events insert here.
//
// Service-role client is preferred (skips RLS), with a user-bound fallback
// when the caller already passes one. Updates blocked tasks to a sensible
// status downstream is NOT this layer's job (that's Phase 3 — apply()).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase/service'
import type { FramedDecision } from './intents'
import type { DecisionRow } from './types'

export type CreateDecisionResult = {
  decision: DecisionRow
  optionIds: string[]
  linkIds: string[]
}

export async function persistFramedDecision(
  framed: FramedDecision,
  opts: {
    requestedFor?: string | null
    createdBy?: string | null
    userClient?: SupabaseClient<any>
  } = {},
): Promise<CreateDecisionResult> {
  const supa = (getServiceClient() ?? opts.userClient) as SupabaseClient<any> | null
  if (!supa) {
    throw new Error('persistFramedDecision: no Supabase client available (service role missing and no userClient passed)')
  }

  const initialStatus = framed.initialStatus
  const intent = framed.intent
  const recommendedOption = framed.options.find((o) => o.recommendedByVeyra)

  // Legacy options_json kept populated so older surfaces / email render
  // paths keep working until Phase 4 swaps them to the structured table.
  const legacyOptionsJson = framed.options.map((o, i) => ({
    id: `opt-${i + 1}`,
    label: o.clientLabel,
    hint: o.description ?? undefined,
  }))

  const insertPayload: Record<string, unknown> = {
    project_id: intent.projectId,
    source: intent.origin.kind,
    source_task_id: intent.origin.kind === 'vague_task' || intent.origin.kind === 'blocker' || intent.origin.kind === 'dev_request'
      ? intent.origin.id
      : null,
    source_report_id: intent.origin.kind === 'status_report' ? intent.origin.id : null,
    // Legacy mirrors (keep older API GET / email working).
    title: framed.clientTitle,
    description: framed.clientSummary,
    options_json: legacyOptionsJson,
    recommended_option: recommendedOption ? recommendedOption.clientLabel : null,
    impact_summary: framed.tagroRecommendationReason,
    // v1 fields
    client_title: framed.clientTitle,
    client_summary: framed.clientSummary,
    internal_title: framed.internalTitle,
    internal_description: framed.internalDescription,
    tagro_reasoning: framed.tagroReasoning,
    tagro_recommendation_reason: framed.tagroRecommendationReason,
    tagro_confidence_in_framing: framed.tagroConfidenceInFraming,
    decision_type: framed.decisionType,
    response_type: framed.responseType,
    authority: framed.authority,
    delegate_allowed: framed.delegateAllowed,
    urgency: framed.urgency,
    status: initialStatus,
    visible_to_client: initialStatus === 'pending_client',
    created_by: opts.createdBy ?? null,
    created_by_tagro: intent.origin.kind !== 'dev_request',
    requested_for: opts.requestedFor ?? null,
  }

  const { data: decisionRow, error: decisionError } = await supa
    .from('decisions')
    .insert(insertPayload)
    .select('*')
    .single()

  if (decisionError || !decisionRow) {
    throw new Error(`persistFramedDecision: insert failed — ${decisionError?.message ?? 'unknown error'}`)
  }

  const decision = decisionRow as DecisionRow

  // Options.
  const optionRows = framed.options.map((o, i) => ({
    decision_id: decision.id,
    ordinal: i,
    external_id: `opt-${i + 1}`,
    label: o.label,
    client_label: o.clientLabel,
    description: o.description ?? null,
    technical_notes: o.technicalNotes ?? null,
    implications_json: o.implications,
    recommended_by_tagro: o.recommendedByVeyra,
  }))

  let optionIds: string[] = []
  if (optionRows.length > 0) {
    const { data: optsRows, error: optsError } = await supa
      .from('decision_options')
      .insert(optionRows)
      .select('id')
    if (optsError) {
      throw new Error(`persistFramedDecision: options insert failed — ${optsError.message}`)
    }
    optionIds = (optsRows ?? []).map((r: any) => r.id)
  }

  // Links.
  const linkRows = [
    ...(intent.blocks ?? []).map((l) => ({
      decision_id: decision.id,
      target_kind: l.kind,
      target_id: l.id,
      link_kind: 'blocks' as const,
      metadata: {},
    })),
    ...(intent.affects ?? []).map((l) => ({
      decision_id: decision.id,
      target_kind: l.kind,
      target_id: l.id,
      link_kind: 'affects' as const,
      metadata: {},
    })),
  ]

  let linkIds: string[] = []
  if (linkRows.length > 0) {
    const { data: linksData, error: linksError } = await supa
      .from('decision_links')
      .insert(linkRows)
      .select('id')
    if (linksError) {
      // Non-fatal: the decision exists and is usable without links. Surface
      // the error to logs but don't roll back the parent.
      console.error('persistFramedDecision: links insert failed', linksError.message)
    } else {
      linkIds = (linksData ?? []).map((r: any) => r.id)
    }
  }

  return { decision, optionIds, linkIds }
}


// ── Update path for duplicates ───────────────────────────────────────────────
//
// When the duplicate detector matches an existing open decision, we refresh
// its urgency to max(old, new) and append a new origin to its audit trail.
// We do NOT replace framing — the existing one was already shown to the
// client.

export async function refreshExistingDecision(
  existing: DecisionRow,
  framed: FramedDecision,
  opts: { userClient?: SupabaseClient<any> } = {},
): Promise<DecisionRow> {
  const supa = (getServiceClient() ?? opts.userClient) as SupabaseClient<any> | null
  if (!supa) {
    throw new Error('refreshExistingDecision: no Supabase client available')
  }

  const urgencyRank: Record<string, number> = { low: 0, normal: 1, high: 2, critical: 3 }
  const newRank = urgencyRank[framed.urgency] ?? 1
  const oldRank = urgencyRank[existing.urgency] ?? 1
  const targetUrgency = newRank > oldRank ? framed.urgency : existing.urgency

  const payload: Record<string, unknown> = {
    urgency: targetUrgency,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supa
    .from('decisions')
    .update(payload)
    .eq('id', existing.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`refreshExistingDecision: update failed — ${error?.message ?? 'unknown error'}`)
  }

  // Audit event explicit (bypassing the status-only trigger).
  await supa.from('decision_events').insert({
    decision_id: existing.id,
    event_type: 'reopened',
    actor_kind: 'tagro',
    payload: {
      origin: framed.intent.origin,
      previous_urgency: existing.urgency,
      new_urgency: targetUrgency,
      reason: 'duplicate_signal_received',
    },
  })

  return data as DecisionRow
}
