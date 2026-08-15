// ─────────────────────────────────────────────────────────────────────────────
// Die Rückrichtung: Entscheidung → Risiko.
//
// lib/risks/to-decision.ts stellt die Frage, hier kommt die Antwort an. Eine
// angewendete Entscheidung darf nicht bei „genehmigt" enden — sie bewegt das
// Risiko weiter und löst die Maßnahmen aus, die dafür freigegeben sind.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { actionsForAcceptedMeasure, runRiskActions, type ActionOutcome } from '@/lib/risks/actions'
import { writeEvent } from '@/lib/risks/engine'
import type { Risk } from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

type AnyClient = SupabaseClient<any, any, any>

export type DecisionOutcomeResult = {
  risk_id: string
  followed_recommendation: boolean
  actions: ActionOutcome[]
} | null

/**
 * Wurde die empfohlene Maßnahme gewählt — oder das Risiko bewusst in Kauf
 * genommen? Bei einer Ja/Nein-Frage ist das eindeutig; sonst entscheidet, ob
 * die gewählte Option die von Tagro empfohlene war.
 */
async function followedRecommendation(supa: AnyClient, decision: any): Promise<boolean> {
  const value = decision.response_value as Record<string, unknown> | null
  if (value && typeof value === 'object' && 'binary_value' in value) {
    return value.binary_value === 'yes'
  }

  const selected = value && typeof value === 'object' && 'selected_option_id' in value
    ? String(value.selected_option_id)
    : null
  if (!selected) return true // ohne klare Gegenwahl gilt die Empfehlung als angenommen

  const options = await safeTableRows<any>(
    (supa as any)
      .from('decision_options')
      .select('id,external_id,recommended_by_tagro')
      .eq('decision_id', decision.id),
  )
  const option = options.find(o => o.id === selected || o.external_id === selected)
  return option ? !!option.recommended_by_tagro : true
}

/**
 * Wird nach dem Anwenden einer Entscheidung aufgerufen. Gibt null zurück,
 * wenn an der Entscheidung kein Risiko hängt — der Normalfall.
 */
export async function applyDecisionOutcomeToRisk(
  supa: AnyClient,
  decisionId: string,
  userId: string | null,
): Promise<DecisionOutcomeResult> {
  const { data: risk } = await (supa as any)
    .from('risks').select('*').eq('decision_id', decisionId).maybeSingle()
  if (!risk) return null

  const { data: decision } = await (supa as any)
    .from('decisions')
    .select('id,response_value,rationale,client_title,internal_title,title')
    .eq('id', decisionId)
    .maybeSingle()
  if (!decision) return null

  const followed = await followedRecommendation(supa, decision)
  const now = new Date().toISOString()

  // Empfehlung angenommen → wir handeln und beobachten weiter.
  // Bewusst dagegen entschieden → das Risiko bleibt, aber getragen.
  const patch = followed
    ? { status: 'monitoring', response: 'mitigate' }
    : { status: 'accepted', response: 'accept' }

  await (supa as any)
    .from('risks')
    .update({
      ...patch,
      responded_by: userId,
      responded_at: now,
      response_note: decision.rationale ?? null,
    })
    .eq('id', risk.id)

  await writeEvent(supa, risk.id, {
    event_type: 'decision_applied',
    actor_kind: 'user',
    actor_user_id: userId,
    from_status: risk.status,
    to_status: patch.status,
    summary: followed
      ? 'Die Entscheidung ist gefallen: Die empfohlene Maßnahme wird umgesetzt.'
      : 'Die Entscheidung ist gefallen: Das Risiko wird bewusst in Kauf genommen.',
    payload: { decision_id: decisionId, followed_recommendation: followed },
  })

  if (!followed) {
    return { risk_id: risk.id, followed_recommendation: false, actions: [] }
  }

  // Die Freigabe der Entscheidung ist die Freigabe für die Maßnahmen.
  const actions = await actionsForAcceptedMeasure(supa, { ...risk, ...patch } as Risk)
  const outcomes = await runRiskActions(supa, {
    risk: { ...risk, ...patch } as Risk,
    actions,
    approvedBy: userId,
    approvalContext: `Entscheidung ${decisionId}`,
  })

  return { risk_id: risk.id, followed_recommendation: true, actions: outcomes }
}
