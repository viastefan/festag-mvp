/**
 * Build a Delivery Pulse for a user — overall portfolio or one project.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildExecutiveOverview } from '@/lib/executive/build-overview'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { composeDeliveryPulse } from '@/lib/pulse/compose'
import { emptyPulse, type DeliveryPulse, type PulseScope } from '@/lib/pulse/types'
import { loadClientProofCapsules } from '@/lib/proof/load-client-proof'
import { gatherRecentDevSignals } from '@/lib/tagro/generate-status-digest'
import { loadTagroOkmContext } from '@/lib/tagro/okm-context'
import { runOpenAIJson } from '@/lib/tagro/openai'

export type BuildPulseOpts = {
  scope?: PulseScope
  projectId?: string | null
  /** Attempt a short Tagro refine pass when keys exist. */
  refineWithTagro?: boolean
}

async function resolveWorkspaceId(
  sb: SupabaseClient<any>,
  userId: string,
  projectId?: string | null,
): Promise<string | null> {
  if (projectId) {
    const { data } = await sb
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .maybeSingle()
    if (data?.workspace_id) return data.workspace_id as string
  }
  const { data: ws } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()
  return (ws?.id as string) || null
}

async function loadPendingDecisions(
  sb: SupabaseClient<any>,
  projectIds: string[],
): Promise<string[]> {
  if (!projectIds.length) return []
  const { data } = await sb
    .from('decisions')
    .select('title, client_title, visible_to_client, status, project_id')
    .in('project_id', projectIds)
    .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
    .order('updated_at', { ascending: false })
    .limit(8)

  const titles: string[] = []
  for (const row of (data as any[]) ?? []) {
    const clientSafe = row.visible_to_client
      ? String(row.client_title || row.title || '').trim()
      : String(row.client_title || row.title || '').trim()
    if (clientSafe) titles.push(clientSafe)
  }
  return titles.slice(0, 4)
}

async function loadLatestReportLines(
  sb: SupabaseClient<any>,
  opts: { projectId?: string | null },
): Promise<{ summary?: string; next?: string[]; risks?: string[]; completed?: string[] }> {
  let q = sb
    .from('status_reports')
    .select('summary, next_steps_json, risks_json, blockers_json, completed_work_json, project_id, created_at')
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (opts.projectId) {
    q = q.eq('project_id', opts.projectId)
  }

  const { data } = await q.maybeSingle()
  if (!data) return {}

  const asArr = (v: unknown) =>
    Array.isArray(v) ? v.map(x => String(x)).filter(Boolean).slice(0, 4) : []

  return {
    summary: String((data as any).summary || '').trim() || undefined,
    next: asArr((data as any).next_steps_json),
    risks: [...asArr((data as any).risks_json), ...asArr((data as any).blockers_json)].slice(0, 4),
    completed: asArr((data as any).completed_work_json),
  }
}

async function refineWithTagro(
  pulse: DeliveryPulse,
  okmBlock: string,
): Promise<DeliveryPulse> {
  try {
    const { output } = await runOpenAIJson({
      runType: 'delivery_pulse',
      prompt: `Du bist Tagro, der Project Interpreter von Festag.
Verdichte den Delivery Pulse in genau drei ruhige deutsche Sätze für CEOs und Kunden.
Kein Jargon, keine Ticket-IDs, keine Prozent-Theater-Zahlen außer sie sind schon im Input.
Antwort nur als JSON: { "progress": string, "risk": string, "next_step": string }.
${okmBlock ? `\nOperational DNA (privacy-gated):\n${okmBlock}` : ''}

Input:
${JSON.stringify({
  progress: pulse.progress,
  risk: pulse.risk,
  next_step: pulse.next_step,
  health: pulse.health,
  proof: pulse.proof.map(p => p.label),
})}`,
      fallback: () => ({
        progress: pulse.progress,
        risk: pulse.risk,
        next_step: pulse.next_step,
      }),
    })
    const progress = String((output as any)?.progress || '').trim()
    const risk = String((output as any)?.risk || '').trim()
    const next_step = String((output as any)?.next_step || '').trim()
    if (!progress || !risk || !next_step) return pulse
    return {
      ...pulse,
      progress,
      risk,
      next_step,
      source: 'tagro',
      confidence: Math.min(0.95, pulse.confidence + 0.08),
      generatedAt: new Date().toISOString(),
    }
  } catch {
    return pulse
  }
}

