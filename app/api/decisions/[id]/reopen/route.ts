import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/reopen
 *
 * Takes an answer back. Used by the short undo window right after deciding,
 * and by the owner when an answer turns out to be wrong.
 *
 * The answer is cleared and the decision returns to `pending_client`, but the
 * history is not rewritten: a `reopened` event records who took it back and
 * what the previous answer was, so the trail still shows that a decision was
 * made and undone.
 *
 * Deliberately does NOT re-block tasks that the apply step unblocked. Within
 * the undo window nothing has started; beyond it, re-blocking work someone may
 * already be doing would be worse than leaving it running. The event says so.
 */

const REOPENABLE = new Set(['decided', 'applied', 'rejected'])

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,status,decided_by,requested_for,created_by,response_value,selected_option,decision_note,rationale,tagro_delegation_reason')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (!REOPENABLE.has(d.status)) {
    return NextResponse.json(
      { error: 'not reopenable', reason: 'Diese Entscheidung lässt sich nicht mehr zurückholen.' },
      { status: 409 },
    )
  }

  // Whoever answered may take it back; so may the project owner. A Tagro answer
  // (decided_by null) can be taken back by the person it was addressed to.
  let allowed = d.decided_by === user.id
  if (!allowed && !d.decided_by && d.requested_for === user.id) allowed = true
  if (!allowed) {
    const { data: proj } = await (supa as any).from('projects')
      .select('user_id').eq('id', d.project_id).maybeSingle()
    if (proj?.user_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  const { data: updated, error } = await (supa as any).from('decisions').update({
    status: 'pending_client',
    response_value: null,
    selected_option: null,
    decision_note: null,
    rationale: null,
    decided_by: null,
    decided_at: null,
    applied_at: null,
    tagro_delegation_reason: null,
    override_window_until: null,
  }).eq('id', ctx.params.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (supa as any).from('decision_events').insert({
    decision_id: ctx.params.id,
    event_type: 'reopened',
    actor_user_id: user.id,
    actor_kind: 'user',
    from_status: d.status,
    to_status: 'pending_client',
    payload: {
      previous_response: d.response_value ?? d.selected_option ?? null,
      previous_note: d.decision_note ?? d.rationale ?? null,
      was_tagro_answer: !!d.tagro_delegation_reason,
      // Stated explicitly so the trail never implies the work was rolled back.
      tasks_not_reverted: true,
    },
  })

  return NextResponse.json({ decision: updated })
}
