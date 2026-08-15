// ─────────────────────────────────────────────────────────────────────────────
// The risk engine: gather project signals → detect → persist.
//
// Runs against whatever Supabase client it is handed (user session in API
// routes, service role in the webhook path), so RLS still applies normally.
//
// Deduplication happens on `risks.fingerprint`: the same underlying condition
// updates one risk and adds evidence to it. Ten failed checks are ten signals
// on one risk, never ten risks.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectRisks, type DetectionContext, type RiskCandidate } from '@/lib/risks/detect'
import {
  DEFAULT_RISK_SETTINGS,
  RISK_LIVE_STATUS_LIST,
  type Risk,
  type RiskSettings,
} from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

type AnyClient = SupabaseClient<any, any, any>

/** Wie viele neu erkannte Risiken pro Lauf höchstens durch das Modell gehen. */
const ENRICH_PER_RUN = 2

export type DetectionRunResult = {
  created: number
  updated: number
  moved_to_monitoring: number
  resolved: number
  skipped_reason?: 'detection_disabled' | 'project_not_found'
  risks: Risk[]
}

export type EffectiveRiskSettings = Omit<
  RiskSettings,
  'id' | 'workspace_id' | 'created_at' | 'updated_at'
> & { workspace_id?: string | null }

/** Project override wins over the workspace default, defaults fill the rest. */
export async function loadRiskSettings(
  supa: AnyClient,
  workspaceId: string | null | undefined,
  projectId: string,
): Promise<EffectiveRiskSettings> {
  if (!workspaceId) return { ...DEFAULT_RISK_SETTINGS, workspace_id: null }

  const rows = await safeTableRows<any>(
    (supa as any)
      .from('risk_settings')
      .select('*')
      .eq('workspace_id', workspaceId),
  )

  const projectRow = rows.find(r => r.project_id === projectId)
  const workspaceRow = rows.find(r => !r.project_id)
  const row = projectRow ?? workspaceRow
  if (!row) return { ...DEFAULT_RISK_SETTINGS, workspace_id: workspaceId }

  return { ...DEFAULT_RISK_SETTINGS, ...row, workspace_id: workspaceId }
}

/** Read every enabled signal source for one project. */
export async function buildDetectionContext(
  supa: AnyClient,
  projectId: string,
  settings: EffectiveRiskSettings,
  project: { id: string; title?: string | null; target_date?: string | null; workspace_id?: string | null },
): Promise<DetectionContext> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [tasks, workSignals, decisions, pullRequests] = await Promise.all([
    settings.source_tasks
      ? safeTableRows<any>((supa as any)
          .from('tasks')
          .select('id,title,status,dev_status,priority,due_date,estimated_hours,updated_at,last_dev_action_at,branch_name,assigned_to,epic_id')
          .eq('project_id', projectId)
          .limit(300))
      : Promise.resolve([]),
    settings.source_developer || settings.source_client
      ? safeTableRows<any>((supa as any)
          .from('work_signals')
          .select('id,type,content,related_task_id,created_at,source')
          .eq('project_id', projectId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200))
      : Promise.resolve([]),
    settings.source_decisions
      ? safeTableRows<any>((supa as any)
          .from('decisions')
          .select('id,title,client_title,status,urgency,escalation_level,due_at,due_date,decision_type')
          .eq('project_id', projectId)
          .limit(200))
      : Promise.resolve([]),
    settings.source_github
      ? safeTableRows<any>((supa as any)
          .from('github_pull_requests')
          .select('id,pr_number,title,state,merged,created_at_github,updated_at_github,head_branch,task_id,raw_payload,pr_url')
          .eq('project_id', projectId)
          .order('updated_at_github', { ascending: false })
          .limit(60))
      : Promise.resolve([]),
  ])

  const filteredSignals = workSignals.filter(s => {
    const fromClient = s.source === 'client' || s.type === 'scope_change'
    return fromClient ? settings.source_client : settings.source_developer
  })

  return {
    projectId,
    workspaceId: project.workspace_id ?? null,
    projectTitle: project.title ?? null,
    targetDate: settings.source_timeline ? project.target_date ?? null : null,
    tasks,
    workSignals: settings.detect_scope_changes
      ? filteredSignals
      : filteredSignals.filter(s => s.type !== 'scope_change'),
    decisions,
    pullRequests: pullRequests.map(pr => ({
      id: pr.id,
      pr_number: pr.pr_number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged,
      created_at_github: pr.created_at_github,
      updated_at_github: pr.updated_at_github,
      head_ref: pr.head_branch ?? pr.raw_payload?.head?.ref ?? null,
      task_id: pr.task_id ?? null,
      pr_url: pr.pr_url,
    })),
    sensitivity: settings.sensitivity,
  }
}

