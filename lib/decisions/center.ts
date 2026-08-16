// ─────────────────────────────────────────────────────────────────────────────
// Decision Center — ranking, grouping, and the German legibility labels.
//
// The v2 orchestration engine already computes urgency_score, escalation_level,
// due_at + effective_due_source, auto_resolve_at, reversibility and `queued`
// (see 20260613_decision_engine_v2_orchestration.sql). None of it reached the
// client. This module is the single place that turns those columns into an
// order and into sentences a client can read — no black-box urgency, per
// docs/tagro-decision-orchestration.md §4.
//
// Pure and client-safe: the API route sorts with the same functions the page
// renders with, so server order and client order never disagree.
// ─────────────────────────────────────────────────────────────────────────────

import type { Decision } from '@/components/decisions/decisions-shared'
import {
  DUE_SOURCE_LABEL,
  fmtCountdown,
  fmtDueIn,
  isOpenDecisionStatus,
} from '@/components/decisions/decisions-shared'

// ── Ranking ─────────────────────────────────────────────────────────────────

const URGENCY_BASE: Record<string, number> = {
  critical: 75,
  high: 55,
  normal: 30,
  low: 12,
}

export function decisionDueTs(d: Decision): number | null {
  const raw = d.due_at || d.due_date
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? null : t
}

export function isOverdue(d: Decision, now: number = Date.now()): boolean {
  const t = decisionDueTs(d)
  return t !== null && t < now
}

/**
 * 0–100 attention score. The engine's `urgency_score` is authoritative whenever
 * it is present; the fallback exists only so legacy rows (written before the v2
 * migration, or by the plain POST path) still rank sensibly next to them.
 */
export function attentionScore(d: Decision, now: number = Date.now()): number {
  if (typeof d.urgency_score === 'number' && d.urgency_score > 0) {
    return Math.max(0, Math.min(100, d.urgency_score))
  }

  let score = URGENCY_BASE[d.urgency] ?? 30
  score += (d.escalation_level ?? 0) * 6
  if (d.reversibility === 'one_way_door') score += 8

  const due = decisionDueTs(d)
  if (due !== null) {
    const hoursLeft = (due - now) / 3_600_000
    if (hoursLeft <= 0) score += 25
    else if (hoursLeft <= 24) score += 18
    else if (hoursLeft <= 72) score += 10
    else if (hoursLeft <= 168) score += 4
  }

  return Math.max(0, Math.min(100, score))
}

