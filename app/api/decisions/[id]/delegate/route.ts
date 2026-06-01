import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DECISION_TYPES_NO_DELEGATE, type DecisionResponseValue } from '@/lib/decisions/types'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/delegate
 *
 * The client delegates this decision to Veyra. Veyra picks an option and
 * documents why, the decision lands in 'decided' immediately with
 * `decided_by = null` and `tagro_delegation_reason` set. An override
 * window of 48 hours is recorded — the client can still revise via
 * /decide during that window (audit trail preserved).
 *
 * Forbidden for legal / payment / contract / data_protection types.
 * Forbidden when the decision was explicitly created with
 * delegate_allowed = false.
 */

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,response_type,decision_type,delegate_allowed,authority,requested_for,client_title,title,status')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Authority check — same as /decide.
  let allowed = false
  if (d.requested_for && d.requested_for === user.id) allowed = true
  if (!allowed) {
    const { data: proj } = await (supa as any).from('projects').select('user_id,client_id').eq('id', d.project_id).maybeSingle()
    if (proj?.user_id === user.id || proj?.client_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  // Delegation rules.
  if (!d.delegate_allowed) {
    return NextResponse.json({ error: 'delegate_not_allowed', reason: 'delegate_allowed=false on this decision' }, { status: 400 })
  }
  if (DECISION_TYPES_NO_DELEGATE.has(d.decision_type)) {
    return NextResponse.json({ error: 'delegate_not_allowed', reason: 'decision_type forbids delegation' }, { status: 400 })
  }
  if (d.response_type === 'free_text') {
    return NextResponse.json({ error: 'delegate_not_allowed', reason: 'free_text decisions require human input' }, { status: 400 })
  }

  // Pick Veyra's option:
  //   1. recommended_by_tagro=true option, if any.
  //   2. ordinal=0 option (first), if any.
  //   3. binary fallback: yes.
  const { data: options } = await (supa as any)
    .from('decision_options')
    .select('id,external_id,label,client_label,ordinal,recommended_by_tagro,description,implications_json')
    .eq('decision_id', d.id)
    .order('ordinal', { ascending: true })

  const list = (options as any[]) ?? []
  let chosen: any = list.find((o) => o.recommended_by_tagro) ?? list[0] ?? null

  let responseValue: DecisionResponseValue | null = null
  let reasonSuffix = ''

  if (d.response_type === 'binary') {
    if (chosen) {
      const label = String(chosen.label || '').toLowerCase()
      const isNo = label === 'nein' || label === 'no'
      responseValue = { binary_value: isNo ? 'no' : 'yes' }
      reasonSuffix = `Antwort: ${isNo ? 'Nein' : 'Ja'}.`
    } else {
      responseValue = { binary_value: 'yes' }
      reasonSuffix = 'Antwort: Ja (Default).'
    }
  } else if (d.response_type === 'single_choice') {
    if (!chosen) return NextResponse.json({ error: 'delegate_not_allowed', reason: 'no options available to pick' }, { status: 400 })
    responseValue = { selected_option_id: chosen.external_id || chosen.id }
    reasonSuffix = `Gewählt: „${chosen.client_label || chosen.label}".`
  } else if (d.response_type === 'multi_choice') {
    // For multi_choice, Veyra picks the single recommended option only —
    // never multiple. Avoids cascading scope drift.
    if (!chosen) return NextResponse.json({ error: 'delegate_not_allowed', reason: 'no options available to pick' }, { status: 400 })
    responseValue = { selected_option_ids: [chosen.external_id || chosen.id] }
    reasonSuffix = `Gewählt: „${chosen.client_label || chosen.label}".`
  }

  if (!responseValue) {
    return NextResponse.json({ error: 'delegate_not_allowed', reason: 'cannot construct response_value' }, { status: 400 })
  }

  const recommendationText = chosen?.description
    ? `Habe diese Variante gewählt, weil sie laut Framing am besten passt: ${chosen.description}`
    : `Habe die empfohlene Variante übernommen. ${reasonSuffix}`

  const overrideWindowUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { data: updated, error } = await (supa as any).from('decisions').update({
    response_value: responseValue,
    rationale: null,
    decided_by: null, // null = Veyra-delegated; trigger detects this via tagro_delegation_reason being set
    decided_at: new Date().toISOString(),
    tagro_delegation_reason: recommendationText,
    override_window_until: overrideWindowUntil,
    status: 'decided',
    selected_option:
      'selected_option_id' in responseValue ? responseValue.selected_option_id
      : 'binary_value' in responseValue ? responseValue.binary_value
      : 'selected_option_ids' in responseValue ? responseValue.selected_option_ids.join(',')
      : null,
    decision_note: recommendationText.slice(0, 4000),
  }).eq('id', ctx.params.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    decision: updated,
    delegated: true,
    override_window_until: overrideWindowUntil,
    chosen_option_id: chosen?.id ?? null,
  })
}