export async function buildDeliveryPulse(
  sb: SupabaseClient<any>,
  userId: string,
  opts: BuildPulseOpts = {},
): Promise<DeliveryPulse> {
  const scope: PulseScope = opts.scope === 'project' && opts.projectId ? 'project' : 'overall'
  const workspaceId = await resolveWorkspaceId(sb, userId, opts.projectId)

  if (scope === 'project' && opts.projectId) {
    const { data: project } = await sb
      .from('projects')
      .select('id,title,status')
      .eq('id', opts.projectId)
      .maybeSingle()

    if (!project) return emptyPulse({ scope: 'project', projectId: opts.projectId })

    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const [signals, decisions, report, overview, evidenceProof] = await Promise.all([
      gatherRecentDevSignals(sb, opts.projectId, since),
      loadPendingDecisions(sb, [opts.projectId]),
      loadLatestReportLines(sb, { projectId: opts.projectId }),
      buildExecutiveOverview(sb, userId),
      loadClientProofCapsules(sb, [opts.projectId], 3),
    ])

    const row = overview.projects.find(p => p.id === opts.projectId)
    const signalTexts = (signals ?? []).map(u => u.text).slice(0, 6)

    let pulse = composeDeliveryPulse({
      scope: 'project',
      projectId: project.id,
      projectTitle: project.title,
      health: row?.health ?? 'healthy',
      headline: overview.headline,
      summary: row?.summary || overview.summary,
      progressPct: row?.progress_pct ?? overview.progress_pct,
      openIssues: row?.open_issues ?? 0,
      criticalIssues: row?.critical_issues ?? 0,
      openDecisions: row?.open_decisions ?? decisions.length,
      pendingDecisionTitles: decisions,
      recentSignals: signalTexts,
      evidenceProof,
      tagroSummary: report.summary,
      tagroNextSteps: report.next,
      tagroRisks: report.risks,
      tagroCompleted: report.completed,
    })

    if (opts.refineWithTagro) {
      const okm = await loadTagroOkmContext({ sb, workspaceId })
      pulse = await refineWithTagro(pulse, okm.promptBlock)
    }
    return pulse
  }

  const overview = await buildExecutiveOverview(sb, userId)
  const projectIds = overview.projects.map(p => p.id)
  const [decisions, report, evidenceProof] = await Promise.all([
    loadPendingDecisions(sb, projectIds),
    loadLatestReportLines(sb, {}),
    loadClientProofCapsules(sb, projectIds, 3),
  ])

  let recentSignals: string[] = []
  if (projectIds[0]) {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const gathered = await gatherRecentDevSignals(sb, projectIds[0], since)
    recentSignals = (gathered ?? []).map(u => u.text).slice(0, 5)
  }

  let pulse = composeDeliveryPulse({
    scope: 'overall',
    projectId: null,
    projectTitle: null,
    health: overview.health,
    headline: overview.headline,
    summary: overview.summary,
    progressPct: overview.progress_pct,
    openIssues: overview.open_issues,
    criticalIssues: overview.critical_issues,
    openDecisions: overview.open_decisions,
    pendingDecisionTitles: decisions,
    recentSignals,
    evidenceProof,
    tagroSummary: report.summary,
    tagroNextSteps: report.next,
    tagroRisks: report.risks,
    tagroCompleted: report.completed,
  })

  if (opts.refineWithTagro) {
    const okm = await loadTagroOkmContext({ sb, workspaceId })
    pulse = await refineWithTagro(pulse, okm.promptBlock)
  }
  return pulse
}