/**
 * Detect and persist for one project.
 *
 * Candidates that already exist are updated in place with their new evidence.
 * Candidates that disappear step down one level — active risks go to
 * monitoring first, and only a risk that stays quiet resolves. That two-step
 * exit stops the list from flickering while work is in flight.
 */
export async function runRiskDetection(
  supa: AnyClient,
  projectId: string,
  opts: {
    now?: Date
    actorUserId?: string | null
    /** Let Tagro write the client framing for newly detected risks. */
    enrich?: boolean
  } = {},
): Promise<DetectionRunResult> {
  const now = opts.now ?? new Date()
  const empty: DetectionRunResult = {
    created: 0, updated: 0, moved_to_monitoring: 0, resolved: 0, risks: [],
  }

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id,title,target_date,workspace_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return { ...empty, skipped_reason: 'project_not_found' }

  const settings = await loadRiskSettings(supa, project.workspace_id, projectId)
  if (!settings.detect_risks) return { ...empty, skipped_reason: 'detection_disabled' }

  const ctx = await buildDetectionContext(supa, projectId, settings, project)
  let candidates = detectRisks({ ...ctx, now })
  if (!settings.detect_blockers) {
    candidates = candidates.filter(c => !c.fingerprint.startsWith('task_blocked:')
      && !c.fingerprint.startsWith('developer_blocker:'))
  }

  const existing = await safeTableRows<Risk>(
    (supa as any)
      .from('risks')
      .select('*')
      .eq('project_id', projectId)
      .in('status', RISK_LIVE_STATUS_LIST)
      .limit(200),
  )
  const byFingerprint = new Map(existing.filter(r => r.fingerprint).map(r => [r.fingerprint!, r]))

  const result: DetectionRunResult = { ...empty }
  const touched = new Set<string>()

  for (const candidate of candidates) {
    touched.add(candidate.fingerprint)
    const current = byFingerprint.get(candidate.fingerprint)
    if (current) {
      const changed = await updateFromCandidate(supa, current, candidate, now)
      if (changed) result.updated += 1
    } else {
      const created = await insertFromCandidate(supa, candidate, project, now)
      if (created) {
        result.created += 1
        result.risks.push(created)
      }
    }
  }

  // Anything auto-detected that stopped showing signals steps down.
  for (const risk of existing) {
    if (!risk.fingerprint || touched.has(risk.fingerprint)) continue
    if (!risk.created_by_tagro) continue // never auto-close what a human wrote
    if (risk.status === 'accepted') continue // an accepted risk stays accepted

    if (risk.status === 'monitoring') {
      await (supa as any)
        .from('risks')
        .update({
          status: 'resolved',
          resolved_at: now.toISOString(),
          resolution_note: 'Die auslösenden Signale sind nicht mehr vorhanden.',
        })
        .eq('id', risk.id)
      await writeEvent(supa, risk.id, {
        event_type: 'resolved',
        actor_kind: 'tagro',
        from_status: risk.status,
        to_status: 'resolved',
        summary: 'Gelöst — die auslösenden Signale treten nicht mehr auf.',
      })
      result.resolved += 1
    } else {
      await (supa as any).from('risks').update({ status: 'monitoring' }).eq('id', risk.id)
      await writeEvent(supa, risk.id, {
        event_type: 'status_change',
        actor_kind: 'tagro',
        from_status: risk.status,
        to_status: 'monitoring',
        summary: 'Die Signale sind zurückgegangen — das Risiko bleibt vorerst in Beobachtung.',
      })
      result.moved_to_monitoring += 1
    }
  }

  // Tagro formuliert nach — aber nur für frisch erkannte Risiken und nur
  // wenige pro Lauf, damit ein Webhook nicht an Modell-Latenz hängt.
  if (opts.enrich && result.risks.length) {
    const { enrichRisk } = await import('@/lib/risks/enrich')
    for (const risk of result.risks.slice(0, ENRICH_PER_RUN)) {
      const signals = await safeTableRows<any>(
        (supa as any).from('risk_signals').select('*').eq('risk_id', risk.id),
      )
      await enrichRisk(supa, risk, signals, {
        projectTitle: project.title,
        targetDate: project.target_date,
      }).catch(() => null)
    }
  }

  return result
}

