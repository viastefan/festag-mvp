import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkSignalClassification, WorkSignalRow } from '@/lib/work-signals'
import type { WorkSignalType } from '@/lib/work-types'
import { runOpenAIJson } from '@/lib/tagro/openai'

export type SignalClassificationResult = WorkSignalClassification & {
  confidence: number
}

const TYPE_DEFAULTS: Partial<Record<WorkSignalType, WorkSignalClassification>> = {
  task_completed: {
    meaning: 'progress',
    client_visible: true,
    internal_summary: 'Aufgabe abgeschlossen.',
  },
  blocker_reported: {
    meaning: 'blocker',
    client_visible: false,
    internal_summary: 'Blocker gemeldet — prüfen ob Lieferung betroffen.',
  },
  decision_needed: {
    meaning: 'decision_needed',
    client_visible: false,
    internal_summary: 'Entscheidung erforderlich.',
  },
  approval_requested: {
    meaning: 'approval_needed',
    client_visible: true,
    internal_summary: 'Freigabe angefragt.',
  },
  approval_received: {
    meaning: 'progress',
    client_visible: true,
    internal_summary: 'Freigabe erhalten.',
  },
  risk_reported: {
    meaning: 'risk',
    client_visible: false,
    internal_summary: 'Risiko gemeldet.',
  },
  scope_change: {
    meaning: 'scope_change',
    client_visible: true,
    internal_summary: 'Scope-Änderung erkannt.',
  },
  deployment_update: {
    meaning: 'progress',
    client_visible: true,
    internal_summary: 'Deployment oder Release.',
  },
  status_note: {
    meaning: 'progress',
    client_visible: true,
    internal_summary: 'Status-Update.',
  },
  code_update: {
    meaning: 'progress',
    client_visible: false,
    internal_summary: 'Code-Update.',
  },
  meeting_note: {
    meaning: 'next_step',
    client_visible: false,
    internal_summary: 'Meeting-Notiz.',
  },
  file_uploaded: {
    meaning: 'client_relevant',
    client_visible: true,
    internal_summary: 'Neues Deliverable hochgeladen.',
  },
}

function heuristicClassify(signal: Pick<WorkSignalRow, 'type' | 'content' | 'source'>): SignalClassificationResult {
  const base = TYPE_DEFAULTS[signal.type as WorkSignalType] ?? {
    meaning: 'internal_noise' as const,
    client_visible: false,
    internal_summary: 'Aktivität erfasst.',
  }

  const text = (signal.content || '').toLowerCase()
  let meaning = base.meaning
  let client_visible = base.client_visible
  let internal_summary = base.internal_summary || 'Aktivität erfasst.'

  if (/kritisch|critical|urgent|sofort|blockiert|blocked/i.test(text)) {
    meaning = 'blocker'
    client_visible = false
    internal_summary = 'Kritische Blockade oder Dringlichkeit erkannt.'
  } else if (/verzög|delay|spät|late|risk|risiko/i.test(text)) {
    meaning = 'risk'
    client_visible = false
    internal_summary = 'Verzögerungs- oder Risikosignal.'
  } else if (/approve|freigabe|entscheid/i.test(text)) {
    meaning = 'decision_needed'
    client_visible = false
    internal_summary = 'Entscheidung oder Freigabe nötig.'
  } else if (/fertig|done|shipped|merged|live|deploy/i.test(text)) {
    meaning = 'progress'
    client_visible = true
    internal_summary = 'Fortschritt oder Auslieferung.'
  }

  const client_translation = client_visible
    ? sanitizeForClient(signal.content || internal_summary)
    : undefined

  const suggested_actions: WorkSignalClassification['suggested_actions'] = []
  if (meaning === 'blocker' || meaning === 'risk') {
    suggested_actions.push({ kind: 'create_risk', title: 'Risiko prüfen' })
  }
  if (meaning === 'decision_needed' || meaning === 'approval_needed') {
    suggested_actions.push({ kind: 'create_decision', title: 'Entscheidung anlegen' })
  }

  return {
    meaning,
    client_visible,
    internal_summary,
    client_translation,
    suggested_actions: suggested_actions.length ? suggested_actions : undefined,
    confidence: 0.55,
  }
}

