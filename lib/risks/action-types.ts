// ─────────────────────────────────────────────────────────────────────────────
// Der Katalog der erlaubten Eingriffe — ohne jede Server-Abhängigkeit.
//
// Bewusst ein eigenes Modul: die Einstellungen (Client) brauchen dieselben
// Typen und dieselbe Matrix wie die Ausführung (Server). Läge das in
// actions.ts, zöge ein Import aus der Oberfläche die halbe Engine samt
// Mailversand ins Browser-Bundle.
// ─────────────────────────────────────────────────────────────────────────────

import type { RiskStatus } from '@/lib/risks/types'

/** Der vollständige Satz erlaubter Eingriffe. Nichts außerhalb dieser Liste. */
export type RiskAction =
  | { type: 'raise_task_priority'; task_id: string; to: 'high' | 'critical'; reason: string }
  | { type: 'set_risk_status'; status: RiskStatus; reason: string }
  | { type: 'note_on_task'; task_id: string; text: string }
  | { type: 'create_followup_task'; title: string; description?: string; reason: string }
  | { type: 'move_task_due_date'; task_id: string; to: string; reason: string }

export type RiskActionType = RiskAction['type']

export type ActionOutcome = {
  action: RiskAction
  status: 'executed' | 'needs_approval' | 'blocked' | 'failed'
  detail?: string
}

/**
 * Wie eigenständig eine Aktionsart ausgeführt werden darf.
 *   auto → läuft ohne Rückfrage
 *   ask  → braucht eine menschliche Freigabe
 *   off  → gar nicht
 */
export type RiskActionPermission = 'auto' | 'ask' | 'off'

export type RiskAutonomy = 'observe' | 'recommend' | 'assist' | 'act'

/**
 * Grundhaltung je Autonomiestufe. Beobachten heißt beobachten: Tagro ändert
 * dann nichts, auch nicht das Naheliegende.
 */
const BY_AUTONOMY: Record<RiskAutonomy, Record<RiskActionType, RiskActionPermission>> = {
  observe: {
    raise_task_priority: 'off',
    set_risk_status: 'off',
    note_on_task: 'off',
    create_followup_task: 'off',
    move_task_due_date: 'off',
  },
  recommend: {
    raise_task_priority: 'ask',
    set_risk_status: 'ask',
    note_on_task: 'ask',
    create_followup_task: 'ask',
    move_task_due_date: 'ask',
  },
  assist: {
    raise_task_priority: 'ask',
    set_risk_status: 'auto',
    note_on_task: 'auto',
    create_followup_task: 'ask',
    // Ein verschobener Termin ist eine Zusage an jemanden — die trifft
    // auf keiner Stufe die Maschine allein.
    move_task_due_date: 'ask',
  },
  act: {
    raise_task_priority: 'auto',
    set_risk_status: 'auto',
    note_on_task: 'auto',
    create_followup_task: 'auto',
    move_task_due_date: 'ask',
  },
}

/**
 * Reihenfolge und Beschriftung für die Einstellungen. Die Liste ist bewusst
 * dieselbe wie oben — was hier fehlt, kann niemand erlauben.
 */
export const RISK_ACTION_TYPES: RiskActionType[] = [
  'set_risk_status',
  'note_on_task',
  'raise_task_priority',
  'create_followup_task',
  'move_task_due_date',
]

export const RISK_ACTION_LABEL: Record<RiskActionType, { label: string; sub: string }> = {
  set_risk_status: {
    label: 'Risikostatus setzen',
    sub: 'Ein Risiko in Beobachtung nehmen oder als abgesichert führen.',
  },
  note_on_task: {
    label: 'Notiz an Aufgabe',
    sub: 'Festhalten, was zu einer Aufgabe entschieden wurde.',
  },
  raise_task_priority: {
    label: 'Priorität anheben',
    sub: 'Blockierte Arbeit nach vorne holen. Nie herunterstufen.',
  },
  create_followup_task: {
    label: 'Folgeaufgabe anlegen',
    sub: 'Aus einer Maßnahme wird echte Arbeit im Projekt.',
  },
  move_task_due_date: {
    label: 'Termin verschieben',
    sub: 'Braucht immer eine Freigabe — ein Termin ist eine Zusage.',
  },
}

/** Was ohne Ausnahme gilt — die Oberfläche zeigt das als „Standard". */
export function defaultPermissionFor(
  autonomy: RiskAutonomy,
  type: RiskActionType,
): RiskActionPermission {
  return BY_AUTONOMY[autonomy][type]
}

/** Die Ausnahme im Workspace schlägt die Stufe. */
export function resolveActionPermission(
  autonomy: RiskAutonomy,
  type: RiskActionType,
  overrides: Record<string, RiskActionPermission | undefined> | null | undefined,
): RiskActionPermission {
  const override = overrides?.[type]
  if (override === 'auto' || override === 'ask' || override === 'off') return override
  return defaultPermissionFor(autonomy, type)
}
