import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/decide
 *   Body: { selected_option?: string, decision_note?: string }
 *
 * Records the client's answer:
 *   • selected_option — id of an option from options_json, or 'freeform'
 *   • decision_note   — free-text answer/additional context
 *
 * Fans a notification back to the requesting dev (created_by) so they
 * see the decision in their inbox + dev panel.
 */

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { selected_option, decision_note } = (await req.json().catch(() => ({}))) as {
    selected_option?: string; decision_note?: string
  }

  if (!selected_option && !decision_note?.trim()) {
    return NextResponse.json({ error: 'either selected_option or decision_note is required' }, { status: 400 })
  }

  const { data: d } = await (supa as any).from('decisions')
    .select('id,created_by,project_id,title,requested_for')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (d.requested_for && d.requested_for !== user.id) {
    // Only the assigned decider answers. (Admins go through PATCH if they
    // need to nudge it.)
    return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  const { data: updated, error } = await (supa as any).from('decisions').update({
    selected_option: selected_option || null,
    decision_note: decision_note?.slice(0, 4000) || null,
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
      title: `Entscheidung getroffen: ${d.title}`,
      body: decision_note?.slice(0, 200) || (selected_option ? `Option gewählt: ${selected_option}` : ''),
      link: `/decisions?open=${ctx.params.id}`,
      payload: { decision_id: ctx.params.id, selected_option, has_note: !!decision_note },
    })
  }

  return NextResponse.json({ decision: updated })
}
