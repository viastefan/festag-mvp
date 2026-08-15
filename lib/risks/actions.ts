// ─────────────────────────────────────────────────────────────────────────────
// Was nach der Entscheidung passiert.
//
// „Genehmigt" ist kein Ergebnis. Erst hier wird daraus eine Änderung im
// Projekt — aber nur über feste Aktionstypen, nie über frei formulierte
// Anweisungen eines Modells:
//
//   Aktion vorschlagen → Berechtigung prüfen → ausführen → protokollieren
//
// Jede ausgeführte Aktion landet als lesbarer Satz im Risiko-Verlauf: was
// geändert wurde, warum, und wer es freigegeben hat.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { writeEvent, loadRiskSettings, type EffectiveRiskSettings } from '@/lib/risks/engine'
import type { Risk, RiskStatus } from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

type AnyClient = SupabaseClient<any, any, any>

/** Der vollständige Satz erlaubter Eingriffe. Nichts außerhalb dieser Liste. */
export type RiskAction =
  | { type: 'raise_task_priority'; task_id: string; to: 'high' | 'critical'; reason: string }
  | { type: 'set_risk_status'; status: RiskStatus; reason: string }
  | { type: 'note_on_task'; task_id: string; text: string }

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
type Permission = 'auto' | 'ask' | 'off'

/**
 * Grundhaltung je Autonomiestufe. Beobachten heißt beobachten: Tagro ändert
 * dann nichts, auch nicht das Naheliegende.
 */
const BY_AUTONOMY: Record<EffectiveRiskSettings['autonomy'], Record<RiskActionType, Permission>> = {
  observe: {
    raise_task_priority: 'off',
    set_risk_status: 'off',
    note_on_task: 'off',
  },
  recommend: {
    raise_task_priority: 'ask',
    set_risk_status: 'ask',
    note_on_task: 'ask',
  },
  assist: {
    raise_task_priority: 'ask',
    set_risk_status: 'auto',
    note_on_task: 'auto',
  },
  act: {
    raise_task_priority: 'auto',
    set_risk_status: 'auto',
    note_on_task: 'auto',
  },
}

function permissionFor(
  settings: EffectiveRiskSettings,
  type: RiskActionType,
): Permission {
  const override = (settings.action_permissions ?? {})[type]
  if (override === 'auto' || override === 'ask' || override === 'off') return override
  return BY_AUTONOMY[settings.autonomy][type]
}

export type RunActionsInput = {
  risk: Risk
  actions: RiskAction[]
  /** Gesetzt, wenn ein Mensch die Aktionen gerade freigegeben hat. */
  approvedBy?: string | null
  /** Wofür die Freigabe erteilt wurde — steht später im Protokoll. */
  approvalContext?: string
  settings?: EffectiveRiskSettings
}

/**
 * Führt aus, was erlaubt ist, und meldet den Rest als offen zurück.
 * Wirft nie — eine fehlgeschlagene Aktion darf den Aufrufer nicht mitreißen.
 */
export async function runRiskActions(
  supa: AnyClient,
  input: RunActionsInput,
): Promise<ActionOutcome[]> {
  const { risk, actions } = input
  const settings = input.settings
    ?? await loadRiskSettings(supa, risk.workspace_id, risk.project_id)

  const outcomes: ActionOutcome[] = []

  for (const action of actions) {
    const permission = permissionFor(settings, action.type)
    const approved = !!input.approvedBy

    if (permission === 'off') {
      outcomes.push({ action, status: 'blocked', detail: 'Für diesen Workspace nicht erlaubt.' })
      continue
    }
    if (permission === 'ask' && !approved) {
      outcomes.push({ action, status: 'needs_approval' })
      continue
    }

    try {
      const detail = await execute(supa, risk, action)
      outcomes.push({ action, status: 'executed', detail })
      await writeEvent(supa, risk.id, {
        event_type: 'action_executed',
        actor_kind: approved ? 'user' : 'tagro',
        actor_user_id: input.approvedBy ?? null,
        summary: detail,
        payload: {
          action,
          permission,
          approved_by: input.approvedBy ?? null,
          approval_context: input.approvalContext ?? null,
        },
      })
    } catch (err) {
      outcomes.push({ action, status: 'failed', detail: (err as Error).message })
    }
  }

  return outcomes
}

async function execute(supa: AnyClient, risk: Risk, action: RiskAction): Promise<string> {
  switch (action.type) {
    case 'raise_task_priority': {
      const { data: task } = await (supa as any)
        .from('tasks').select('id,title,priority').eq('id', action.task_id).maybeSingle()
      if (!task) throw new Error('Aufgabe nicht gefunden')
      // Nie herunterstufen: eine Maßnahme darf Dringlichkeit nur erhöhen.
      const rank = { low: 0, medium: 1, high: 2, critical: 3 } as Record<string, number>
      if ((rank[task.priority] ?? 1) >= rank[action.to]) {
        return `„${task.title}" war bereits mindestens ${action.to} priorisiert.`
      }
      const { error } = await (supa as any)
        .from('tasks').update({ priority: action.to }).eq('id', task.id)
      if (error) throw new Error(error.message)
      return `Priorität von „${task.title}" auf ${action.to === 'critical' ? 'kritisch' : 'hoch'} gesetzt — ${action.reason}`
    }

    case 'set_risk_status': {
      const { error } = await (supa as any)
        .from('risks').update({ status: action.status }).eq('id', risk.id)
      if (error) throw new Error(error.message)
      return `Risiko auf „${action.status}" gesetzt — ${action.reason}`
    }

    case 'note_on_task': {
      const { data: task } = await (supa as any)
        .from('tasks').select('id,title,latest_dev_update').eq('id', action.task_id).maybeSingle()
      if (!task) throw new Error('Aufgabe nicht gefunden')
      const line = `[${new Date().toISOString().slice(0, 10)}] ${action.text}`
      const merged = (task.latest_dev_update ? `${task.latest_dev_update}\n\n` : '') + line
      const { error } = await (supa as any)
        .from('tasks').update({ latest_dev_update: merged.slice(0, 8000) }).eq('id', task.id)
      if (error) throw new Error(error.message)
      return `Notiz an „${task.title}" ergänzt.`
    }
  }
}

/**
 * Die Aktionen, die aus einer angenommenen Maßnahme folgen.
 *
 * Bewusst schmal: was ein Risiko braucht, ist fast immer, dass die blockierte
 * Arbeit nach vorne rückt — nicht ein Dutzend automatischer Eingriffe.
 */
export async function actionsForAcceptedMeasure(
  supa: AnyClient,
  risk: Risk,
): Promise<RiskAction[]> {
  const links = await safeTableRows<any>(
    (supa as any).from('risk_links').select('target_kind,target_id,link_kind').eq('risk_id', risk.id),
  )
  const taskIds = links.filter(l => l.target_kind === 'task').map(l => l.target_id)
  const to = risk.severity === 'critical' ? 'critical' : 'high'
  const reason = risk.recommendation?.trim() || `Risiko ${risk.severity}`

  return taskIds.slice(0, 5).map(task_id => ({
    type: 'raise_task_priority' as const,
    task_id,
    to,
    reason,
  }))
}
