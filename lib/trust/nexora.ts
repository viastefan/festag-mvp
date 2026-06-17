/**
 * Nexora — calm readiness / control checks.
 *
 * Answers one question before something reaches the client: "Is this ready?"
 * For a status report: are decisions resolved, approvals done, no blockers, no
 * internal notes left in client-facing text, and (optionally) is it backed by
 * evidence. Pure derivation — no panic, just a status + the single most
 * important reason, plus the full check list.
 */

export type ReadinessStatus =
  | 'client_ready'
  | 'needs_approval'
  | 'blocked_by_decision'
  | 'nexora_warning'
  | 'needs_evidence'

export type CheckSeverity = 'info' | 'warn' | 'block'

export type ReadinessCheck = {
  id: string
  label: string
  ok: boolean
  severity: CheckSeverity
}

export type ReadinessTone = 'calm' | 'info' | 'warn' | 'risk'

export type ReadinessResult = {
  status: ReadinessStatus
  label: string
  tone: ReadinessTone
  color: string
  reason: string
  checks: ReadinessCheck[]
}

const TONE_COLORS: Record<ReadinessTone, string> = {
  calm: '#3FB984',
  info: '#6a738c',
  warn: '#D4882B',
  risk: '#D9534F',
}

// Phrases that should never sit in client-facing report text. Calm heuristic —
// Nexora flags for review, it doesn't block hard.
const INTERNAL_MARKERS = [
  'intern:', 'internal:', 'nicht an kunde', 'nicht an den kunden', 'nur intern',
  'todo', 'fixme', 'tbd', 'vertraulich', 'confidential', 'do not send',
  'nicht senden', 'platzhalter', 'lorem ipsum', 'xxx',
]

export function hasInternalMarker(text?: string | null): boolean {
  if (!text) return false
  const t = text.toLowerCase()
  return INTERNAL_MARKERS.some(m => t.includes(m))
}

export type ReadinessInput = {
  reportContent?: string | null
  blockedCount: number
  decisionCount: number
  approvalCount: number
  /** Client-visible evidence backing the report; null/undefined → skip the check. */
  clientVisibleEvidenceCount?: number | null
}

export function computeReportReadiness(input: ReadinessInput): ReadinessResult {
  const { reportContent, blockedCount, decisionCount, approvalCount } = input
  const evidenceKnown = typeof input.clientVisibleEvidenceCount === 'number'
  const evidenceCount = input.clientVisibleEvidenceCount ?? 0
  const internalNote = hasInternalMarker(reportContent)

  const checks: ReadinessCheck[] = [
    { id: 'decisions', label: 'Keine offenen Entscheidungen', ok: decisionCount === 0, severity: 'block' },
    { id: 'approvals', label: 'Keine ausstehenden Freigaben', ok: approvalCount === 0, severity: 'warn' },
    { id: 'blockers', label: 'Keine Blocker', ok: blockedCount === 0, severity: 'warn' },
    { id: 'client_safe', label: 'Keine internen Notizen im Text', ok: !internalNote, severity: 'warn' },
  ]
  if (evidenceKnown) {
    checks.push({ id: 'evidence', label: 'Mit Belegen hinterlegt', ok: evidenceCount > 0, severity: 'info' })
  }

  // Priority: decisions (block) → approvals → blockers/internal (warning) → evidence.
  if (decisionCount > 0) {
    return build('blocked_by_decision', 'Entscheidung offen', 'warn',
      `${decisionCount} offene Entscheidung${decisionCount === 1 ? '' : 'en'} sollte${decisionCount === 1 ? '' : 'n'} vor dem Versand geklärt werden.`, checks)
  }
  if (approvalCount > 0) {
    return build('needs_approval', 'Freigabe ausstehend', 'info',
      `${approvalCount} Ergebnis${approvalCount === 1 ? '' : 'se'} wartet noch auf Freigabe.`, checks)
  }
  if (internalNote) {
    return build('nexora_warning', 'Nexora-Hinweis', 'warn',
      'Der Text enthält möglicherweise interne Notizen — bitte vor dem Versand prüfen.', checks)
  }
  if (blockedCount > 0) {
    return build('nexora_warning', 'Nexora-Hinweis', 'warn',
      `${blockedCount} Blocker ${blockedCount === 1 ? 'ist' : 'sind'} offen — im Bericht ehrlich erwähnen.`, checks)
  }
  if (evidenceKnown && evidenceCount === 0) {
    return build('needs_evidence', 'Belege fehlen', 'info',
      'Noch keine kundensichtbaren Belege — der Bericht ist nicht nachgewiesen.', checks)
  }
  return build('client_ready', 'Bereit für Kunden', 'calm',
    'Geprüft — der Bericht kann an den Kunden gehen.', checks)
}

function build(status: ReadinessStatus, label: string, tone: ReadinessTone, reason: string, checks: ReadinessCheck[]): ReadinessResult {
  return { status, label, tone, color: TONE_COLORS[tone], reason, checks }
}
