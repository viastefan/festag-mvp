// ─────────────────────────────────────────────────────────────────────────────
// Review rounds — the loop, with every exit named
//
// The situation this exists for: a client sends a PDF of change requests, the
// work gets done, and then it goes back for a look. That last step has three
// real outcomes, not one, and the loop only works if all three are first-class:
//
//   accepted           the work is done and the task closes
//   changes_requested  round N+1 opens, carrying only what is still wrong
//   question           the reviewer needs something before they can judge
//
// Everything here is deliberately explicit about what happens to the task, the
// findings and the other person, because the old behaviour — flip a task to
// done and hope — is what made the loop invisible.
// ─────────────────────────────────────────────────────────────────────────────

export type RoundStatus = 'open' | 'accepted' | 'changes_requested' | 'question' | 'withdrawn'
export type FindingStatus = 'open' | 'fixed' | 'wont_fix' | 'deferred'
export type FindingSource = 'document' | 'reviewer' | 'tagro' | 'submitter'

export type FindingInput = {
  title: string
  detail?: string | null
  source?: FindingSource
  assetId?: string | null
  locationHint?: string | null
}

export type SubmitInput = {
  projectId: string
  taskId: string
  submittedBy: string
  reviewerId: string
  summary?: string | null
  sourceAssetId?: string | null
  dueAt?: string | null
  /** Points the submitter already knows about — usually from the source PDF. */
  findings?: FindingInput[]
}

export type SubmitOutcome =
  | { status: 'submitted'; roundId: string; roundNumber: number }
  | { status: 'blocked'; reason: 'already_open'; roundId: string }
  | { status: 'blocked'; reason: 'no_reviewer' | 'task_not_found' }

export type Verdict =
  | { kind: 'accepted'; note?: string | null }
  | { kind: 'changes_requested'; note?: string | null; findings: FindingInput[] }
  | { kind: 'question'; note: string }

export type VerdictOutcome =
  | { status: 'accepted' }
  | { status: 'changes_requested'; nextRoundId: string; nextRoundNumber: number; carried: number }
  | { status: 'question' }
  | { status: 'rejected'; reason: 'not_open' | 'not_reviewer' | 'round_not_found' | 'question_needs_text' }

/** Human wording, so the UI never has to invent an explanation for a refusal. */
export const BLOCK_TEXT: Record<string, string> = {
  already_open: 'Für diese Aufgabe läuft bereits eine Abnahme. Erst abschließen, dann neu einreichen.',
  no_reviewer: 'Es ist niemand benannt, der abnehmen soll.',
  task_not_found: 'Die Aufgabe existiert nicht mehr.',
  not_open: 'Diese Runde ist bereits abgeschlossen.',
  not_reviewer: 'Nur die abnehmende Person kann diese Runde entscheiden.',
  round_not_found: 'Diese Abnahme existiert nicht mehr.',
  question_needs_text: 'Eine Rückfrage braucht eine Frage.',
}

/** Hand work over for review. Opens round N+1 for this task. */
export async function submitForReview(
  supa: any,
  input: SubmitInput,
): Promise<SubmitOutcome> {
  if (!input.reviewerId) return { status: 'blocked', reason: 'no_reviewer' }

  const { data: task } = await supa
    .from('tasks').select('id, title, project_id').eq('id', input.taskId).maybeSingle()
  if (!task) return { status: 'blocked', reason: 'task_not_found' }

  // A second submission while one is pending would give the reviewer two
  // versions of the truth. The DB enforces this too; here we can explain it.
  const { data: openRound } = await supa
    .from('review_rounds').select('id')
    .eq('task_id', input.taskId).eq('status', 'open').maybeSingle()
  if (openRound) {
    return { status: 'blocked', reason: 'already_open', roundId: openRound.id }
  }

  const { data: last } = await supa
    .from('review_rounds').select('round_number')
    .eq('task_id', input.taskId).order('round_number', { ascending: false }).limit(1)
  const roundNumber = ((last?.[0]?.round_number as number) ?? 0) + 1

  const { data: round, error } = await supa.from('review_rounds').insert({
    project_id: input.projectId,
    task_id: input.taskId,
    round_number: roundNumber,
    submitted_by: input.submittedBy,
    reviewer_id: input.reviewerId,
    status: 'open',
    summary: input.summary?.slice(0, 2000) || null,
    source_asset_id: input.sourceAssetId || null,
    due_at: input.dueAt || null,
  }).select('id').single()

  if (error || !round) return { status: 'blocked', reason: 'task_not_found' }

  await insertFindings(supa, round.id, input.findings ?? [], 'submitter')

  // The task is visibly waiting on someone else now, not silently "done".
  await supa.from('tasks').update({
    dev_status: 'review',
    client_status: 'waiting_for_client',
    client_visible_status: 'Wartet auf deine Abnahme',
  }).eq('id', input.taskId).then(() => null, () => null)

  return { status: 'submitted', roundId: round.id, roundNumber }
}

/**
 * The reviewer's verdict. This is where the loop either closes or turns.
 * Nothing here is a dead end — every branch leaves the system in a state
 * someone can act on.
 */
