/**
 * Project Control Status — the visible heart of Festag's "AI control layer".
 *
 * One consolidated status per project (NOT a second health score) answering:
 * "Is this project under control, and if not, what's the single most important
 * reason?" Derived purely from signals Festag already has (tasks, decisions,
 * approvals, reports) — no new tables. Reused across Project Overview, the
 * Dashboard status sentence and (later) the Client Panel so everyone sees the
 * same calm truth.
 *
 * States (master-prompt定義): controlled · needs_attention · waiting_approval ·
 * risk_detected · not_ready — always with a one-line reason.
 */

export type ControlStatus =
  | 'controlled'
  | 'needs_attention'
  | 'waiting_approval'
  | 'risk_detected'
  | 'not_ready'

export type ControlTone = 'calm' | 'info' | 'warn' | 'risk'

export type ControlStatusResult = {
  status: ControlStatus
  /** Short German label for chips/rows. */
  label: string
  /** One-line reason — always present, plain language. */
  reason: string
  /** Visual tone for the status dot / chip. */
  tone: ControlTone
  /** Accent colour for the dot (theme-agnostic, calm palette). */
  color: string
}

export type ControlStatusInput = {
  taskCount: number
  /** Tasks blocked (hard stop). */
  blockedCount: number
  /** Open decisions waiting on the client/owner. */
  decisionCount: number
  /** Finished/verified work awaiting owner approval. */
  approvalCount: number
  /** Whether at least one status report exists. */
  hasReport: boolean
  /** Age of the latest report in days, or null if none. */
  reportAgeDays: number | null
  /** Project phase (project.status). */
  phase?: string | null
  /** Title of the single next action, if known. */
  nextActionTitle?: string | null
}

const COLORS: Record<ControlTone, string> = {
  calm: '#3FB984',
  info: '#6a738c',
  warn: '#D4882B',
  risk: '#D9534F',
}

function result(status: ControlStatus, label: string, tone: ControlTone, reason: string): ControlStatusResult {
  return { status, label, tone, reason, color: COLORS[tone] }
}

/** Plural-safe German helper. */
function n(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * Compute the control status. Priority order (most important reason wins):
 *   not_ready → risk_detected → waiting_approval → needs_attention → controlled
 */
export function computeControlStatus(input: ControlStatusInput): ControlStatusResult {
  const {
    taskCount, blockedCount, decisionCount, approvalCount,
    hasReport, reportAgeDays, nextActionTitle,
  } = input

  // Nothing to control yet — scope/first tasks missing.
  if (taskCount === 0) {
    return result('not_ready', 'Noch nicht bereit', 'info',
      'Scope und erste Aufgaben fehlen noch — Tagro wartet auf den Projektinhalt.')
  }

  // A hard blocker is always the most important thing.
  if (blockedCount > 0) {
    return result('risk_detected', 'Risiko erkannt', 'risk',
      `${n(blockedCount, 'Blocker', 'Blocker')} ${blockedCount === 1 ? 'braucht' : 'brauchen'} Aufmerksamkeit${nextActionTitle ? `: ${nextActionTitle}` : '.'}`)
  }

  // Finished work waiting on the owner to approve.
  if (approvalCount > 0) {
    return result('waiting_approval', 'Wartet auf Freigabe', 'info',
      `${n(approvalCount, 'Ergebnis', 'Ergebnisse')} ${approvalCount === 1 ? 'wartet' : 'warten'} auf deine Freigabe.`)
  }

  // Open decisions need the client/owner.
  if (decisionCount > 0) {
    return result('needs_attention', 'Aufmerksamkeit nötig', 'warn',
      `${n(decisionCount, 'offene Entscheidung', 'offene Entscheidungen')} ${decisionCount === 1 ? 'wartet' : 'warten'} auf eine Antwort.`)
  }

  // No report yet, or the last one is stale — the client can't see progress.
  if (!hasReport) {
    return result('needs_attention', 'Aufmerksamkeit nötig', 'warn',
      'Noch kein Statusbericht erstellt — der Kunde sieht den Fortschritt noch nicht.')
  }
  if (typeof reportAgeDays === 'number' && reportAgeDays > 10) {
    return result('needs_attention', 'Aufmerksamkeit nötig', 'warn',
      `Der letzte Statusbericht ist ${reportAgeDays} Tage alt — ein Update ist fällig.`)
  }

  // All clear.
  return result('controlled', 'Kontrolliert', 'calm',
    'Alles im Kontrollbereich. Kein Eingreifen notwendig.')
}

/** Days between an ISO timestamp and now (floored), or null. */
export function ageInDays(iso?: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
}
