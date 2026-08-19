import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordVerdict, BLOCK_TEXT, type FindingInput } from '@/lib/review/rounds'
import { notifyDevDecisionEvent } from '@/lib/sync/decision-notify'

export const runtime = 'nodejs'

/**
 * POST /api/review/rounds/:id/verdict
 *
 * The reviewer's answer, and the only place the loop turns. Three verdicts,
 * because there are three real outcomes — accepting, sending it back, and not
 * yet being able to judge.
 *
 * Body: { verdict: 'accepted' | 'changes_requested' | 'question',
 *         note?, findings?[] }
 */

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    verdict?: 'accepted' | 'changes_requested' | 'question'
    note?: string
    findings?: FindingInput[]
  }

  const { data: round } = await (supa as any)
    .from('review_rounds')
    .select('id, project_id, task_id, round_number, submitted_by')
    .eq('id', ctx.params.id).maybeSingle()
  if (!round) {
    return NextResponse.json({ error: 'round_not_found', message: BLOCK_TEXT.round_not_found }, { status: 404 })
  }

  const verdict =
    b.verdict === 'accepted' ? { kind: 'accepted' as const, note: b.note ?? null }
    : b.verdict === 'question' ? { kind: 'question' as const, note: b.note ?? '' }
    : b.verdict === 'changes_requested'
      ? { kind: 'changes_requested' as const, note: b.note ?? null, findings: b.findings ?? [] }
      : null

  if (!verdict) {
    return NextResponse.json({ error: 'verdict required' }, { status: 400 })
  }

  const outcome = await recordVerdict(supa as any, ctx.params.id, user.id, verdict)

  if (outcome.status === 'rejected') {
    return NextResponse.json(
      { error: outcome.reason, message: BLOCK_TEXT[outcome.reason] },
      { status: outcome.reason === 'not_reviewer' ? 403 : 409 },
    )
  }

  const { data: task } = await (supa as any)
    .from('tasks').select('title').eq('id', round.task_id).maybeSingle()
  const taskTitle = task?.title || 'Aufgabe'

  // Whoever handed the work over hears the verdict — in the words that match it.
  if (round.submitted_by && round.submitted_by !== user.id) {
    const message =
      outcome.status === 'accepted'
        ? { title: `Abgenommen: ${taskTitle}`, body: b.note || 'Die Arbeit wurde angenommen.' }
      : outcome.status === 'changes_requested'
        ? {
            title: `Änderungen angefordert: ${taskTitle}`,
            body: `Runde ${outcome.nextRoundNumber} — ${outcome.carried} ${outcome.carried === 1 ? 'Punkt' : 'Punkte'} zu bearbeiten.`,
          }
      : { title: `Rückfrage zu: ${taskTitle}`, body: b.note || 'Vor der Abnahme ist etwas unklar.' }

    await notifyDevDecisionEvent(supa as any, {
      userId: round.submitted_by,
      projectId: round.project_id,
      kind: outcome.status === 'accepted' ? 'decision_answered' : 'decision_requested',
      title: message.title,
      body: message.body,
      link: `/decisions?review=${outcome.status === 'changes_requested' ? outcome.nextRoundId : round.id}`,
      taskId: round.task_id,
      payload: { round_id: round.id, verdict: outcome.status },
    })
  }

  return NextResponse.json({ result: outcome })
}
