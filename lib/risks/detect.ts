// ─────────────────────────────────────────────────────────────────────────────
// Risk detection — signals in, risk candidates out.
//
// Pure functions, no database and no model call. Everything here is
// deterministic and explainable: each candidate carries the exact
// observations that produced it, and a single observation is never enough on
// its own (§ Signal → Observation → correlated signals → Risk).
//
//   SIGNAL        one thing happened          (task blocked)
//   OBSERVATION   it kept happening           (blocked for two days)
//   RISK          several of them line up     (blocked + deadline + dependents)
//
// Tagro enriches candidates afterwards (client framing, recommendation) —
// it never decides *whether* a risk exists on its own.
// ─────────────────────────────────────────────────────────────────────────────

import { computeSeverity } from '@/lib/risks/severity'
import type {
  RiskCategory,
  RiskLevel,
  RiskLinkKind,
  RiskLinkTarget,
  RiskSignalSourceType,
  RiskSource,
} from '@/lib/risks/types'

/* ── Inputs ─────────────────────────────────────────────────────────────── */

export type DetectTask = {
  id: string
  title: string
  status?: string | null
  dev_status?: string | null
  priority?: string | null
  due_date?: string | null
  estimated_hours?: number | null
  updated_at?: string | null
  last_dev_action_at?: string | null
  branch_name?: string | null
  assigned_to?: string | null
  epic_id?: string | null
}

export type DetectWorkSignal = {
  id: string
  type: string
  content?: string | null
  related_task_id?: string | null
  created_at: string
  source?: string | null
}

export type DetectDecision = {
  id: string
  title?: string | null
  client_title?: string | null
  status: string
  urgency?: string | null
  escalation_level?: number | null
  due_at?: string | null
  due_date?: string | null
  decision_type?: string | null
}

export type DetectPullRequest = {
  id: string
  pr_number: number
  title?: string | null
  state?: string | null
  merged?: boolean | null
  created_at_github?: string | null
  updated_at_github?: string | null
  head_ref?: string | null
  pr_url?: string | null
}

export type DetectionContext = {
  projectId: string
  workspaceId?: string | null
  projectTitle?: string | null
  /** Launch / target date the project is measured against. */
  targetDate?: string | null
  tasks: DetectTask[]
  workSignals?: DetectWorkSignal[]
  decisions?: DetectDecision[]
  pullRequests?: DetectPullRequest[]
  sensitivity?: 'low' | 'medium' | 'high'
  /** Team hours available per day, used for the capacity check. */
  capacityPerDay?: number
  now?: Date
}

/* ── Outputs ────────────────────────────────────────────────────────────── */

export type CandidateSignal = {
  source_type: RiskSignalSourceType
  dedupe_key: string
  label: string
  detail?: string
  weight: number
  source_ref?: string | null
  source_external_id?: string | null
  occurred_at: string
  /**
   * True when `occurred_at` is a real event timestamp (a report, a push, a
   * PR update) rather than a derived state read at detection time. Only
   * event-like signals count occurrences — otherwise every polling run would
   * look like the thing happened again.
   */
  event_like?: boolean
}

export type CandidateLink = {
  target_kind: RiskLinkTarget
  target_id: string
  link_kind: RiskLinkKind
}

export type RiskCandidate = {
  fingerprint: string
  title: string
  description: string
  client_title: string
  client_summary: string
  category: RiskCategory
  impact: RiskLevel
  severity: RiskLevel
  probability: number
  confidence: number
  source: RiskSource
  potential_delay_days: number | null
  recommendation: string
  recommendation_reason: string
  signals: CandidateSignal[]
  links: CandidateLink[]
  /** Internal ordering score from computeSeverity. */
  score: number
}

/** Minimum summed evidence weight before a candidate becomes a risk. */
const EVIDENCE_THRESHOLD: Record<'low' | 'medium' | 'high', number> = {
  low: 1.0,
  medium: 0.6,
  high: 0.35,
}

const DAY = 24 * 60 * 60 * 1000

