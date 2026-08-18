// ─────────────────────────────────────────────────────────────────────────────
// Which project does this question belong to?
//
// "Tagro erkennt den Projektverlauf und sortiert es passend ein." The honest
// version of that: Tagro ranks the projects the two people actually share, by
// how alive each one is, and picks one only when the answer is unambiguous.
//
// It never invents a project and never silently picks between two equally
// plausible ones — a question filed against the wrong project is worse than a
// question that asks which project it belongs to.
// ─────────────────────────────────────────────────────────────────────────────

import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'

export type ProjectCandidate = {
  id: string
  title: string
  /** Why this project ranked where it did — shown when we have to ask. */
  reason: string
  score: number
}

export type RoutingOutcome =
  | { status: 'routed'; projectId: string; candidate: ProjectCandidate }
  | { status: 'ambiguous'; candidates: ProjectCandidate[] }
  | { status: 'none' }

const DAY = 86_400_000

/** Projects where both people have a stake. */
async function sharedProjects(supa: any, aId: string, bId: string): Promise<any[]> {
  const { data: rows } = await supa
    .from('projects')
    .select('id, title, status, user_id, client_id, updated_at, created_at')
    .or(`user_id.eq.${aId},client_id.eq.${aId}`)

  const mine = (rows ?? []) as any[]
  const direct = mine.filter(p => p.user_id === bId || p.client_id === bId)
  if (direct.length > 0) return direct

  // The other person may be on the project as a member rather than owner/client.
  const ids = mine.map(p => p.id)
  if (ids.length === 0) return []
  const { data: memberships } = await supa
    .from('project_members').select('project_id').eq('user_id', bId).in('project_id', ids)
  const memberOf = new Set((memberships ?? []).map((m: any) => m.project_id))
  return mine.filter(p => memberOf.has(p.id))
}

/**
 * Liveness beats recency alone: a project with work moving in it is a better
 * home for a new question than one that was merely edited yesterday.
 */
async function scoreProject(supa: any, p: any): Promise<ProjectCandidate> {
  const reasons: string[] = []
  let score = 0

  if (p.status === 'active' || p.status === 'development') {
    score += 40
    reasons.push('läuft gerade')
  } else if (p.status === 'planning' || p.status === 'intake') {
    score += 20
    reasons.push('in Planung')
  }

  const { count: openTasks } = await supa
    .from('tasks').select('id', { count: 'exact', head: true })
    .eq('project_id', p.id).neq('status', 'done')
  if ((openTasks ?? 0) > 0) {
    score += Math.min(25, (openTasks ?? 0) * 5)
    reasons.push(`${openTasks} offene Aufgaben`)
  }

  const { count: openDecisions } = await supa
    .from('decisions').select('id', { count: 'exact', head: true })
    .eq('project_id', p.id).in('status', DECISION_OPEN_STATUS_LIST)
  if ((openDecisions ?? 0) > 0) {
    score += Math.min(15, (openDecisions ?? 0) * 5)
    reasons.push(`${openDecisions} offene Entscheidungen`)
  }

  const touched = new Date(p.updated_at || p.created_at || 0).getTime()
  const ageDays = (Date.now() - touched) / DAY
  if (ageDays < 3) { score += 20; reasons.push('zuletzt bearbeitet') }
  else if (ageDays < 14) score += 10

  return {
    id: p.id,
    title: p.title || 'Projekt',
    reason: reasons.join(' · ') || 'kaum Aktivität',
    score,
  }
}

/**
 * Route a question to a project. `preferred` short-circuits everything — an
 * explicit choice is never second-guessed.
 */
export async function routeToProject(
  supa: any,
  opts: { fromUserId: string; toUserId: string; preferredProjectId?: string | null },
): Promise<RoutingOutcome> {
  if (opts.preferredProjectId) {
    const { data: p } = await supa
      .from('projects').select('id, title').eq('id', opts.preferredProjectId).maybeSingle()
    if (p) {
      return {
        status: 'routed',
        projectId: p.id,
        candidate: { id: p.id, title: p.title || 'Projekt', reason: 'ausgewählt', score: 100 },
      }
    }
  }

  const shared = await sharedProjects(supa, opts.fromUserId, opts.toUserId)
  if (shared.length === 0) return { status: 'none' }
  if (shared.length === 1) {
    const only = await scoreProject(supa, shared[0])
    return { status: 'routed', projectId: only.id, candidate: only }
  }

  const scored = (await Promise.all(shared.map(p => scoreProject(supa, p))))
    .sort((a, b) => b.score - a.score)

  // A clear leader routes itself. A near-tie asks, because guessing here files
  // the question in the wrong place and nobody notices until it is stale.
  const [first, second] = scored
  if (first.score - second.score >= 20) {
    return { status: 'routed', projectId: first.id, candidate: first }
  }
  return { status: 'ambiguous', candidates: scored.slice(0, 5) }
}