/** Attention first, then the nearer deadline, then the newer decision. */
export function sortByAttention(decisions: Decision[], now: number = Date.now()): Decision[] {
  return [...decisions].sort((a, b) => {
    const byScore = attentionScore(b, now) - attentionScore(a, now)
    if (byScore !== 0) return byScore
    const aDue = decisionDueTs(a) ?? Infinity
    const bDue = decisionDueTs(b) ?? Infinity
    if (aDue !== bDue) return aDue - bDue
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/** Newest answer first — the history reads as a log. */
export function sortByDecidedAt(decisions: Decision[]): Decision[] {
  return [...decisions].sort((a, b) => {
    const at = new Date(a.decided_at || a.updated_at || a.created_at).getTime()
    const bt = new Date(b.decided_at || b.updated_at || b.created_at).getTime()
    return bt - at
  })
}

// ── Grouping ────────────────────────────────────────────────────────────────

export type DecisionCenterGroups = {
  /** The one decision that deserves attention now — never a list. */
  focus: Decision | null
  /** Open, actionable, not the focus. */
  queue: Decision[]
  /** Held back by the engine's open-decision cap — visible, never nagging. */
  background: Decision[]
  /** Answered, applied, archived — "previous decisions" (§14). */
  history: Decision[]
  /** Open decisions inside a Tagro override window the user can still reverse. */
  reversible: Decision[]
}

export type PartitionOptions = {
  /** Only decisions the viewer may actually answer can become the focus. */
  canAct?: (d: Decision) => boolean
  now?: number
}

export function partitionDecisions(
  decisions: Decision[],
  opts: PartitionOptions = {},
): DecisionCenterGroups {
  const now = opts.now ?? Date.now()
  const canAct = opts.canAct ?? (() => true)

  const open: Decision[] = []
  const background: Decision[] = []
  const answered: Decision[] = []

  for (const d of decisions) {
    if (!isOpenDecisionStatus(d.status)) {
      answered.push(d)
      continue
    }
    if (d.queued) background.push(d)
    else open.push(d)
  }

  const ranked = sortByAttention(open, now)
  const focusIndex = ranked.findIndex(canAct)
  const focus = focusIndex >= 0 ? ranked[focusIndex] : null
  const queue = focusIndex >= 0 ? ranked.filter((_, i) => i !== focusIndex) : ranked

  // A Tagro answer inside its 24h window isn't history yet — it can still be
  // taken back, so it gets its own live section and drops into the log only
  // once the window closes.
  const reversible = answered.filter(d => !!d.tagro_delegation_reason && overrideWindowOpen(d, now))
  const reversibleIds = new Set(reversible.map(d => d.id))

  return {
    focus,
    queue,
    background: sortByAttention(background, now),
    history: sortByDecidedAt(answered.filter(d => !reversibleIds.has(d.id))),
    reversible,
  }
}

// ── Legibility labels (German, client-facing) ───────────────────────────────

/** Bezos door, said plainly. Null when the engine hasn't classified it. */
export function doorLabel(d: Decision): string | null {
  if (d.reversibility === 'one_way_door') return 'Schwer rückgängig'
  if (d.reversibility === 'two_way_door') return 'Später änderbar'
  return null
}

/** "in 3 Tagen · blockiert Arbeit" — deadline plus why it is the deadline. */
export function dueLine(d: Decision): string | null {
  const label = fmtDueIn(d.due_at || d.due_date || null)
  if (!label) return null
  const source = d.effective_due_source ? DUE_SOURCE_LABEL[d.effective_due_source] : null
  return source ? `${label} · ${source}` : label
}

/** Why this decision is the one on top right now. */
export function focusKicker(d: Decision, now: number = Date.now()): string {
  const escalation = d.escalation_level ?? 0
  if (escalation >= 3) return 'Frist abgelaufen'
  if (isOverdue(d, now)) return 'Überfällig'
  if (escalation >= 2) return 'An Owner eskaliert'
  if (d.urgency === 'critical') return 'Kritisch'
  if (d.status === 'awaiting_clarification') return 'Rückfrage offen'
  if (d.urgency === 'high') return 'Als Nächstes'
  return 'Wartet auf dich'
}

/** Tagro's confidence in its own framing, as a percentage. */
export function confidencePercent(d: Decision): number | null {
  const raw = d.tagro_confidence_in_framing
  if (typeof raw !== 'number' || Number.isNaN(raw)) return null
  const pct = raw <= 1 ? raw * 100 : raw
  if (pct <= 0) return null
  return Math.round(Math.max(0, Math.min(100, pct)))
}

/**
 * What happens if nobody answers. Mirrors §6 of the orchestration spec so the
 * client can trust that a one-way door is never auto-decided.
 */
export function silenceLine(d: Decision): string | null {
  if (!isOpenDecisionStatus(d.status)) return null

  const strategy = d.auto_resolve_strategy
  if (strategy === 'hold') {
    return 'Ohne Antwort bleibt sie offen — hier entscheidet Tagro nie.'
  }
  if (strategy === 'tagro_default' && d.reversibility === 'two_way_door') {
    const when = fmtDueIn(d.auto_resolve_at || d.due_at || d.due_date || null)
    return when
      ? `Ohne Antwort übernimmt Tagro ${when} die Empfehlung — du kannst das 24 Std lang ändern.`
      : 'Ohne Antwort übernimmt Tagro die Empfehlung — du kannst das 24 Std lang ändern.'
  }
  if (strategy === 'escalate_only') {
    return 'Ohne Antwort geht sie an den Projektverantwortlichen — entschieden wird sie nicht.'
  }
  return null
}

/** True while the 24h owner/client override window on a Tagro answer is live. */
export function overrideWindowOpen(d: Decision, now: number = Date.now()): boolean {
  if (!d.override_window_until) return false
  const t = new Date(d.override_window_until).getTime()
  return !Number.isNaN(t) && t > now
}

/** "Tagro hat entschieden — noch 6 Std 12 Min änderbar" */
export function overrideLine(d: Decision, now: number = Date.now()): string | null {
  if (!d.override_window_until || !overrideWindowOpen(d, now)) return null
  return `${tagroAnswerLine(d) ?? 'Entschieden'} — ${fmtCountdown(d.override_window_until, now)} änderbar`
}

/** How a Tagro-authored answer came about. Null when a human decided. */
export function tagroAnswerLine(d: Decision): string | null {
  switch (d.tagro_delegation_reason) {
    case 'auto_resolved_after_deadline':
      return 'Tagro hat nach Fristablauf entschieden'
    case 'client_delegated':
      return 'An Tagro delegiert'
    default:
      return d.tagro_delegation_reason ? 'Tagro hat entschieden' : null
  }
}

/**
 * What was actually answered, in words. Deliberately never renders a raw
 * option id — for choice types the label lives in decision_options, which the
 * list payload doesn't carry, so the status reads plainly instead.
 */
export function answerLine(d: Decision): string {
  const rv = d.response_value
  if (rv && 'binary_value' in rv) return rv.binary_value === 'yes' ? 'Freigegeben' : 'Abgelehnt'
  if (rv && 'free_text' in rv && rv.free_text?.trim()) {
    const text = rv.free_text.trim()
    return text.length > 90 ? `${text.slice(0, 90)}…` : text
  }
  if (d.selected_option === 'yes') return 'Freigegeben'
  if (d.selected_option === 'no') return 'Abgelehnt'
  if (d.status === 'applied') return 'Umgesetzt'
  if (d.status === 'rejected') return 'Abgelehnt'
  if (d.status === 'expired') return 'Frist abgelaufen'
  if (d.status === 'superseded') return 'Ersetzt'
  if (d.status === 'archived') return 'Archiviert'
  return 'Entschieden'
}

/** Delegation is offered only when the whole §8 gate holds. */
export function canDelegateToTagro(d: Decision): boolean {
  if (!d.delegate_allowed) return false
  if (d.reversibility !== 'two_way_door') return false
  const type = d.decision_type || ''
  if (['legal', 'contract', 'payment', 'data_protection'].includes(type)) return false
  return isOpenDecisionStatus(d.status)
}

// ── Audit trail ─────────────────────────────────────────────────────────────

/**
 * decision_events, said in German. Layer 3 of the master instruction requires
 * a decision to carry its own history — every state change the engine and the
 * transition RPCs record has a sentence here.
 */
const EVENT_LABEL: Record<string, string> = {
  created: 'Entscheidung angelegt',
  framed: 'Von Tagro aufbereitet',
  published: 'Zur Entscheidung freigegeben',
  clarification_requested: 'Rückfrage gestellt',
  clarification_resolved: 'Rückfrage beantwortet',
  decided: 'Entschieden',
  delegated_to_tagro: 'An Tagro delegiert',
  overridden: 'Nachträglich geändert',
  applied: 'Im Projekt umgesetzt',
  superseded: 'Durch eine neue Entscheidung ersetzt',
  expired: 'Frist abgelaufen',
  archived: 'Archiviert',
  rejected: 'Abgelehnt',
  reopened: 'Wieder geöffnet',
  option_added: 'Option ergänzt',
  option_removed: 'Option entfernt',
  recommendation_set: 'Empfehlung gesetzt',
  status_change: 'Status geändert',
}

export function eventLabel(kind: string): string {
  return EVENT_LABEL[kind] || 'Aktualisiert'
}

/** Who acted — only named when it wasn't a plain human action. */
export function eventActorLabel(actorKind: string | null | undefined): string | null {
  if (actorKind === 'tagro') return 'Tagro'
  if (actorKind === 'system') return 'Festag'
  return null
}

/** Header line: "3 warten auf dich · 1 dringend · 2 im Hintergrund". */
export function centerSummary(groups: DecisionCenterGroups): string {
  const openCount = (groups.focus ? 1 : 0) + groups.queue.length
  const urgent = [groups.focus, ...groups.queue].filter(
    (d): d is Decision => !!d && (d.urgency === 'high' || d.urgency === 'critical'),
  ).length

  if (openCount === 0) {
    return groups.history.length > 0
      ? `Nichts offen · ${groups.history.length} entschieden`
      : 'Nichts offen'
  }

  // No focus means nothing here is the viewer's to answer — say "offen",
  // not "warten auf dich".
  const parts = [
    groups.focus
      ? `${openCount} ${openCount === 1 ? 'wartet' : 'warten'} auf dich`
      : `${openCount} offen`,
  ]
  if (urgent > 0) parts.push(`${urgent} dringend`)
  if (groups.background.length > 0) parts.push(`${groups.background.length} im Hintergrund`)
  return parts.join(' · ')
}
