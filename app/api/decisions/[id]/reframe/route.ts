import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectFromSignal, frameDecision } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/reframe
 *
 * Re-runs Veyra framing on an existing decision and moves it back to
 * 'pending_client'. Used after a clarification:
 *
 *   1. Client asks a question via /discuss → state = awaiting_clarification.
 *   2. Dev / Owner answers the question (body.clarification_answer) and
 *      optionally provides updated_question and updated_options.
 *   3. This endpoint:
 *        - Loads the original signal context from the decision row
 *        - Builds a fresh dev_request signal with the answer baked in
 *        - Calls detect → frame
 *        - Updates the existing row's framing fields + status
 *        - Logs a 'clarification_resolved' decision_events row (the
 *          status trigger also fires the bare transition row)
 *
 * Authority: project owner, or the user who originally created the decision.
 *
 * Body: {
 *   clarification_answer: string  (required)
 *   updated_question?: string      // refines the original question
 *   updated_options?: string[]     // refines the seed options
 * }
 */

type Body = {
  clarification_answer?: string
  updated_question?: string
  updated_options?: string[]
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  const answer = body.clarification_answer?.trim()
  if (!answer) return NextResponse.json({ error: 'clarification_answer required' }, { status: 400 })

  const { data: d } = await (supa as any).from('decisions')
    .select('*').eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Authority: owner of the project or the dev who created the decision.
  const { data: proj } = await (supa as any).from('projects')
    .select('user_id').eq('id', d.project_id).maybeSingle()
  const isOwner = proj?.user_id === user.id
  const isCreator = d.created_by === user.id
  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  // Reframe is only meaningful from awaiting_clarification (or the
  // legacy stuck-open states).
  const allowed = ['awaiting_clarification', 'open', 'waiting_for_client', 'in_progress', 'pending_client', 'drafted']
  if (!allowed.includes(d.status)) {
    return NextResponse.json({ error: 'cannot reframe a closed decision', current_status: d.status }, { status: 400 })
  }

  // Build a refreshed dev_request signal. We carry through whatever we
  // have on the row plus the clarification answer.
  const originalQuestion = d.internal_description || d.description || d.internal_title || d.title || ''
  const refinedQuestion = (body.updated_question?.trim() || originalQuestion)
    + (originalQuestion ? '\n\n' : '')
    + 'Klärung: ' + answer

  const seeds = Array.isArray(body.updated_options)
    ? body.updated_options.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : (Array.isArray(d.options_json) ? (d.options_json as Array<{ label?: string }>).map((o) => o.label || '').filter(Boolean) : [])

  const signal: DecisionSignal = {
    kind: 'dev_request',
    projectId: d.project_id,
    taskId: d.source_task_id || undefined,
    authorUserId: user.id,
    question: refinedQuestion.slice(0, 4000),
    suggestedOptions: seeds.slice(0, 6),
    suggestedResponseType: d.response_type || undefined,
    suggestedDecisionType: d.decision_type || undefined,
    urgency: d.urgency,
  }

  const intent = detectFromSignal(signal)
  if (!intent) {
    return NextResponse.json({ error: 'engine_no_intent' }, { status: 500 })
  }
  const framed = await frameDecision(intent)

  // Update framing fields in place — we don't create a new row.
  const { data: updated, error } = await (supa as any).from('decisions').update({
    internal_title: framed.internalTitle,
    internal_description: framed.internalDescription,
    client_title: framed.clientTitle,
    client_summary: framed.clientSummary,
    tagro_reasoning: framed.tagroReasoning,
    tagro_recommendation_reason: framed.tagroRecommendationReason,
    tagro_confidence_in_framing: framed.tagroConfidenceInFraming,
    response_type: framed.responseType,
    // Legacy mirrors.
    title: framed.clientTitle,
    description: framed.clientSummary,
    status: 'pending_client',
  }).eq('id', d.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Refresh decision_options: wipe + reinsert under the same decision_id.
  // This is the cleanest semantics — re-framing produces a fresh option
  // set, the audit trail still lives in decision_events.
  await (supa as any).from('decision_options').delete().eq('decision_id', d.id)
  if (framed.options.length > 0) {
    const rows = framed.options.map((o, i) => ({
      decision_id: d.id,
      ordinal: i,
      external_id: `opt-${i + 1}`,
      label: o.label,
      client_label: o.clientLabel,
      description: o.description ?? null,
      technical_notes: o.technicalNotes ?? null,
      implications_json: o.implications,
      recommended_by_tagro: o.recommendedByVeyra,
    }))
    await (supa as any).from('decision_options').insert(rows)
  }

  // Explicit audit entry capturing the clarification context.
  await (supa as any).from('decision_events').insert({
    decision_id: d.id,
    event_type: 'clarification_resolved',
    actor_user_id: user.id,
    actor_kind: 'user',
    from_status: 'awaiting_clarification',
    to_status: 'pending_client',
    payload: {
      clarification_answer: answer,
      updated_question: body.updated_question ?? null,
      model: framed.model,
      confidence: framed.tagroConfidenceInFraming,
    },
  })

  return NextResponse.json({ decision: updated, framed })
}