const BLOCKED_STATUSES = new Set(['blocked', 'blocked_pending_decision', 'waiting'])
const DONE_STATUSES = new Set(['done', 'completed', 'approved_by_owner', 'verified_by_tagro', 'archived'])

/* ── Engine ─────────────────────────────────────────────────────────────── */

export function detectRisks(ctx: DetectionContext): RiskCandidate[] {
  const now = ctx.now ?? new Date()
  const sensitivity = ctx.sensitivity ?? 'medium'
  const threshold = EVIDENCE_THRESHOLD[sensitivity]

  const daysToTarget = daysUntil(ctx.targetDate, now)
  const openTasks = ctx.tasks.filter(t => !isDone(t))
  const workSignals = ctx.workSignals ?? []

  const drafts: Draft[] = [
    ...blockedTaskDrafts(ctx, openTasks, workSignals, now, daysToTarget),
    ...overdueTaskDrafts(openTasks, now, daysToTarget),
    ...developerBlockerDrafts(ctx, workSignals, now),
    ...scopeExpansionDraft(ctx, workSignals, now, daysToTarget),
    ...capacityDraft(ctx, openTasks, now, daysToTarget),
    ...stalledDecisionDrafts(ctx.decisions ?? [], now),
  ]

  return drafts
    .filter(d => evidenceWeight(d.signals) >= threshold)
    .map(d => finalize(d, daysToTarget))
    .sort((a, b) => b.score - a.score)
}

type Draft = {
  fingerprint: string
  title: string
  description: string
  client_title: string
  client_summary: string
  category: RiskCategory
  impact: RiskLevel
  probability: number
  source: RiskSource
  potential_delay_days: number | null
  recommendation: string
  recommendation_reason: string
  signals: CandidateSignal[]
  links: CandidateLink[]
  dependentCount: number
  /** Days until the deadline this specific risk threatens. */
  daysUntilDeadline: number | null
}

function finalize(draft: Draft, daysToTarget: number | null): RiskCandidate {
  const { severity, score } = computeSeverity({
    probability: draft.probability,
    impact: draft.impact,
    daysUntilDeadline: draft.daysUntilDeadline ?? daysToTarget,
    dependentCount: draft.dependentCount,
  })

  // More corroboration → more confidence that the risk is real. Distinct from
  // probability, which is about the risk actually materialising.
  const confidence = Math.min(0.92, 0.4 + (draft.signals.length - 1) * 0.15)

  return {
    fingerprint: draft.fingerprint,
    title: draft.title,
    description: draft.description,
    client_title: draft.client_title,
    client_summary: draft.client_summary,
    category: draft.category,
    impact: draft.impact,
    severity,
    probability: round2(draft.probability),
    confidence: round2(confidence),
    source: draft.source,
    potential_delay_days: draft.potential_delay_days,
    recommendation: draft.recommendation,
    recommendation_reason: draft.recommendation_reason,
    signals: draft.signals,
    links: draft.links,
    score,
  }
}

/* ── Rule 1: blocked tasks ──────────────────────────────────────────────── */

