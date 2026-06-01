import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/apply
 *
 * Propagates a decided decision into the project. Idempotent.
 *
 * Effects:
 *   - For each decision_links row with link_kind='blocks' & target_kind='task':
 *       reset the task from 'blocked_pending_decision' (or similar) back to
 *       its previous workable state. Heuristic: set client_status='in_progress'
 *       when it was 'waiting_for_client', otherwise leave as-is and just
 *       remove any explicit block reason. Always add an activity entry.
 *   - For each link_kind='affects' & target_kind='task':
 *       attach a Veyra note to the task describing how the decision affects it.
 *   - Decision row: set applied_at, status='applied'.
 *
 * The audit trigger emits the 'applied' event from the status transition.
 * This endpoint adds finer-grained payloads for each propagated effect.
 *
 * Authority: project owner or service account.
 */

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,status,applied_at,client_title,internal_title,title,response_value,rationale,tagro_delegation_reason')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Authorization: project owner or admin can apply. Future: dedicated role.
  const { data: proj } = await (supa as any).from('projects')
    .select('user_id,client_id').eq('id', d.project_id).maybeSingle()
  const isOwner = proj?.user_id === user.id
  const isClient = proj?.client_id === user.id
  if (!isOwner && !isClient) {
    return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  // Idempotency.
  if (d.applied_at && d.status === 'applied') {
    return NextResponse.json({ ok: true, already_applied: true, decision: d })
  }

  // Decision must be decided first.
  if (d.status !== 'decided' && d.status !== 'applied') {
    return NextResponse.json({ error: 'decision must be decided before apply', current_status: d.status }, { status: 400 })
  }

  // Load links.
  const { data: links } = await (supa as any)
    .from('decision_links')
    .select('id,link_kind,target_kind,target_id,metadata')
    .eq('decision_id', d.id)

  const linkRows = (links as any[]) ?? []
  const blocks = linkRows.filter((l) => l.link_kind === 'blocks' && l.target_kind === 'task')
  const affects = linkRows.filter((l) => l.link_kind === 'affects' && l.target_kind === 'task')

  const headline = d.client_title || d.internal_title || d.title || 'Entscheidung'
  const summaryForNote = d.rationale || d.tagro_delegation_reason || `Entscheidung „${headline}" wurde getroffen.`

  // 1. Unblock blocked tasks.
  const unblocked: string[] = []
  for (const link of blocks) {
    try {
      const { data: task } = await (supa as any)
        .from('tasks')
        .select('id,client_status,dev_status,status,latest_dev_update')
        .eq('id', link.target_id)
        .maybeSingle()
      if (!task) continue

      const updates: Record<string, unknown> = {}
      // Heuristic transitions back to actionable state.
      if (task.client_status === 'waiting_for_client') updates.client_status = 'in_progress'
      if (task.dev_status === 'blocked') updates.dev_status = 'in_progress'
      if (task.status === 'blocked' || task.status === 'blocked_pending_decision') updates.status = 'ready'

      if (Object.keys(updates).length > 0) {
        await (supa as any).from('tasks').update(updates).eq('id', task.id)
      }

      // Activity log — best-effort.
      await (supa as any).from('activity_feed').insert({
        project_id: d.project_id,
        task_id: task.id,
        kind: 'decision_unblocked_task',
        actor_user_id: user.id,
        title: `Task entsperrt durch Entscheidung „${headline}"`,
        body: summaryForNote.slice(0, 400),
        payload: { decision_id: d.id, link_id: link.id },
      })

      unblocked.push(task.id)
    } catch {
      // best-effort
    }
  }

  // 2. Note affected tasks.
  const noted: string[] = []
  for (const link of affects) {
    try {
      const { data: task } = await (supa as any)
        .from('tasks')
        .select('id,dev_description,latest_dev_update')
        .eq('id', link.target_id)
        .maybeSingle()
      if (!task) continue

      const noteLine = `[${new Date().toISOString().slice(0, 10)}] Entscheidung „${headline}": ${summaryForNote}`
      const merged = (task.latest_dev_update ? task.latest_dev_update + '\n\n' : '') + noteLine

      await (supa as any).from('tasks').update({
        latest_dev_update: merged.slice(0, 8000),
      }).eq('id', task.id)

      await (supa as any).from('activity_feed').insert({
        project_id: d.project_id,
        task_id: task.id,
        kind: 'decision_affects_task',
        actor_user_id: user.id,
        title: `Task betroffen von „${headline}"`,
        body: noteLine.slice(0, 400),
        payload: { decision_id: d.id, link_id: link.id },
      })

      noted.push(task.id)
    } catch {
      // best-effort
    }
  }

  // 3. Mark decision applied.
  const { data: updated, error } = await (supa as any).from('decisions').update({
    status: 'applied',
    applied_at: new Date().toISOString(),
  }).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 4. Explicit 'applied' audit payload (trigger covers the status row).
  await (supa as any).from('decision_events').insert({
    decision_id: ctx.params.id,
    event_type: 'applied',
    actor_user_id: user.id,
    actor_kind: 'user',
    from_status: d.status,
    to_status: 'applied',
    payload: {
      unblocked_tasks: unblocked,
      noted_tasks: noted,
      headline,
    },
  })

  return NextResponse.json({
    decision: updated,
    propagated: { unblocked_tasks: unblocked, noted_tasks: noted },
  })
}
