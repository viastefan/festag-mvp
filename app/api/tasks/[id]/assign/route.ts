import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignWithDecision, SKIP_REASON_TEXT } from '@/lib/decisions/from-assignment'
import { notifyDevDecisionEvent } from '@/lib/sync/decision-notify'

export const runtime = 'nodejs'

/**
 * POST /api/tasks/:id/assign
 *
 * Hands a task to someone. When the hand-off crosses to another person it also
 * raises the decision that asks them to accept it, so the work never sits in a
 * state where one side thinks it is assigned and the other has not agreed.
 *
 * Body: { assigned_to, note?, respond_by? }
 *
 * The rule for when an assignment becomes a decision lives in
 * lib/decisions/from-assignment.ts, not here — this route is transport,
 * permission and notification only.
 */

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    assigned_to?: string | null
    note?: string
    respond_by?: string | null
  }

  const { data: task } = await (supa as any)
    .from('tasks')
    .select('id, project_id, title, assigned_to')
    .eq('id', ctx.params.id)
    .maybeSingle()

  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Only people who belong to the project may hand its work around. RLS keeps
  // the read honest; this keeps the write honest.
  const { data: project } = await (supa as any)
    .from('projects')
    .select('id, user_id, client_id, workspace_id, title')
    .eq('id', task.project_id)
    .maybeSingle()

  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const isOwner = project.user_id === user.id
  const isClient = project.client_id === user.id
  let allowed = isOwner || isClient
  if (!allowed) {
    const { data: member } = await (supa as any)
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .maybeSingle()
    allowed = !!member
  }
  if (!allowed) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  if (!body.assigned_to) {
    // Unassigning is a plain write — nobody needs to agree to being released.
    await (supa as any).from('tasks').update({ assigned_to: null }).eq('id', task.id)
    return NextResponse.json({ assigned_to: null, decision: null })
  }

  const outcome = await assignWithDecision(supa as any, {
    taskId: task.id,
    projectId: task.project_id,
    assignedTo: body.assigned_to,
    assignedBy: user.id,
    note: body.note ?? null,
    respondBy: body.respond_by ?? null,
  })

  if (outcome.status === 'skipped') {
    return NextResponse.json({
      assigned_to: body.assigned_to,
      decision: null,
      // Named so the caller can explain itself instead of silently doing nothing.
      skipped: outcome.reason,
      skipped_reason: SKIP_REASON_TEXT[outcome.reason],
    })
  }

  // The assignee gets told, in their own words, that something waits on them.
  await notifyDevDecisionEvent(supa as any, {
    userId: body.assigned_to,
    projectId: task.project_id,
    kind: 'decision_requested',
    title: `Aufgabe übergeben: ${task.title || 'Aufgabe'}`,
    body: body.note?.slice(0, 200)
      || 'Jemand möchte diese Aufgabe an dich übergeben. Du entscheidest, ob du sie übernimmst.',
    link: `/decisions/${outcome.decisionId}`,
    taskId: task.id,
    payload: {
      decision_id: outcome.decisionId,
      origin: 'task_handover',
      from_user: user.id,
    },
  })

  return NextResponse.json({
    assigned_to: body.assigned_to,
    decision: { id: outcome.decisionId },
  })
}