function blockedTaskDrafts(
  ctx: DetectionContext,
  openTasks: DetectTask[],
  workSignals: DetectWorkSignal[],
  now: Date,
  daysToTarget: number | null,
): Draft[] {
  const blocked = openTasks.filter(isBlocked)
  const prs = ctx.pullRequests ?? []

  return blocked.map(task => {
    const signals: CandidateSignal[] = []
    const stuckSince = task.last_dev_action_at || task.updated_at || null
    const stuckDays = stuckSince ? Math.max(0, (now.getTime() - new Date(stuckSince).getTime()) / DAY) : 0

    signals.push({
      source_type: 'task',
      dedupe_key: `task_blocked:${task.id}`,
      label: stuckDays >= 1
        ? `„${task.title}" ist seit ${formatDays(stuckDays)} blockiert`
        : `„${task.title}" wurde als blockiert markiert`,
      weight: stuckDays >= 2 ? 0.45 : 0.35,
      source_ref: task.id,
      occurred_at: stuckSince ?? now.toISOString(),
    })

    // The developer's own words about the blocker.
    const note = workSignals.find(s =>
      s.related_task_id === task.id
      && (s.type === 'blocker_reported' || s.type === 'status_note')
      && !!s.content)
    if (note) {
      signals.push({
        source_type: 'work_signal',
        dedupe_key: `work_signal:${note.id}`,
        label: 'Das Team hat einen Blocker gemeldet',
        detail: note.content ?? undefined,
        weight: 0.3,
        source_ref: note.id,
        occurred_at: note.created_at,
        event_like: true,
      })
    }

    // An open pull request on this task's branch that isn't moving.
    const pr = prs.find(p =>
      p.state === 'open' && !!task.branch_name && p.head_ref === task.branch_name)
    if (pr) {
      const prAge = daysSince(pr.updated_at_github || pr.created_at_github, now)
      if (prAge !== null && prAge >= 2) {
        signals.push({
          source_type: 'github',
          dedupe_key: `github_pr:${pr.id}`,
          label: `Pull Request #${pr.pr_number} liegt seit ${formatDays(prAge)} unverändert offen`,
          detail: pr.title ?? undefined,
          weight: 0.25,
          source_external_id: String(pr.pr_number),
          occurred_at: pr.updated_at_github || pr.created_at_github || now.toISOString(),
          event_like: true,
        })
      }
    }

    // Deadline pressure on the task itself.
    const taskDeadlineDays = daysUntil(task.due_date, now)
    if (taskDeadlineDays !== null && taskDeadlineDays <= 5) {
      signals.push({
        source_type: 'timeline',
        dedupe_key: `task_due:${task.id}`,
        label: taskDeadlineDays < 0
          ? 'Der geplante Termin der Aufgabe ist überschritten'
          : `Geplanter Termin in ${formatDays(taskDeadlineDays)}`,
        weight: 0.2,
        source_ref: task.id,
        occurred_at: now.toISOString(),
      })
    }

    // How much else is waiting behind it.
    const dependents = openTasks.filter(t =>
      t.id !== task.id && !!task.epic_id && t.epic_id === task.epic_id).length
    if (dependents > 0) {
      signals.push({
        source_type: 'task',
        dedupe_key: `task_dependents:${task.id}`,
        label: dependents === 1
          ? 'Eine weitere Aufgabe im selben Arbeitspaket wartet'
          : `${dependents} weitere Aufgaben im selben Arbeitspaket warten`,
        weight: 0.2,
        source_ref: task.id,
        occurred_at: now.toISOString(),
      })
    }

    const impact: RiskLevel =
      task.priority === 'critical' ? 'critical'
      : task.priority === 'high' || dependents >= 2 ? 'high'
      : 'medium'

    const probability = clamp01(0.45 + Math.min(stuckDays, 5) * 0.06 + dependents * 0.03)
    const delay = estimateDelayDays(stuckDays, task.estimated_hours)

    return {
      fingerprint: `task_blocked:${task.id}`,
      title: `${task.title} ist blockiert`,
      description: note?.content
        ? `Die Aufgabe steht seit ${formatDays(stuckDays)}. Gemeldet: ${note.content}`
        : `Die Aufgabe steht seit ${formatDays(stuckDays)} und bewegt sich nicht weiter.`,
      client_title: `${task.title} verzögert sich`,
      client_summary:
        'Ein Arbeitspaket wartet aktuell auf eine Klärung. '
        + 'Wir arbeiten an der Auflösung und melden uns, sobald es weitergeht.',
      category: 'delivery',
      impact,
      probability,
      source: 'task',
      potential_delay_days: delay,
      recommendation: 'Blocker auflösen, bevor abhängige Arbeit startet.',
      recommendation_reason:
        'Solange die Aufgabe steht, verschiebt sich alles, was darauf aufbaut.',
      signals,
      links: [
        { target_kind: 'task', target_id: task.id, link_kind: 'affects' },
      ],
      dependentCount: dependents,
      daysUntilDeadline: taskDeadlineDays ?? daysToTarget,
    }
  })
}

/* ── Rule 2: overdue tasks ──────────────────────────────────────────────── */

