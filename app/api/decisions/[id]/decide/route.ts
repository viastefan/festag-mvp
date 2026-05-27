import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeResponseValue, type DecisionResponseValue, type ResponseType } from '@/lib/decisions/types'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/decide
 *
 * Records the chosen answer for a decision. Supports all four response
 * types from the v1 engine plus the legacy single-option flow:
 *
 *   - response_value: typed jsonb payload — accepts
 *       { selected_option_id }            single_choice
 *       { binary_value: 'yes' | 'no' }    binary
 *       { selected_option_ids: string[] } multi_choice
 *       { free_text }                     free_text
 *
 *   - rationale (optional): why this option was chosen, free text.
 *
 *   - selected_option / decision_note (legacy body): still accepted, mapped
 *     to response_value when response_type is single_choice / free_text.
 *
 * Authority check is enforced via `authority` + the legacy `requested_for`.
 * Status transitions to `decided`; the audit trigger emits the event.
 */

type LegacyBody = { selected_option?: string; decision_note?: string }
type V1Body = { response_value?: unknown; rationale?: string }

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as LegacyBody & V1Body

  const { data: d } = await (supa as any).from('decisions')
    .select('id,created_by,project_id,title,client_title,requested_for,response_type,authority,status,delegate_allowed,decision_type')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Authority check.
  // - If requested_for is set, only that user may decide (legacy behaviour).
  // - Owner authority decisions: project owner is allowed too (handled below).
  let allowed = false
  if (d.requested_for && d.requested_for === user.id) allowed = true
  if (!allowed && (d.authority === 'owner' || d.authority === 'client_and_owner')) {
    const { data: proj } = await (supa as any).from('projects').select('user_id').eq('id', d.project_id).maybeSingle()
    if (proj?.user_id === user.id) allowed = true
  }
  if (!allowed && !d.requested_for) {
    // Fallback for old decisions without requested_for: project owner only.
    const { data: proj } = await (supa as any).from('projects').select('user_id,client_id').eq('id', d.project_id).maybeSingle()
    if (proj?.user_id === user.id || proj?.client_id === user.id) allowed = true
  }
  if (!allowed) {
    return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  if (!d.delegate_allowed && body && (body as any).delegate_to_tagro) {
    return NextResponse.json({ error: 'delegation not allowed for this decision type' }, { status: 400 })
  }

  // Build the canonical response_value.
  const responseType = (d.response_type || 'single_choice') as ResponseType
  let responseValue: DecisionResponseValue | null = null

  if (body.response_value) {
    responseValue = normalizeResponseValue(responseType, body.response_value)
  } else {
    // Legacy mapping.
    if (responseType === 'single_choice' && body.selected_option) {
      responseValue = { selected_option_id: String(body.selected_option) }
    } else if (responseType === 'free_text' && body.decision_note?.trim()) {
      responseValue = { free_text: body.decision_note.trim() }
    } else if (responseType === 'binary' && body.selected_option) {
      const v = body.selected_option.toLowerCase()
      if (v === 'yes' || v === 'ja') responseValue = { binary_value: 'yes' }
      if (v === 'no' || v === 'nein') responseValue = { binary_value: 'no' }
    }
  }

  if (!responseValue) {
    return NextResponse.json({
      error: 'response_value missing or does not match response_type',
      response_type: responseType,
    }, { status: 400 })
  }

  // Legacy mirror — keep email / older surfaces readable.
  const selectedLegacy =
    'selected_option_id' in responseValue ? responseValue.selected_option_id
    : 'binary_value' in responseValue ? responseValue.binary_value
    : 'selected_option_ids' in responseValue ? responseValue.selected_option_ids.join(',')
    : null

  const noteLegacy =
    'free_text' in responseValue ? responseValue.free_text
    : body.decision_note?.trim() || body.rationale?.trim() || null

  const { data: updated, error } = await (supa as any).from('decisions').update({
    response_value: responseValue,
    rationale: body.rationale?.slice(0, 4000) ?? null,
    selected_option: selectedLegacy,
    decision_note: noteLegacy?.slice(0, 4000) ?? null,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
    status: 'decided',
  }).eq('id', ctx.params.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the requesting dev — they need to see the answer.
  if (d.created_by && d.created_by !== user.id) {
    await (supa as any).from('notifications').insert({
      user_id: d.created_by,
      project_id: d.project_id,
      kind: 'decision_answered',
      type: 'decision_answered',
      title: `Entscheidung getroffen: ${d.client_title || d.title}`,
      body: noteLegacy?.slice(0, 200) || (selectedLegacy ? `Antwort: ${selectedLegacy}` : ''),
      link: `/decisions?open=${ctx.params.id}`,
      payload: {
        decision_id: ctx.params.id,
        response_type: responseType,
        response_value: responseValue,
      },
    })
  }

  return NextResponse.json({ decision: updated })
}
