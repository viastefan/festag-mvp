import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitForReview, BLOCK_TEXT, type FindingInput } from '@/lib/review/rounds'
import { analyzeDocumentText } from '@/lib/review/analyze-document'
import { notifyDevDecisionEvent } from '@/lib/sync/decision-notify'

export const runtime = 'nodejs'

/**
 * POST /api/review/rounds — hand work over for review.
 * GET  /api/review/rounds?task_id= — the rounds on a task, newest first.
 *
 * Body: { task_id, reviewer, summary?, source_asset_id?, document_text?, findings?, due_at? }
 *
 * When `document_text` is present Tagro turns it into the work list, so a
 * client PDF arrives as tickable items rather than a file someone has to read.
 */

export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const taskId = params.get('task_id')
  const decisionId = params.get('decision_id')
  if (!taskId && !decisionId) {
    return NextResponse.json({ error: 'task_id or decision_id required' }, { status: 400 })
  }

  let query = (supa as any).from('review_rounds').select('*')
  query = decisionId ? query.eq('decision_id', decisionId) : query.eq('task_id', taskId)
  const { data: rounds } = await query.order('round_number', { ascending: false })

  const ids = (rounds ?? []).map((r: any) => r.id)
  const findings = ids.length
    ? (await (supa as any).from('review_findings').select('*').in('round_id', ids)
        .order('ordinal', { ascending: true })).data ?? []
    : []

  const byRound: Record<string, any[]> = {}
  for (const f of findings) (byRound[f.round_id] ??= []).push(f)

  return NextResponse.json({
    rounds: (rounds ?? []).map((r: any) => ({ ...r, findings: byRound[r.id] ?? [] })),
  })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    task_id?: string
    reviewer_id?: string
    summary?: string
    source_asset_id?: string | null
    document_text?: string
    findings?: FindingInput[]
    due_at?: string | null
  }

  if (!b.task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const { data: task } = await (supa as any)
    .from('tasks').select('id, project_id, title').eq('id', b.task_id).maybeSingle()
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: project } = await (supa as any)
    .from('projects').select('id, title, user_id, client_id').eq('id', task.project_id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Default reviewer: whoever is on the other side of this project.
  const reviewerId = b.reviewer_id
    || (project.user_id === user.id ? project.client_id : project.user_id)
    || null
  if (!reviewerId) {
    return NextResponse.json(
      { error: 'no_reviewer', message: BLOCK_TEXT.no_reviewer },
      { status: 409 },
    )
  }

  // Tagro reads the document so the reviewer and the dev see the same list.
  let findings: FindingInput[] = b.findings ?? []
  let analysisNote: string | null = null
  if (b.document_text?.trim()) {
    const analysis = await analyzeDocumentText(b.document_text, {
      assetId: b.source_asset_id ?? null,
      projectTitle: project.title,
    })
    if (analysis.status === 'extracted') {
      findings = [...findings, ...analysis.findings]
      analysisNote = analysis.summary
    } else if (analysis.status === 'nothing_actionable') {
      analysisNote = analysis.summary
    } else {
      analysisNote = analysis.reason
    }
  }

  const outcome = await submitForReview(supa as any, {
    projectId: task.project_id,
    taskId: task.id,
    submittedBy: user.id,
    reviewerId,
    summary: b.summary || analysisNote,
    sourceAssetId: b.source_asset_id ?? null,
    dueAt: b.due_at ?? null,
    findings,
  })

  if (outcome.status === 'blocked') {
    return NextResponse.json({
      error: outcome.reason,
      message: BLOCK_TEXT[outcome.reason],
      round_id: 'roundId' in outcome ? outcome.roundId : undefined,
    }, { status: 409 })
  }

  /**
   * A round is something waiting for a named person, which is exactly what the
   * decisions board is for. Without a decision the round would only exist in a
   * notification — seen once, then gone. The decision is the durable surface;
   * the round stays the source of truth for the verdict.
   */
  const openCount = findings.length
  const { data: reviewDecision } = await (supa as any).from('decisions').insert({
    project_id: task.project_id,
    source: 'review_round',
    source_task_id: task.id,
    title: `Abnahme: ${task.title || 'Aufgabe'}`,
    client_title: `Passt das so? ${task.title || 'Aufgabe'}`,
    client_summary: b.summary || analysisNote
      || (openCount > 0
        ? `${openCount} ${openCount === 1 ? 'Punkt wurde' : 'Punkte wurden'} umgesetzt und warten auf deine Abnahme.`
        : 'Die Arbeit wartet auf deine Abnahme.'),
    description: b.summary || analysisNote || null,
    status: 'pending_client',
    decision_type: 'approval',
    response_type: 'single_choice',
    authority: 'client',
    reversibility: 'two_way_door',
    auto_resolve_strategy: 'escalate_only',
    delegate_allowed: false,
    visible_to_client: true,
    urgency: 'normal',
    deadline_hard: b.due_at || null,
    created_by: user.id,
    requested_for: reviewerId,
    tagro_reasoning: openCount > 0
      ? `Runde ${outcome.roundNumber}: ${openCount} ${openCount === 1 ? 'Punkt' : 'Punkte'} zur Abnahme. `
        + 'Du kannst abnehmen, Änderungen anfordern oder nachfragen.'
      : `Runde ${outcome.roundNumber} wartet auf deine Abnahme.`,
  }).select('id').single()

  if (reviewDecision) {
    await (supa as any).from('review_rounds')
      .update({ decision_id: reviewDecision.id }).eq('id', outcome.roundId)
    await (supa as any).from('decision_links').insert({
      decision_id: reviewDecision.id,
      target_kind: 'task',
      target_id: task.id,
      link_kind: 'blocks',
      metadata: { review_round: outcome.roundId, round: outcome.roundNumber },
    }).then(() => null, () => null)
  }

  await notifyDevDecisionEvent(supa as any, {
    userId: reviewerId,
    projectId: task.project_id,
    kind: 'decision_requested',
    title: `Abnahme: ${task.title || 'Aufgabe'}`,
    body: (b.summary || analysisNote || 'Die Arbeit wartet auf deine Abnahme.').slice(0, 200),
    link: reviewDecision ? `/decisions?open=${reviewDecision.id}` : `/decisions`,
    taskId: task.id,
    payload: { round_id: outcome.roundId, round: outcome.roundNumber, origin: 'review_submit' },
  })

  return NextResponse.json({
    round: { id: outcome.roundId, number: outcome.roundNumber },
    decision: reviewDecision ? { id: reviewDecision.id } : null,
    findings: findings.length,
    analysis: analysisNote,
  })
}
