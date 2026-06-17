import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/assign   { assignee_id: string }
 *
 * Hands a decision to a specific teammate (e.g. a co-founder in the client
 * portal once a team exists). Sets `requested_for` to the chosen user so the
 * decision routes to them and shows up in their queue.
 *
 * Authority to reassign:
 *   - the project owner (projects.user_id) or client (projects.client_id), or
 *   - the person it is currently routed to (requested_for) handing it off.
 *
 * The assignee must be a member of the project's workspace (or the project
 * owner / client themselves). Decided / applied decisions cannot be reassigned.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const assigneeId: string | null = body?.assignee_id ?? null
  if (!assigneeId) return NextResponse.json({ error: 'assignee_id required' }, { status: 400 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,requested_for,status')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (d.status === 'decided' || d.status === 'applied') {
    return NextResponse.json({ error: 'already_decided', reason: 'Entschiedene Entscheidungen können nicht neu zugewiesen werden.' }, { status: 400 })
  }

  const { data: proj } = await (supa as any).from('projects')
    .select('user_id,client_id,workspace_id').eq('id', d.project_id).maybeSingle()

  // Who may reassign.
  const canAssign =
    (d.requested_for && d.requested_for === user.id) ||
    proj?.user_id === user.id ||
    proj?.client_id === user.id
  if (!canAssign) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  // The assignee must belong to the project's workspace, or be the owner/client.
  let assigneeValid = assigneeId === proj?.user_id || assigneeId === proj?.client_id
  if (!assigneeValid && proj?.workspace_id) {
    const { data: member } = await (supa as any).from('workspace_members')
      .select('user_id').eq('workspace_id', proj.workspace_id).eq('user_id', assigneeId).maybeSingle()
    assigneeValid = !!member
  }
  if (!assigneeValid) {
    return NextResponse.json({ error: 'invalid_assignee', reason: 'Diese Person ist kein Mitglied des Workspaces.' }, { status: 400 })
  }

  const { data: updated, error } = await (supa as any).from('decisions').update({
    requested_for: assigneeId,
    notified_at: null, // re-notify the new assignee
  }).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort audit trail (table may not exist on older DBs).
  try {
    await (supa as any).from('decision_events').insert({
      decision_id: ctx.params.id,
      event_type: 'reassigned',
      actor_user_id: user.id,
      actor_kind: 'user',
      payload: { assignee_id: assigneeId, from: d.requested_for ?? null },
    })
  } catch {}

  return NextResponse.json({ decision: updated, assigned_to: assigneeId })
}
