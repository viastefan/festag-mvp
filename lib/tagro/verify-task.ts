import type { SupabaseClient } from '@supabase/supabase-js'
import { workTypeOf, type ProofType, type WorkTypeDef } from '@/lib/tasks/work-types'

/**
 * Tagro Verification Engine.
 *
 * Runs heuristically (no LLM call yet) against:
 *   • the task's required + optional proof types
 *   • the proofs the developer has uploaded into task_proofs
 *   • linked github_commits / github_pull_requests (auto-link by task_id)
 *   • the checklist completion ratio
 *
 * Returns a structured verdict — status + confidence + client-safe summary —
 * which the caller persists into `tagro_verifications` and propagates to
 * the task row.
 *
 * Intentionally honest: when evidence is partial or external (Marketing,
 * SEO, Branding), the engine returns `needs_review` rather than claiming
 * success.
 */

export type VerificationStatus =
  | 'verified'
  | 'needs_review'
  | 'proof_missing'
  | 'quality_issue'
  | 'blocked'
  | 'cannot_verify'

export type VerificationVerdict = {
  status: VerificationStatus
  confidence: number          // 0..1
  summary: string             // internal — full reasoning
  clientSummary: string       // client-safe — short, no jargon
  issues: string[]
  evidence: {
    requiredCovered: ProofType[]
    requiredMissing: ProofType[]
    optionalSeen: ProofType[]
    commitCount: number
    prCount: number
    checklistDone: number
    checklistTotal: number
  }
  recommendedNextAction: string
}

type Inputs = {
  task: {
    id: string
    title: string
    description?: string | null
    definition_of_done?: string | null
    expected_outcome?: string | null
    work_type?: string | null
    required_proof_types?: string[] | null
    project_id?: string | null
    branch_name?: string | null
    finished_by_dev_at?: string | null
  }
  proofs: Array<{ proof_type: string; url?: string | null; description?: string | null; metadata?: any }>
  commits: Array<{ commit_sha: string; message?: string | null; committed_at?: string | null }>
  pulls:   Array<{ pr_number: number; title?: string | null; merged?: boolean | null; state?: string | null }>
  checklist: Array<{ done: boolean }>
}

export function verifyTaskHeuristic(input: Inputs): VerificationVerdict {
  const workType: WorkTypeDef = workTypeOf(input.task.work_type)
  const requiredFromWorkType = workType.requiredProofs
  const explicitRequired = (input.task.required_proof_types ?? []) as ProofType[]
  const required: ProofType[] = explicitRequired.length > 0 ? explicitRequired : requiredFromWorkType
  const optional: ProofType[] = workType.optionalProofs

  const proofTypes = input.proofs.map(p => p.proof_type as ProofType)
  const hasProofs = proofTypes.length > 0

  // Implicit proofs from linked GitHub activity
  const inferred: ProofType[] = []
  if (input.commits.length > 0) inferred.push('commit')
  if (input.pulls.length > 0)   inferred.push('pull_request')

  const allProofs = new Set<ProofType>([...proofTypes, ...inferred])

  const requiredCovered: ProofType[] = []
  const requiredMissing: ProofType[] = []
  for (const r of required) {
    if (allProofs.has(r)) requiredCovered.push(r)
    else requiredMissing.push(r)
  }
  const optionalSeen = optional.filter(o => allProofs.has(o))

  const checklistTotal = input.checklist.length
  const checklistDone  = input.checklist.filter(c => c.done).length
  const checklistRatio = checklistTotal === 0 ? 1 : checklistDone / checklistTotal

  const issues: string[] = []

  if (!hasProofs && inferred.length === 0) {
    issues.push('Kein Nachweis hinzugefügt.')
  }
  if (requiredMissing.length > 0) {
    issues.push(`Fehlende Pflicht-Nachweise: ${requiredMissing.join(', ')}.`)
  }
  if (checklistTotal > 0 && checklistDone < checklistTotal) {
    issues.push(`${checklistTotal - checklistDone} Akzeptanzkriterien noch offen.`)
  }

  // Cross-checks for code work
  if (workType.hints.expectsCodeChange && input.commits.length === 0) {
    issues.push('Software-Task ohne sichtbaren Commit — Tagro kann nicht verifizieren.')
  }

  // Commits after finish marker get extra trust
  let commitTrustBoost = 0
  if (input.task.finished_by_dev_at) {
    const finishedTs = new Date(input.task.finished_by_dev_at).getTime()
    const sinceFinish = input.commits.filter(c => {
      const t = c.committed_at ? new Date(c.committed_at).getTime() : 0
      return t >= finishedTs - 5 * 60 * 1000 // 5min slack
    }).length
    if (sinceFinish > 0) commitTrustBoost = 0.1
  }

  // Decide status
  let status: VerificationStatus = 'cannot_verify'
  let confidence = 0
  let recommendedNextAction = ''

  if (requiredMissing.length === required.length && !hasProofs && inferred.length === 0) {
    status = 'proof_missing'
    confidence = 0
    recommendedNextAction = `Tagro benötigt mindestens einen der Nachweise: ${required.join(', ')}.`
  } else if (requiredMissing.length > 0) {
    // Partial coverage
    status = 'needs_review'
    confidence = Math.max(0.25, 0.5 - 0.1 * requiredMissing.length) + commitTrustBoost
    recommendedNextAction = `Ergänze ${requiredMissing.join(', ')} oder lasse den Project Owner prüfen.`
  } else if (workType.hints.expectsCodeChange && input.commits.length === 0) {
    status = 'needs_review'
    confidence = 0.45
    recommendedNextAction = 'Verknüpfe den passenden Commit oder lasse manuell reviewen.'
  } else if (checklistRatio < 0.6 && checklistTotal > 0) {
    status = 'needs_review'
    confidence = 0.5 + checklistRatio * 0.3
    recommendedNextAction = 'Schließe offene Akzeptanzkriterien ab.'
  } else {
    // All required covered. Confidence depends on optional coverage,
    // checklist completeness and how rich the evidence is.
    const opt = optional.length > 0 ? optionalSeen.length / Math.max(1, optional.length) : 1
    const evidenceRichness = Math.min(1, (allProofs.size + input.commits.length * 0.5) / 4)
    confidence = Math.min(
      0.98,
      0.6
        + 0.15 * checklistRatio
        + 0.15 * opt
        + 0.15 * evidenceRichness
        + commitTrustBoost,
    )
    if (confidence >= 0.78) {
      status = 'verified'
      recommendedNextAction = 'Bereit für Owner-Approval — danach an den Client gespiegelt.'
    } else {
      status = 'needs_review'
      recommendedNextAction = 'Tagro fand teilweise Hinweise — Owner sollte prüfen, bevor es zum Client geht.'
    }
  }

  // Quality issue overrides: e.g. commit message doesn't mention task at all
  if (status === 'verified' && workType.hints.expectsCodeChange) {
    const titleWords = (input.task.title || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4)
    const anyMatch = input.commits.some(c => {
      const m = (c.message || '').toLowerCase()
      return titleWords.some(w => m.includes(w))
    })
    if (!anyMatch && input.commits.length > 0) {
      // soft downgrade
      status = 'needs_review'
      confidence = Math.min(confidence, 0.7)
      issues.push('Commit-Messages erwähnen das Task-Thema nicht — Owner-Review empfohlen.')
      recommendedNextAction = 'Commit-Message anpassen oder Owner-Review einholen.'
    }
  }

  const summary = buildInternalSummary({ status, confidence, requiredCovered, requiredMissing, optionalSeen, commits: input.commits.length, prs: input.pulls.length, checklistDone, checklistTotal })
  const clientSummary = buildClientSummary({ status, taskTitle: input.task.title })

  return {
    status,
    confidence: Math.round(confidence * 100) / 100,
    summary,
    clientSummary,
    issues,
    evidence: {
      requiredCovered,
      requiredMissing,
      optionalSeen,
      commitCount: input.commits.length,
      prCount: input.pulls.length,
      checklistDone,
      checklistTotal,
    },
    recommendedNextAction,
  }
}

