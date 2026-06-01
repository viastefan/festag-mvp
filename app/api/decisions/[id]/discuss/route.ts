import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/discuss
 *
 * The client (or owner) asks a clarifying question instead of deciding.
 * State moves to 'awaiting_clarification' and the question is recorded as
 * a decision_events row of type 'clarification_requested'. The status
 * trigger emits the state-transition event too; this endpoint enriches
 * the payload with the question text.
 *
 * Veyra picks the question up via a background re-framer (Phase 6) or
 * a manual re-frame action. This endpoint does not call the LLM.
 */

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { question } = (await req.json().catch(() => ({}))) as { question?: string }
  if (!question || !question.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }
  const trimmed = question.trim().slice(0, 4000)

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,status,created_by,requested_for,client_title,title')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Permission: requested_for, project owner, or project client.
  let allowed = d.requested_for === user.id
  if (!allowed) {
    const { data: proj } = await (supa as any).from('projects').select('user_id,client_id').eq('id', d.project_id).maybeSingle()
    if (proj?.user_id === user.id || proj?.client_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  // State transition: only valid from an open state.
  const openStates = ['drafted', 'pending_client', 'open', 'waiting_for_client', 'in_progress']
  if (!openStates.includes(d.status)) {
    return NextResponse.json({ error: 'cannot discuss a closed decision', current_status: d.status }, { status: 400 })
  }

  const { data: updated, error } = await (supa as any).from('decisions')
    .update({ status: 'awaiting_clarification' })
    .eq('id', ctx.params.id)
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Explicit clarification audit row with the question text (trigger row
  // covers the bare status transition).
  await (supa as any).from('decision_events').insert({
    decision_id: ctx.params.id,
    event_type: 'clarification_requested',
    actor_user_id: user.id,
    actor_kind: 'user',
    from_status: d.status,
    to_status: 'awaiting_clarification',
    payload: { question: trimmed },
  })

  // Notify the requesting dev so they see the clarification request.
  if (d.created_by && d.created_by !== user.id) {
    await (supa as any).from('notifications').insert({
      user_id: d.created_by,
      project_id: d.project_id,
      kind: 'decision_clarification',
      type: 'decision_clarification',
      title: `Rückfrage zu „${d.client_title || d.title}"`,
      body: trimmed.slice(0, 200),
      link: `/decisions?open=${ctx.params.id}`,
      payload: { decision_id: ctx.params.id, question: trimmed },
    })
  }

  return NextResponse.json({ decision: updated, question: trimmed })
}
