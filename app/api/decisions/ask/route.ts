import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePerson } from '@/lib/platform/resolve-person'
import { routeToProject } from '@/lib/decisions/route-to-project'
import { assignWithDecision } from '@/lib/decisions/from-assignment'
import { notifyDevDecisionEvent } from '@/lib/sync/decision-notify'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/ask
 *
 * The entry point the product was missing: ask a specific person a specific
 * question, optionally with a document attached, and have it land in their
 * account as a decision — filed against the right project.
 *
 * This is the shape of the real situation it was built for: a PDF arrives from
 * a client, something in it is unclear, and the answer has to come from a named
 * person before work can continue.
 *
 * Body:
 *   assignee       username, email or name — resolved within reach only
 *   question       what you actually need answered
 *   context?       longer explanation
 *   project_id?    explicit project; otherwise Tagro routes it
 *   asset_ids?     existing project_assets to attach (the PDF)
 *   respond_by?    hard deadline for the answer
 *
 * Returns 409 with candidates when the person or the project is ambiguous —
 * asking is better than filing a question against the wrong project.
 */

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    assignee?: string
    question?: string
    context?: string
    project_id?: string | null
    asset_ids?: string[]
    respond_by?: string | null
  }

  const question = b.question?.trim()
  if (!b.assignee?.trim() || !question) {
    return NextResponse.json(
      { error: 'assignee and question required' },
      { status: 400 },
    )
  }

  // 1 — Who is this for?
  const person = await resolvePerson(supa as any, user.id, b.assignee)
  if (person.status === 'not_found') {
    return NextResponse.json({
      error: 'person_not_found',
      message: `„${b.assignee}" gehört zu niemandem, mit dem du ein Projekt teilst.`,
    }, { status: 404 })
  }
  if (person.status === 'ambiguous') {
    return NextResponse.json({
      error: 'person_ambiguous',
      message: 'Mehrere Personen passen — wen meinst du?',
      candidates: person.candidates,
    }, { status: 409 })
  }

  // 2 — Which project does it belong to?
  const routing = await routeToProject(supa as any, {
    fromUserId: user.id,
    toUserId: person.person.id,
    preferredProjectId: b.project_id ?? null,
  })
  if (routing.status === 'none') {
    return NextResponse.json({
      error: 'no_shared_project',
      message: `Du und ${person.person.label} teilt euch kein Projekt.`,
    }, { status: 409 })
  }
  if (routing.status === 'ambiguous') {
    return NextResponse.json({
      error: 'project_ambiguous',
      message: 'Mehrere Projekte kommen infrage — zu welchem gehört die Frage?',
      candidates: routing.candidates,
    }, { status: 409 })
  }

  // 3 — The work itself. The question becomes a task in the project, so the
  //     answer has something to unblock rather than floating on its own.
  const { data: task, error: taskError } = await (supa as any).from('tasks').insert({
    project_id: routing.projectId,
    title: question.slice(0, 200),
    description: b.context?.slice(0, 4000) || null,
    status: 'todo',
    priority: 'medium',
    created_by: user.id,
    client_visible: true,
  }).select('id, title').single()

  if (taskError || !task) {
    return NextResponse.json({ error: taskError?.message || 'task_failed' }, { status: 500 })
  }

  // 4 — Attach whatever was sent along, but only assets from this project.
  const assetIds = (b.asset_ids ?? []).filter(Boolean).slice(0, 10)
  let attached = 0
  if (assetIds.length) {
    const { data: assets } = await (supa as any)
      .from('project_assets').select('id')
      .in('id', assetIds).eq('project_id', routing.projectId)
    const valid = (assets ?? []).map((a: any) => a.id)
    if (valid.length) {
      await (supa as any).from('task_assets')
        .insert(valid.map((id: string) => ({ task_id: task.id, asset_id: id })))
        .then(() => null, () => null)
      attached = valid.length
    }
  }

  // 5 — The handover itself runs through the same rule as every other
  //     assignment, so there is one definition of "this needs their agreement".
  const outcome = await assignWithDecision(supa as any, {
    taskId: task.id,
    projectId: routing.projectId,
    assignedTo: person.person.id,
    assignedBy: user.id,
    note: b.context?.trim() || question,
    respondBy: b.respond_by ?? null,
  })

  if (outcome.status === 'skipped') {
    return NextResponse.json({
      task: { id: task.id },
      decision: null,
      skipped: outcome.reason,
      project: routing.candidate,
    })
  }

  // The decision carries the question as its own words, not the task title.
  await (supa as any).from('decisions').update({
    client_title: question.slice(0, 200),
    client_summary: b.context?.slice(0, 400)
      || `${person.person.label} wurde um eine Antwort gebeten.`,
    title: question.slice(0, 200),
    decision_type: 'clarification',
    response_type: 'free_text',
    tagro_reasoning: attached > 0
      ? `Eine Frage mit ${attached === 1 ? 'einem Dokument' : `${attached} Dokumenten`} `
        + `wurde dir gestellt. Ohne deine Antwort kann die Aufgabe nicht weiterlaufen.`
      : 'Eine Frage wurde dir gestellt. Ohne deine Antwort kann die Aufgabe nicht weiterlaufen.',
  }).eq('id', outcome.decisionId)

  await notifyDevDecisionEvent(supa as any, {
    userId: person.person.id,
    projectId: routing.projectId,
    kind: 'decision_requested',
    title: question.slice(0, 120),
    body: b.context?.slice(0, 200)
      || (attached > 0 ? 'Eine Frage mit Dokument wartet auf deine Antwort.' : 'Eine Frage wartet auf deine Antwort.'),
    link: `/decisions/${outcome.decisionId}`,
    taskId: task.id,
    payload: { decision_id: outcome.decisionId, origin: 'ask', attachments: attached },
  })

  return NextResponse.json({
    task: { id: task.id },
    decision: { id: outcome.decisionId },
    person: person.person,
    project: routing.candidate,
    attachments: attached,
  })
}