function buildInternalSummary(p: { status: VerificationStatus; confidence: number; requiredCovered: ProofType[]; requiredMissing: ProofType[]; optionalSeen: ProofType[]; commits: number; prs: number; checklistDone: number; checklistTotal: number }) {
  const parts: string[] = []
  parts.push(`Status: ${p.status} (Confidence ${(p.confidence * 100).toFixed(0)}%).`)
  if (p.requiredCovered.length) parts.push(`Pflicht abgedeckt: ${p.requiredCovered.join(', ')}.`)
  if (p.requiredMissing.length) parts.push(`Pflicht offen: ${p.requiredMissing.join(', ')}.`)
  if (p.optionalSeen.length)    parts.push(`Optionale Nachweise: ${p.optionalSeen.join(', ')}.`)
  if (p.commits || p.prs)       parts.push(`GitHub: ${p.commits} commits, ${p.prs} PRs verknüpft.`)
  if (p.checklistTotal > 0)     parts.push(`Checklist ${p.checklistDone}/${p.checklistTotal}.`)
  return parts.join(' ')
}

function buildClientSummary(p: { status: VerificationStatus; taskTitle: string }) {
  const tail = p.taskTitle ? ` für „${p.taskTitle}".` : '.'
  switch (p.status) {
    case 'verified':       return `Tagro hat die Arbeit verifiziert${tail}`
    case 'needs_review':   return `Tagro hat Hinweise gefunden, ein Project Owner prüft${tail}`
    case 'proof_missing':  return `Tagro wartet noch auf Nachweise${tail}`
    case 'quality_issue':  return `Tagro hat eine Qualitätsfrage${tail}`
    case 'blocked':        return `Aufgabe ist blockiert${tail}`
    case 'cannot_verify':  return `Tagro kann diese Aufgabe nicht automatisch prüfen — manuelles Review${tail}`
  }
}

/**
 * Helper used by the API route: fetch everything we need + run the engine.
 */
export async function runTaskVerification(sb: SupabaseClient<any>, taskId: string): Promise<VerificationVerdict & { taskId: string }> {
  const { data: task } = await sb
    .from('tasks')
    .select('id,title,description,definition_of_done,expected_outcome,work_type,required_proof_types,project_id,branch_name,finished_by_dev_at')
    .eq('id', taskId).maybeSingle()
  if (!task) throw new Error('task_not_found')

  const [{ data: proofs }, { data: commits }, { data: pulls }, { data: checklist }] = await Promise.all([
    sb.from('task_proofs').select('proof_type,url,description,metadata').eq('task_id', taskId),
    sb.from('github_commits').select('commit_sha,message,committed_at').eq('task_id', taskId),
    sb.from('github_pull_requests').select('pr_number,title,merged,state').eq('task_id', taskId),
    sb.from('task_checklist_items').select('done').eq('task_id', taskId),
  ])

  const verdict = verifyTaskHeuristic({
    task: task as any,
    proofs: (proofs as any[]) ?? [],
    commits: (commits as any[]) ?? [],
    pulls:   (pulls as any[]) ?? [],
    checklist: (checklist as any[]) ?? [],
  })
  return { taskId, ...verdict }
}