function overdueTaskDrafts(
  openTasks: DetectTask[],
  now: Date,
  daysToTarget: number | null,
): Draft[] {
  const overdue = openTasks.filter(t => {
    if (isBlocked(t)) return false // already covered by rule 1
    const d = daysUntil(t.due_date, now)
    return d !== null && d < 0
  })

  if (!overdue.length) return []

  // Many overdue tasks at once is one delivery risk, not N risks.
  if (overdue.length >= 3) {
    const signals: CandidateSignal[] = overdue.slice(0, 6).map(t => ({
      source_type: 'task' as const,
      dedupe_key: `task_overdue:${t.id}`,
      label: `„${t.title}" ist überfällig`,
      weight: 0.2,
      source_ref: t.id,
      occurred_at: now.toISOString(),
    }))
    return [{
      fingerprint: 'delivery_overdue_cluster',
      title: `${overdue.length} Aufgaben sind überfällig`,
      description:
        `Mehrere Aufgaben liegen hinter ihrem geplanten Termin. `
        + `Betroffen: ${overdue.slice(0, 4).map(t => t.title).join(', ')}`
        + (overdue.length > 4 ? ` und ${overdue.length - 4} weitere.` : '.'),
      client_title: 'Der Zeitplan gerät unter Druck',
      client_summary:
        'Mehrere Arbeitspakete liegen hinter dem Plan. '
        + 'Wir prüfen, wie sich das auf den geplanten Termin auswirkt.',
      category: 'timeline',
      impact: overdue.length >= 5 ? 'high' : 'medium',
      probability: clamp01(0.5 + overdue.length * 0.04),
      source: 'task',
      potential_delay_days: Math.min(10, overdue.length),
      recommendation: 'Termine neu ordnen und den kritischen Pfad festlegen.',
      recommendation_reason:
        'Ohne neue Reihenfolge summieren sich die Verzögerungen bis zum Liefertermin.',
      signals,
      links: overdue.slice(0, 8).map(t => ({
        target_kind: 'task' as const, target_id: t.id, link_kind: 'affects' as const,
      })),
      dependentCount: overdue.length,
      daysUntilDeadline: daysToTarget,
    }]
  }

  return overdue.map(task => {
    const late = Math.abs(daysUntil(task.due_date, now) ?? 0)
    return {
      fingerprint: `task_overdue:${task.id}`,
      title: `${task.title} ist überfällig`,
      description: `Die Aufgabe liegt ${formatDaysPlain(late)} hinter dem geplanten Termin.`,
      client_title: `${task.title} liegt hinter dem Plan`,
      client_summary:
        'Ein Arbeitspaket braucht länger als geplant. '
        + 'Wir halten dich auf dem Laufenden, falls sich der Termin verschiebt.',
      category: 'delivery',
      impact: task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium',
      probability: clamp01(0.45 + Math.min(late, 7) * 0.05),
      source: 'task',
      potential_delay_days: Math.min(7, Math.ceil(late)),
      recommendation: 'Aufgabe neu einplanen oder Umfang reduzieren.',
      recommendation_reason: 'Der ursprüngliche Termin ist nicht mehr zu halten.',
      signals: [
        {
          source_type: 'task',
          dedupe_key: `task_overdue:${task.id}`,
          label: `Termin seit ${formatDays(late)} überschritten`,
          weight: 0.4,
          source_ref: task.id,
          occurred_at: now.toISOString(),
        },
        ...(task.priority === 'critical' || task.priority === 'high'
          ? [{
              source_type: 'task' as const,
              dedupe_key: `task_priority:${task.id}`,
              label: 'Die Aufgabe ist als hoch priorisiert eingestuft',
              weight: 0.25,
              source_ref: task.id,
              occurred_at: now.toISOString(),
            }]
          : []),
      ],
      links: [{ target_kind: 'task', target_id: task.id, link_kind: 'affects' }],
      dependentCount: 0,
      daysUntilDeadline: daysToTarget,
    }
  })
}

/* ── Rule 3: developer blocker without a blocked task ───────────────────── */