/* ── Persistence ────────────────────────────────────────────────────────── */

async function insertFromCandidate(
  supa: AnyClient,
  candidate: RiskCandidate,
  project: { id: string; workspace_id?: string | null },
  now: Date,
): Promise<Risk | null> {
  const { data, error } = await (supa as any)
    .from('risks')
    .insert({
      project_id: project.id,
      workspace_id: project.workspace_id ?? null,
      title: candidate.title,
      description: candidate.description,
      client_title: candidate.client_title,
      client_summary: candidate.client_summary,
      category: candidate.category,
      probability: candidate.probability,
      impact: candidate.impact,
      severity: candidate.severity,
      confidence: candidate.confidence,
      status: 'detected',
      source: candidate.source,
      fingerprint: candidate.fingerprint,
      potential_delay_days: candidate.potential_delay_days,
      recommendation: candidate.recommendation,
      recommendation_reason: candidate.recommendation_reason,
      detected_at: now.toISOString(),
      last_signal_at: now.toISOString(),
      signal_count: candidate.signals.length,
      created_by_tagro: true,
    })
    .select('*')
    .maybeSingle()

  // A parallel run may have won the unique index — that is fine, not an error.
  if (error || !data) return null

  // No 'signal_added' entry on creation — the detection event already
  // says where the risk came from.
  await syncSignals(supa, data.id, candidate, { announce: false })
  if (candidate.links.length) {
    await (supa as any)
      .from('risk_links')
      .upsert(
        candidate.links.map(l => ({ ...l, risk_id: data.id })),
        { onConflict: 'risk_id,target_kind,target_id,link_kind', ignoreDuplicates: true },
      )
  }
  return data as Risk
}

/** Returns true when something meaningful actually changed. */
async function updateFromCandidate(
  supa: AnyClient,
  current: Risk,
  candidate: RiskCandidate,
  now: Date,
): Promise<boolean> {
  await syncSignals(supa, current.id, candidate)

  const probabilityDelta = Math.abs((current.probability ?? 0) - candidate.probability)
  const severityChanged = current.severity !== candidate.severity
  const materialChange = severityChanged || probabilityDelta >= 0.08

  const patch: Record<string, unknown> = {
    last_signal_at: now.toISOString(),
    signal_count: candidate.signals.length,
    confidence: candidate.confidence,
  }

  // A risk a human already answered keeps its assessment — we only add
  // evidence. Everything else tracks the current signal picture.
  if (!current.responded_at) {
    patch.probability = candidate.probability
    patch.severity = candidate.severity
    patch.impact = candidate.impact
    patch.potential_delay_days = candidate.potential_delay_days
    if (current.status === 'detected' && materialChange) patch.status = 'active'
  }

  await (supa as any).from('risks').update(patch).eq('id', current.id)

  if (!current.responded_at && materialChange) {
    const summary = severityChanged
      ? `Einstufung von ${current.severity} auf ${candidate.severity} geändert — ${candidate.signals[0]?.label ?? 'neue Signale'}.`
      : `Wahrscheinlichkeit auf ${Math.round(candidate.probability * 100)}% angepasst — ${candidate.signals[0]?.label ?? 'neue Signale'}.`
    await writeEvent(supa, current.id, {
      event_type: severityChanged ? 'severity_changed' : 'probability_changed',
      actor_kind: 'tagro',
      summary,
      payload: {
        from_severity: current.severity,
        to_severity: candidate.severity,
        from_probability: current.probability,
        to_probability: candidate.probability,
      },
    })
    return true
  }

  return false
}