function sanitizeForClient(text: string): string {
  const cleaned = text
    .replace(/\[Slack[^\]]*\]\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length <= 160) return cleaned
  return `${cleaned.slice(0, 157)}…`
}

export async function classifyWorkSignal(
  signal: Pick<WorkSignalRow, 'id' | 'type' | 'content' | 'source' | 'project_id'>,
  projectTitle?: string | null,
): Promise<SignalClassificationResult> {
  const heuristic = heuristicClassify(signal)
  if (!signal.content?.trim() || !process.env.OPENAI_API_KEY) return heuristic

  const prompt = `Du bist Tagro — Operational Intelligence für Festag.

Projekt: "${projectTitle || 'Unbekannt'}"
Signal-Typ: ${signal.type}
Quelle: ${signal.source}
Inhalt:
"""
${(signal.content || '').slice(0, 1200)}
"""

Klassifiziere dieses Work Signal für Team und optional Client Panel.

Regeln:
- Kein technisches Rauschen, keine Commit-Hashes in client_translation.
- meaning: progress|blocker|risk|decision_needed|approval_needed|scope_change|quality_issue|delay|next_step|internal_noise|client_relevant
- client_visible: true nur wenn der Kunde es verstehen sollte.
- client_translation: 1 ruhiger Satz auf Deutsch (nur wenn client_visible).
- internal_summary: 1 Satz für Team/Owner auf Deutsch.
- confidence: 0..1

Antworte als JSON:
{
  "meaning": string,
  "client_visible": boolean,
  "client_translation": string | null,
  "internal_summary": string,
  "confidence": number,
  "suggested_actions": [{ "kind": "create_task"|"create_decision"|"create_risk"|"request_approval"|"notify_client"|"update_status_report", "title": string }] | null
}`

  try {
    const { output } = await runOpenAIJson({
      prompt,
      runType: 'signal_classification',
      fallback: () => heuristic as unknown as Record<string, unknown>,
    })
    const parsed = output as SignalClassificationResult
    if (!parsed?.meaning) return heuristic
    return {
      meaning: parsed.meaning,
      client_visible: !!parsed.client_visible,
      client_translation: parsed.client_translation || undefined,
      internal_summary: parsed.internal_summary || heuristic.internal_summary,
      suggested_actions: parsed.suggested_actions || heuristic.suggested_actions,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.65,
    }
  } catch {
    return heuristic
  }
}

export async function classifyAndPersistWorkSignal(
  sb: SupabaseClient<any>,
  signalId: string,
): Promise<WorkSignalRow | null> {
  const { data: signal } = await sb
    .from('work_signals')
    .select('*, projects(title)')
    .eq('id', signalId)
    .maybeSingle()

  if (!signal) return null
  const row = signal as any
  const existing = row.tagro_classification_json as WorkSignalClassification | null
  if (existing?.meaning && existing?.internal_summary) return row as WorkSignalRow

  const classification = await classifyWorkSignal(
    row,
    row.projects?.title ?? null,
  )

  const { data: updated, error } = await sb
    .from('work_signals')
    .update({
      tagro_classification_json: {
        meaning: classification.meaning,
        client_visible: classification.client_visible,
        client_translation: classification.client_translation ?? null,
        internal_summary: classification.internal_summary,
        suggested_actions: classification.suggested_actions ?? [],
      },
      confidence: classification.confidence,
    })
    .eq('id', signalId)
    .select('*')
    .single()

  if (error || !updated) return null
  return updated as WorkSignalRow
}

export async function classifyUnclassifiedSignals(
  sb: SupabaseClient<any>,
  opts?: { projectId?: string; limit?: number },
): Promise<number> {
  const limit = Math.min(opts?.limit ?? 25, 50)
  let q = sb
    .from('work_signals')
    .select('id,tagro_classification_json')
    .order('created_at', { ascending: false })
    .limit(limit * 3)

  if (opts?.projectId) q = q.eq('project_id', opts.projectId)

  const { data } = await q
  const ids = ((data as any[]) ?? [])
    .filter(r => !(r.tagro_classification_json as WorkSignalClassification | null)?.meaning)
    .map(r => r.id)
    .filter(Boolean)
    .slice(0, limit)
  let count = 0
  for (const id of ids) {
    const result = await classifyAndPersistWorkSignal(sb, id)
    if (result) count++
  }
  return count
}
