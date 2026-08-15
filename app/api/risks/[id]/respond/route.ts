import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  actionsForAcceptedMeasure,
  runRiskActions,
  type ActionOutcome,
} from '@/lib/risks/actions'
import { writeEvent } from '@/lib/risks/engine'
import { computeSeverity } from '@/lib/risks/severity'
import { RESPONSE_LABEL } from '@/lib/risks/present'
import { createDecisionForRisk } from '@/lib/risks/to-decision'
import {
  PROBABILITY_BY_LEVEL,
  isValidRiskLevel,
  isValidRiskResponse,
  type Risk,
  type RiskLink,
  type RiskResponse,
  type RiskStatus,
} from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/**
 * POST /api/risks/[id]/respond
 *
 * The end of the Risiko flow: the assessment the human made (impact +
 * probability) and the Maßnahme they picked. Delegating hands the question to
 * the decision engine instead of ending here.
 *
 * Body: {
 *   impact?, probability_level?, probability?,
 *   response: 'accept' | 'mitigate' | 'delegate' | 'monitor',
 *   note?, followed_recommendation?
 * }
 */
const STATUS_BY_RESPONSE: Record<RiskResponse, RiskStatus> = {
  accept: 'accepted',
  mitigate: 'monitoring',
  delegate: 'decision_required',
  monitor: 'monitoring',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  if (!isValidRiskResponse(body.response)) {
    return NextResponse.json({ error: 'response must be accept|mitigate|delegate|monitor' }, { status: 400 })
  }
  const response = body.response as RiskResponse

  const { data: current } = await (supa as any)
    .from('risks').select('*').eq('id', params.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const risk = current as Risk

  const impact = isValidRiskLevel(body.impact) ? body.impact : risk.impact
  const probability = typeof body.probability === 'number'
    ? Math.min(1, Math.max(0, body.probability))
    : body.probability_level && body.probability_level in PROBABILITY_BY_LEVEL
      ? PROBABILITY_BY_LEVEL[body.probability_level as keyof typeof PROBABILITY_BY_LEVEL]
      : risk.probability ?? 0.5

  const links = await safeTableRows<RiskLink>(
    (supa as any).from('risk_links').select('*').eq('risk_id', risk.id),
  )

  const { severity } = computeSeverity({
    probability,
    impact,
    dependentCount: links.filter(l => l.target_kind === 'task').length,
  })

  const now = new Date().toISOString()
  const { data: updated, error } = await (supa as any)
    .from('risks')
    .update({
      impact,
      probability,
      severity,
      response,
      response_note: typeof body.note === 'string' ? body.note.trim() || null : null,
      responded_by: user.id,
      responded_at: now,
      status: STATUS_BY_RESPONSE[response],
    })
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep what Festag recommended next to what the human actually chose. When
  // the two differ, that disagreement is the interesting part of the record.
  const followed = body.followed_recommendation === true
  await writeEvent(supa, params.id, {
    event_type: 'responded',
    actor_kind: 'user',
    actor_user_id: user.id,
    from_status: risk.status,
    to_status: STATUS_BY_RESPONSE[response],
    summary: followed
      ? `Empfehlung übernommen: ${RESPONSE_LABEL[response]}.`
      : `Maßnahme gewählt: ${RESPONSE_LABEL[response]}.`,
    payload: {
      recommendation: risk.recommendation,
      chosen_response: response,
      followed_recommendation: followed,
      assessed_impact: impact,
      assessed_probability: probability,
      previous_impact: risk.impact,
      previous_probability: risk.probability,
    },
  })

  // „Absichern" heißt: es passiert etwas. Was genau, hängt an der Autonomie
  // des Workspace — was nicht automatisch laufen darf, kommt als offene
  // Aktion zurück, statt still zu verschwinden.
  let actions: ActionOutcome[] = []
  if (response === 'mitigate') {
    const next = { ...risk, impact, probability, severity, status: STATUS_BY_RESPONSE[response] }
    actions = await runRiskActions(supa, {
      risk: next,
      actions: await actionsForAcceptedMeasure(supa, next),
      approvedBy: user.id,
      approvalContext: 'Maßnahme im Risiko-Flow gewählt',
    }).catch(() => [])
  }

  let decisionId: string | null = risk.decision_id ?? null
  if (response === 'delegate') {
    const created = await createDecisionForRisk(supa, { ...risk, impact, probability, severity }, {
      requestedFor: risk.owner_id ?? null,
      createdBy: user.id,
      links,
    }).catch(() => null)
    if (created) decisionId = created.decisionId
  }

  return NextResponse.json({
    risk: updated,
    decision_id: decisionId,
    status: STATUS_BY_RESPONSE[response],
    actions,
  })
}