function developerBlockerDrafts(
  ctx: DetectionContext,
  workSignals: DetectWorkSignal[],
  now: Date,
): Draft[] {
  const taskById = new Map(ctx.tasks.map(t => [t.id, t]))
  const recent = workSignals.filter(s =>
    s.type === 'blocker_reported'
    && daysSince(s.created_at, now)! <= 7
    // Rule 1 already owns blockers that are reflected in the task status.
    && !(s.related_task_id && taskById.get(s.related_task_id) && isBlocked(taskById.get(s.related_task_id)!)))

  return recent.map(signal => {
    const task = signal.related_task_id ? taskById.get(signal.related_task_id) : undefined
    const age = daysSince(signal.created_at, now) ?? 0
    return {
      fingerprint: `developer_blocker:${signal.id}`,
      title: task ? `Blocker bei ${task.title}` : 'Gemeldeter Blocker',
      description: signal.content || 'Das Team hat einen Blocker gemeldet.',
      client_title: 'Eine Klärung steht aus',
      client_summary:
        'Für den nächsten Umsetzungsschritt fehlt noch eine Zuarbeit. '
        + 'Wir kümmern uns darum.',
      category: 'dependency',
      impact: age >= 2 ? 'high' : 'medium',
      probability: clamp01(0.5 + age * 0.07),
      source: 'developer',
      potential_delay_days: Math.max(1, Math.round(age)),
      recommendation: 'Abhängigkeit heute auflösen.',
      recommendation_reason: 'Je länger die Klärung offen bleibt, desto teurer wird der Stillstand.',
      signals: [
        {
          source_type: 'work_signal',
          dedupe_key: `work_signal:${signal.id}`,
          label: 'Das Team hat einen Blocker gemeldet',
          detail: signal.content ?? undefined,
          weight: 0.4,
          source_ref: signal.id,
          occurred_at: signal.created_at,
          event_like: true,
        },
        ...(age >= 1
          ? [{
              source_type: 'timeline' as const,
              dedupe_key: `blocker_age:${signal.id}`,
              label: `Seit ${formatDays(age)} unverändert offen`,
              weight: 0.25,
              occurred_at: now.toISOString(),
            }]
          : []),
      ],
      links: task ? [{ target_kind: 'task' as const, target_id: task.id, link_kind: 'affects' as const }] : [],
      dependentCount: 0,
      daysUntilDeadline: null,
    }
  })
}

/* ── Rule 4: scope expansion ────────────────────────────────────────────── */

function scopeExpansionDraft(
  ctx: DetectionContext,
  workSignals: DetectWorkSignal[],
  now: Date,
  daysToTarget: number | null,
): Draft[] {
  const changes = workSignals.filter(s =>
    s.type === 'scope_change' && (daysSince(s.created_at, now) ?? 99) <= 14)
  if (!changes.length) return []

  return [{
    fingerprint: `scope_expansion:${ctx.projectId}`,
    title: changes.length === 1 ? 'Scope-Änderung erkannt' : `${changes.length} Scope-Änderungen erkannt`,
    description:
      'In den letzten zwei Wochen kamen Anforderungen dazu, die nicht Teil der ursprünglichen Planung waren.',
    client_title: 'Der Projektumfang wächst',
    client_summary:
      'Es sind neue Anforderungen dazugekommen. Das kann den geplanten Termin beeinflussen — '
      + 'wir zeigen dir, was das konkret bedeutet.',
    category: 'scope',
    impact: changes.length >= 3 ? 'high' : 'medium',
    probability: clamp01(0.45 + changes.length * 0.08),
    source: 'client',
    potential_delay_days: changes.length * 1.5,
    recommendation: 'Zusatzumfang bewusst einplanen oder in eine zweite Phase legen.',
    recommendation_reason:
      'Zusätzlicher Umfang ohne zusätzliche Zeit geht immer vom vereinbarten Termin ab.',
    signals: [
      ...changes.slice(0, 5).map(s => ({
        source_type: 'client' as const,
        dedupe_key: `work_signal:${s.id}`,
        label: 'Neue Anforderung gemeldet',
        detail: s.content ?? undefined,
        weight: 0.3,
        source_ref: s.id,
        occurred_at: s.created_at,
        event_like: true,
      })),
      // Zusatzumfang gegen einen fixen Termin ist der eigentliche Konflikt —
      // ohne Termin bleibt eine einzelne Änderung nur eine Beobachtung.
      ...(daysToTarget !== null && daysToTarget > 0
        ? [{
            source_type: 'timeline' as const,
            dedupe_key: `scope_vs_target:${ctx.projectId}`,
            label: `Der Zieltermin in ${formatDays(daysToTarget)} ist ohne den Zusatzumfang geplant`,
            weight: 0.3,
            occurred_at: now.toISOString(),
          }]
        : []),
    ],
    links: [{ target_kind: 'project', target_id: ctx.projectId, link_kind: 'affects' }],
    dependentCount: 0,
    daysUntilDeadline: daysToTarget,
  }]
}