/** Evidence upsert — repeated observations bump occurrences, never duplicate. */
async function syncSignals(
  supa: AnyClient,
  riskId: string,
  candidate: RiskCandidate,
  opts: { announce?: boolean } = {},
) {
  if (!candidate.signals.length) return

  const existing = await safeTableRows<any>(
    (supa as any).from('risk_signals').select('id,dedupe_key,occurrences,occurred_at').eq('risk_id', riskId),
  )
  const known = new Map(existing.map(s => [s.dedupe_key, s]))

  const fresh = candidate.signals.filter(s => !known.has(s.dedupe_key))
  if (fresh.length) {
    await (supa as any).from('risk_signals').insert(
      fresh.map(s => ({
        risk_id: riskId,
        source_type: s.source_type,
        source_ref: s.source_ref ?? null,
        source_external_id: s.source_external_id ?? null,
        dedupe_key: s.dedupe_key,
        label: s.label,
        detail: s.detail ?? null,
        weight: s.weight,
        occurred_at: s.occurred_at,
      })),
    )
    if (opts.announce !== false) await writeEvent(supa, riskId, {
      event_type: 'signal_added',
      actor_kind: 'tagro',
      summary: fresh.length === 1
        ? `Neues Signal: ${fresh[0].label}`
        : `${fresh.length} neue Signale erkannt.`,
      payload: { labels: fresh.map(f => f.label) },
    })
  }

  for (const s of candidate.signals) {
    const prev = known.get(s.dedupe_key)
    if (!prev) continue
    // A detection run that sees the same observation again is not a new
    // occurrence — only a genuinely later *event* bumps the counter. Derived
    // state signals ("noch 3 Tage bis zum Termin") carry the run timestamp
    // and would otherwise count up forever.
    const isNewOccurrence = !!s.event_like
      && new Date(s.occurred_at).getTime() > new Date(prev.occurred_at).getTime()
    if (!isNewOccurrence && prev.label === s.label) continue
    await (supa as any)
      .from('risk_signals')
      .update({
        occurrences: isNewOccurrence ? (prev.occurrences ?? 1) + 1 : prev.occurrences ?? 1,
        label: s.label,
        occurred_at: isNewOccurrence ? s.occurred_at : prev.occurred_at,
      })
      .eq('id', prev.id)
  }
}

export async function writeEvent(
  supa: AnyClient,
  riskId: string,
  event: {
    event_type: string
    summary: string
    actor_kind?: 'user' | 'tagro' | 'system'
    actor_user_id?: string | null
    from_status?: string | null
    to_status?: string | null
    payload?: Record<string, unknown>
  },
) {
  try {
    await (supa as any).from('risk_events').insert({
      risk_id: riskId,
      event_type: event.event_type,
      summary: event.summary,
      actor_kind: event.actor_kind ?? 'system',
      actor_user_id: event.actor_user_id ?? null,
      from_status: event.from_status ?? null,
      to_status: event.to_status ?? null,
      payload: event.payload ?? {},
    })
  } catch {
    // History is best-effort — never fail the caller because of it.
  }
}