export async function recordVerdict(
  supa: any,
  roundId: string,
  actorId: string,
  verdict: Verdict,
): Promise<VerdictOutcome> {
  const { data: round } = await supa
    .from('review_rounds')
    .select('id, project_id, task_id, round_number, status, submitted_by, reviewer_id, source_asset_id')
    .eq('id', roundId).maybeSingle()

  if (!round) return { status: 'rejected', reason: 'round_not_found' }
  if (round.status !== 'open') return { status: 'rejected', reason: 'not_open' }
  if (round.reviewer_id && round.reviewer_id !== actorId) {
    return { status: 'rejected', reason: 'not_reviewer' }
  }

  const now = new Date().toISOString()

  if (verdict.kind === 'accepted') {
    await supa.from('review_rounds').update({
      status: 'accepted',
      verdict_note: verdict.note?.slice(0, 2000) || null,
      resolved_at: now,
    }).eq('id', roundId)

    // Anything still open in this round was implicitly accepted with it —
    // recorded as such rather than left dangling.
    await supa.from('review_findings').update({
      status: 'fixed', resolved_by: actorId, resolved_at: now,
      resolution_note: 'Mit der Abnahme akzeptiert.',
    }).eq('round_id', roundId).eq('status', 'open')

    if (round.task_id) {
      await supa.from('tasks').update({
        status: 'done',
        dev_status: 'done',
        client_status: 'accepted',
        client_visible_status: 'Abgenommen',
      }).eq('id', round.task_id)
    }
    return { status: 'accepted' }
  }

  if (verdict.kind === 'question') {
    const text = verdict.note?.trim()
    if (!text) return { status: 'rejected', reason: 'question_needs_text' }

    // A question does not open a new round — the work has not been judged yet.
    // The round stays open so the reviewer can still decide afterwards.
    await supa.from('review_rounds').update({
      status: 'question',
      verdict_note: text.slice(0, 2000),
    }).eq('id', roundId)
    return { status: 'question' }
  }

  // changes_requested — round N closes, round N+1 opens carrying the findings.
  await supa.from('review_rounds').update({
    status: 'changes_requested',
    verdict_note: verdict.note?.slice(0, 2000) || null,
    resolved_at: now,
  }).eq('id', roundId)

  const nextNumber = (round.round_number ?? 1) + 1
  const { data: next } = await supa.from('review_rounds').insert({
    project_id: round.project_id,
    task_id: round.task_id,
    round_number: nextNumber,
    parent_round_id: round.id,
    // The roles swap back: whoever built it is on the hook again.
    submitted_by: round.submitted_by,
    reviewer_id: round.reviewer_id,
    status: 'open',
    summary: verdict.note?.slice(0, 2000) || 'Änderungen angefordert.',
    source_asset_id: round.source_asset_id,
  }).select('id').single()

  let carried = 0
  if (next) {
    carried = await insertFindings(supa, next.id, verdict.findings ?? [], 'reviewer')

    // Findings from the previous round that were never resolved travel with it,
    // so round two is not a fresh start that loses round one's complaints.
    const { data: leftovers } = await supa
      .from('review_findings')
      .select('title, detail, source, asset_id, location_hint')
      .eq('round_id', round.id).eq('status', 'open')
    if (leftovers?.length) {
      carried += await insertFindings(
        supa, next.id,
        leftovers.map((f: any) => ({
          title: f.title, detail: f.detail, source: f.source,
          assetId: f.asset_id, locationHint: f.location_hint,
        })),
        'reviewer',
        carried,
      )
      await supa.from('review_findings')
        .update({ status: 'deferred', resolution_note: `In Runde ${nextNumber} übernommen.` })
        .eq('round_id', round.id).eq('status', 'open')
    }
  }

  if (round.task_id) {
    await supa.from('tasks').update({
      status: 'doing',
      dev_status: 'in_progress',
      client_status: 'changes_requested',
      client_visible_status: `Änderungen angefordert (Runde ${nextNumber})`,
    }).eq('id', round.task_id)
  }

  return next
    ? { status: 'changes_requested', nextRoundId: next.id, nextRoundNumber: nextNumber, carried }
    : { status: 'rejected', reason: 'round_not_found' }
}

/** Pull a submission back before anyone has judged it. */
export async function withdrawRound(
  supa: any, roundId: string, actorId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: round } = await supa
    .from('review_rounds').select('id, status, submitted_by, task_id').eq('id', roundId).maybeSingle()
  if (!round) return { ok: false, reason: 'round_not_found' }
  if (round.status !== 'open') return { ok: false, reason: 'not_open' }
  if (round.submitted_by !== actorId) return { ok: false, reason: 'not_reviewer' }

  await supa.from('review_rounds')
    .update({ status: 'withdrawn', resolved_at: new Date().toISOString() })
    .eq('id', roundId)
  if (round.task_id) {
    await supa.from('tasks').update({
      dev_status: 'in_progress', client_status: 'in_progress',
      client_visible_status: 'In Umsetzung',
    }).eq('id', round.task_id)
  }
  return { ok: true }
}

async function insertFindings(
  supa: any,
  roundId: string,
  findings: FindingInput[],
  fallbackSource: FindingSource,
  startOrdinal = 0,
): Promise<number> {
  const rows = findings
    .filter(f => f.title?.trim())
    .slice(0, 60)
    .map((f, i) => ({
      round_id: roundId,
      ordinal: startOrdinal + i,
      title: f.title.trim().slice(0, 300),
      detail: f.detail?.slice(0, 4000) || null,
      source: f.source || fallbackSource,
      asset_id: f.assetId || null,
      location_hint: f.locationHint?.slice(0, 200) || null,
    }))
  if (rows.length === 0) return 0
  await supa.from('review_findings').insert(rows).then(() => null, () => null)
  return rows.length
}