/* ── Rule 5: capacity vs. remaining time ────────────────────────────────── */

function capacityDraft(
  ctx: DetectionContext,
  openTasks: DetectTask[],
  now: Date,
  daysToTarget: number | null,
): Draft[] {
  if (daysToTarget === null || daysToTarget <= 0) return []

  const remainingHours = openTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
  if (remainingHours <= 0) return []

  const perDay = ctx.capacityPerDay ?? 6
  // Rough working-day conversion — five of every seven days.
  const availableHours = Math.round(daysToTarget * (5 / 7) * perDay)
  if (remainingHours <= availableHours) return []

  const shortfall = remainingHours - availableHours
  const overrunDays = Math.ceil(shortfall / perDay)

  return [{
    fingerprint: `capacity_shortfall:${ctx.projectId}`,
    title: 'Restaufwand passt nicht in die verbleibende Zeit',
    description:
      `Offen sind rund ${Math.round(remainingHours)} h, verfügbar bis zum Zieltermin sind etwa `
      + `${availableHours} h. Es fehlen ${Math.round(shortfall)} h.`,
    client_title: 'Der geplante Termin ist knapp',
    client_summary:
      'Nach aktuellem Stand reicht die verbleibende Zeit für den geplanten Umfang nicht ganz aus. '
      + 'Wir schlagen dir vor, wie sich das lösen lässt.',
    category: 'timeline',
    impact: overrunDays >= 5 ? 'high' : 'medium',
    probability: clamp01(0.5 + Math.min(shortfall / Math.max(availableHours, 1), 0.6) * 0.5),
    source: 'timeline',
    potential_delay_days: overrunDays,
    recommendation: 'Umfang priorisieren oder Termin gemeinsam neu setzen.',
    recommendation_reason:
      'Die Lücke schließt sich nicht von selbst — je früher entschieden wird, desto günstiger.',
    signals: [
      {
        source_type: 'timeline',
        dedupe_key: `capacity:${ctx.projectId}`,
        label: `Rund ${Math.round(remainingHours)} h offen, etwa ${availableHours} h verfügbar`,
        weight: 0.45,
        occurred_at: now.toISOString(),
      },
      {
        source_type: 'timeline',
        dedupe_key: `target_date:${ctx.projectId}`,
        label: `Noch ${formatDaysPlain(daysToTarget)} bis zum Zieltermin`,
        weight: 0.25,
        occurred_at: now.toISOString(),
      },
    ],
    links: [{ target_kind: 'project', target_id: ctx.projectId, link_kind: 'affects' }],
    dependentCount: openTasks.length,
    daysUntilDeadline: daysToTarget,
  }]
}

/* ── Rule 6: stalled decisions ──────────────────────────────────────────── */

const OPEN_DECISION_STATES = new Set([
  'pending_client', 'awaiting_clarification', 'open', 'waiting_for_client', 'drafted',
])

