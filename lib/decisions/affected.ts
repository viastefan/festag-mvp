// ─────────────────────────────────────────────────────────────────────────────
// Affected work — resolves decision_links into the actual work a decision holds up.
//
// The links have existed since the v1 engine (lib/decisions/create.ts writes
// blocks[] / affects[]), and the apply step reads them to unblock tasks, but no
// read surface ever resolved them to titles. Master instruction §14 requires the
// decision center to show "affected features/tasks", so both /decisions and
// /decisions/[id] need this.
//
// Batched on purpose: one query for the links, one for the tasks, regardless of
// how many decisions are on screen. RLS applies — a task the caller may not read
// is simply omitted rather than leaking a title.
// ─────────────────────────────────────────────────────────────────────────────

export type AffectedLinkKind = 'blocks' | 'affects'

export type AffectedTask = {
  id: string
  title: string
  status: string | null
  dev_status: string | null
  priority: string | null
  link_kind: AffectedLinkKind
}

export type AffectedWork = {
  /** Work that genuinely cannot start until this is answered. */
  blocks: AffectedTask[]
  /** Work the answer changes but does not gate. */
  affects: AffectedTask[]
}

export const EMPTY_AFFECTED: AffectedWork = { blocks: [], affects: [] }

/** Tasks are the only link target we can render today; the rest stay counted. */
const TASK_KIND = 'task'
const READ_KINDS: ReadonlySet<string> = new Set<AffectedLinkKind>(['blocks', 'affects'])

// Cap per decision so one over-linked decision can't flood the list payload.
const MAX_PER_KIND = 6

/**
 * Resolve blocks/affects links for a set of decisions.
 * Returns a map keyed by decision id; decisions with no readable links are absent.
 */
export async function loadAffectedWork(
  supa: any,
  decisionIds: string[],
): Promise<Record<string, AffectedWork>> {
  const ids = Array.from(new Set(decisionIds.filter(Boolean)))
  if (ids.length === 0) return {}

  const { data: linkRows } = await supa
    .from('decision_links')
    .select('decision_id,target_id,target_kind,link_kind')
    .in('decision_id', ids)
    .eq('target_kind', TASK_KIND)

  const links = ((linkRows as any[]) ?? []).filter(l => READ_KINDS.has(l.link_kind))
  if (links.length === 0) return {}

  const taskIds = Array.from(new Set(links.map(l => l.target_id).filter(Boolean)))
  if (taskIds.length === 0) return {}

  const { data: taskRows } = await supa
    .from('tasks')
    .select('id,title,status,dev_status,priority')
    .in('id', taskIds)

  const tasks = new Map<string, any>()
  for (const t of ((taskRows as any[]) ?? [])) tasks.set(t.id, t)

  const out: Record<string, AffectedWork> = {}
  for (const link of links) {
    const task = tasks.get(link.target_id)
    if (!task) continue // not readable under RLS, or deleted
    const bucket = (out[link.decision_id] ??= { blocks: [], affects: [] })
    const target = link.link_kind === 'blocks' ? bucket.blocks : bucket.affects
    if (target.length >= MAX_PER_KIND) continue
    if (target.some(t => t.id === task.id)) continue
    target.push({
      id: task.id,
      title: task.title || 'Aufgabe',
      status: task.status ?? null,
      dev_status: task.dev_status ?? null,
      priority: task.priority ?? null,
      link_kind: link.link_kind,
    })
  }

  return out
}

/** Single-decision convenience for the detail route. */
export async function loadAffectedWorkFor(
  supa: any,
  decisionId: string,
): Promise<AffectedWork> {
  const map = await loadAffectedWork(supa, [decisionId])
  return map[decisionId] ?? EMPTY_AFFECTED
}

// ── Client-safe presentation helpers ────────────────────────────────────────

/** "Blockiert 2 Aufgaben" / "Betrifft 1 Aufgabe" — null when nothing is linked. */
export function affectedSummaryLine(work: AffectedWork | undefined | null): string | null {
  if (!work) return null
  const b = work.blocks.length
  const a = work.affects.length
  if (b === 0 && a === 0) return null
  const parts: string[] = []
  if (b > 0) parts.push(`Blockiert ${b} ${b === 1 ? 'Aufgabe' : 'Aufgaben'}`)
  if (a > 0) parts.push(`betrifft ${a} weitere`)
  return parts.join(' · ')
}

export function affectedTotal(work: AffectedWork | undefined | null): number {
  if (!work) return 0
  return work.blocks.length + work.affects.length
}