function stalledDecisionDrafts(decisions: DetectDecision[], now: Date): Draft[] {
  return decisions
    .filter(d => OPEN_DECISION_STATES.has(d.status))
    .map(d => {
      const overdueDays = (() => {
        const due = daysUntil(d.due_at || d.due_date, now)
        return due !== null && due < 0 ? Math.abs(due) : null
      })()
      const escalation = d.escalation_level ?? 0
      if (overdueDays === null && escalation < 2 && d.urgency !== 'critical') return null

      const title = (d.title || d.client_title || 'Entscheidung').trim()
      const signals: CandidateSignal[] = [{
        source_type: 'decision',
        dedupe_key: `decision_open:${d.id}`,
        label: `Entscheidung „${title}" ist offen`,
        weight: 0.35,
        source_ref: d.id,
        occurred_at: now.toISOString(),
      }]
      if (overdueDays !== null) {
        signals.push({
          source_type: 'decision',
          dedupe_key: `decision_overdue:${d.id}`,
          label: `Frist seit ${formatDays(overdueDays)} überschritten`,
          weight: 0.35,
          source_ref: d.id,
          occurred_at: now.toISOString(),
        })
      }
      if (escalation >= 2) {
        signals.push({
          source_type: 'decision',
          dedupe_key: `decision_escalated:${d.id}`,
          label: 'Die Entscheidung wurde bereits eskaliert',
          weight: 0.3,
          source_ref: d.id,
          occurred_at: now.toISOString(),
        })
      }

      return {
        fingerprint: `decision_stalled:${d.id}`,
        title: `Offene Entscheidung blockiert: ${title}`,
        description: 'Die Umsetzung wartet auf diese Entscheidung.',
        client_title: 'Eine Entscheidung wartet auf dich',
        client_summary:
          'Ohne diese Freigabe kann das Team an dieser Stelle nicht weiterarbeiten.',
        category: 'dependency',
        impact: d.urgency === 'critical' || escalation >= 3 ? 'critical' : 'high',
        probability: clamp01(0.55 + (overdueDays ?? 0) * 0.05 + escalation * 0.05),
        source: 'system',
        potential_delay_days: overdueDays !== null ? Math.max(1, Math.round(overdueDays)) : 2,
        recommendation: 'Entscheidung heute treffen oder bewusst delegieren.',
        recommendation_reason: 'Jeder weitere Tag ohne Entscheidung kostet Umsetzungszeit.',
        signals,
        links: [{ target_kind: 'decision' as const, target_id: d.id, link_kind: 'blocks' as const }],
        dependentCount: 1,
        daysUntilDeadline: overdueDays !== null ? -overdueDays : null,
      } as Draft
    })
    .filter((d): d is Draft => d !== null)
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function isBlocked(t: DetectTask): boolean {
  return BLOCKED_STATUSES.has(String(t.status || '')) || BLOCKED_STATUSES.has(String(t.dev_status || ''))
}

function isDone(t: DetectTask): boolean {
  return DONE_STATUSES.has(String(t.status || '')) || DONE_STATUSES.has(String(t.dev_status || ''))
}

function evidenceWeight(signals: CandidateSignal[]): number {
  return signals.reduce((sum, s) => sum + s.weight, 0)
}

function daysUntil(date: string | null | undefined, now: Date): number | null {
  if (!date) return null
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return null
  return (t - now.getTime()) / DAY
}

function daysSince(date: string | null | undefined, now: Date): number | null {
  const d = daysUntil(date, now)
  return d === null ? null : -d
}

function estimateDelayDays(stuckDays: number, estimatedHours: number | null | undefined): number {
  const base = Math.max(1, Math.round(stuckDays))
  const size = Number(estimatedHours) || 0
  return Math.min(10, base + (size > 16 ? 2 : size > 8 ? 1 : 0))
}

/** Dative form — reads after "seit" / "in": „seit 3 Tagen". */
function formatDays(days: number): string {
  const d = Math.max(0, Math.round(days))
  if (d <= 0) return 'unter einem Tag'
  return d === 1 ? 'einem Tag' : `${d} Tagen`
}

/** Nominative form — stands on its own: „3 Tage hinter dem Termin". */
function formatDaysPlain(days: number): string {
  const d = Math.max(0, Math.round(days))
  if (d <= 0) return 'unter einem Tag'
  return d === 1 ? '1 Tag' : `${d} Tage`
}

function clamp01(n: number): number {
  return Math.min(0.95, Math.max(0.05, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
