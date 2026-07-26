/**
 * Project Truth — curated delivery timeline for a project.
 * Not a raw activity feed: each entry is client-relevant truth with
 * visibility, optional proof, and report impact.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isDecisionOpen } from '@/lib/decisions/types'
import { clampProofLabel, type ProofCapsule } from '@/lib/proof/types'
import {
  computeControlStatus,
  type ControlStatusResult,
} from '@/lib/trust/control-status'
import {
  computeReportReadiness,
  type ReadinessResult,
} from '@/lib/trust/nexora'
import { listClientVisibleSignals } from '@/lib/work-signals'

export type ProjectTruthKind =
  | 'evidence'
  | 'decision'
  | 'deliverable'
  | 'signal'
  | 'report'
  | 'moment'
  | 'blocker'

export type ProjectTruthEntry = {
  id: string
  kind: ProjectTruthKind
  title: string
  body: string
  occurredAt: string
  clientVisible: boolean
  /** How this affects a client report / Moment. */
  reportImpact: 'supports' | 'blocks' | 'awaits' | 'informs'
  href?: string | null
  proof?: ProofCapsule | null
}

export type ProjectTruth = {
  projectId: string
  projectTitle: string
  control: ControlStatusResult
  readiness: ReadinessResult
  entries: ProjectTruthEntry[]
  proof: ProofCapsule[]
  openDecisionCount: number
  pendingApprovalCount: number
  blockerCount: number
  clientVisibleEvidenceCount: number
  generatedAt: string
}

function clip(s: string, max = 140): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export async function buildProjectTruth(
  sb: SupabaseClient<any>,
  projectId: string,
): Promise<ProjectTruth | null> {
  const { data: project } = await sb
    .from('projects')
    .select('id,title,status')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return null

  const [
    evidenceRes,
    decisionsRes,
    assetsRes,
    reportsRes,
    tasksRes,
    signals,
    momentsRes,
  ] = await Promise.all([
    sb.from('evidence')
      .select('id,title,evidence_type,proof_strength,url,client_visible,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('decisions')
      .select('id,title,client_title,client_summary,status,visible_to_client,updated_at,created_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(24),
    sb.from('project_assets')
      .select('id,title,status,visibility,created_at,external_url,preview_url,analysis_result')
      .eq('project_id', projectId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(16),
    sb.from('status_reports')
      .select('id,title,summary,content,visible_to_client,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(6),
    sb.from('tasks')
      .select('id,title,status,client_status,updated_at')
      .eq('project_id', projectId)
      .limit(80),
    listClientVisibleSignals(sb, projectId, 12).catch(() => []),
    sb.from('client_moments')
      .select('id,title,token,created_at,revoked_at,expires_at')
      .eq('project_id', projectId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const evidence = (evidenceRes.data as any[]) ?? []
  const decisions = (decisionsRes.data as any[]) ?? []
  const assets = (assetsRes.data as any[]) ?? []
  const reports = (reportsRes.data as any[]) ?? []
  const tasks = (tasksRes.data as any[]) ?? []
  const moments = momentsRes.error ? [] : ((momentsRes.data as any[]) ?? [])

  const openDecisions = decisions.filter(d => isDecisionOpen(d.status))
  const blockedTasks = tasks.filter(t => {
    const s = String(t.status || '').toLowerCase()
    return s === 'blocked' || s === 'blocker'
  })
  const approvalTasks = tasks.filter(t => {
    const s = String(t.client_status || t.status || '').toLowerCase()
    return s.includes('waiting') || s.includes('approval') || s === 'review'
  })
  const clientEvidence = evidence.filter(e => e.client_visible)
  const latestReport = reports[0] || null

  const control = computeControlStatus({
    taskCount: tasks.length,
    blockedCount: blockedTasks.length,
    decisionCount: openDecisions.length,
    approvalCount: approvalTasks.length,
    hasReport: Boolean(latestReport),
    reportAgeDays: latestReport
      ? Math.floor((Date.now() - Date.parse(latestReport.created_at)) / 86_400_000)
      : null,
    phase: project.status,
    nextActionTitle: openDecisions[0]?.client_title || openDecisions[0]?.title || blockedTasks[0]?.title || null,
    clientVisibleEvidenceCount: clientEvidence.length,
  })

  const readiness = computeReportReadiness({
    reportContent: latestReport?.summary || latestReport?.content || '',
    blockedCount: blockedTasks.length,
    decisionCount: openDecisions.length,
    approvalCount: approvalTasks.length,
    clientVisibleEvidenceCount: clientEvidence.length,
  })

  const entries: ProjectTruthEntry[] = []

  for (const d of openDecisions.slice(0, 6)) {
    const title = clip(d.client_title || d.title || 'Entscheidung', 90)
    entries.push({
      id: `dec-${d.id}`,
      kind: 'decision',
      title,
      body: clip(d.client_summary || 'Wartet auf Freigabe, bevor die Lieferung weitergehen kann.', 160),
      occurredAt: d.updated_at || d.created_at,
      clientVisible: d.visible_to_client !== false,
      reportImpact: 'awaits',
      href: `/decisions?id=${d.id}`,
    })
  }

  for (const t of blockedTasks.slice(0, 4)) {
    entries.push({
      id: `blk-${t.id}`,
      kind: 'blocker',
      title: clip(t.title || 'Blocker', 90),
      body: 'Blockiert den Fortschritt — im Bericht ehrlich nennen.',
      occurredAt: t.updated_at || new Date().toISOString(),
      clientVisible: false,
      reportImpact: 'blocks',
    })
  }

  for (const e of evidence.slice(0, 10)) {
    const label = clampProofLabel(e.title || e.evidence_type || 'Beleg')
    entries.push({
      id: `ev-${e.id}`,
      kind: 'evidence',
      title: label,
      body: e.client_visible
        ? 'Kundensichtbarer Nachweis für den aktuellen Stand.'
        : 'Interner Beleg — noch nicht freigegeben für den Kunden.',
      occurredAt: e.created_at,
      clientVisible: Boolean(e.client_visible),
      reportImpact: e.client_visible ? 'supports' : 'informs',
      href: e.url || null,
      proof: e.client_visible
        ? {
            id: `ev-${e.id}`,
            label,
            kind: 'proof',
            occurredAt: e.created_at,
            href: e.url || null,
            strength: e.proof_strength || null,
          }
        : null,
    })
  }

  for (const a of assets.slice(0, 8)) {
    const visible = a.visibility === 'client_visible' || a.visibility === 'white_label_visible'
    const awaiting = String(a.status || '').includes('review') || a.status === 'pending_review'
    const analysis = (a.analysis_result || {}) as { summary?: string }
    entries.push({
      id: `asset-${a.id}`,
      kind: 'deliverable',
      title: clip(a.title || 'Lieferung', 90),
      body: clip(
        analysis.summary
          || (awaiting ? 'Wartet auf Freigabe.' : visible ? 'Lieferung für den Kunden sichtbar.' : 'Interne Lieferung.'),
        160,
      ),
      occurredAt: a.created_at,
      clientVisible: visible,
      reportImpact: awaiting ? 'awaits' : visible ? 'supports' : 'informs',
      href: a.external_url || a.preview_url || null,
      proof: visible
        ? {
            id: `asset-${a.id}`,
            label: clampProofLabel(a.title || 'Lieferung'),
            kind: 'deliverable',
            occurredAt: a.created_at,
            href: a.external_url || a.preview_url || null,
            strength: a.status === 'approved' ? 'verified' : 'strong',
          }
        : null,
    })
  }

  for (const s of signals.slice(0, 8)) {
    const cls = s.tagro_classification_json ?? {}
    const body = clip(
      cls.client_translation || cls.internal_summary || s.content || 'Projekt-Update',
      160,
    )
    entries.push({
      id: `sig-${s.id}`,
      kind: 'signal',
      title: clip(body, 90) || 'Update',
      body,
      occurredAt: s.created_at,
      clientVisible: true,
      reportImpact: 'informs',
    })
  }

  for (const r of reports.filter(x => x.visible_to_client).slice(0, 3)) {
    entries.push({
      id: `rep-${r.id}`,
      kind: 'report',
      title: clip(r.title || 'Statusbericht', 90),
      body: clip(r.summary || r.content || 'Kundensichtbarer Statusbericht.', 160),
      occurredAt: r.created_at,
      clientVisible: true,
      reportImpact: 'supports',
    })
  }

  for (const m of moments) {
    if (m.expires_at && Date.parse(m.expires_at) < Date.now()) continue
    entries.push({
      id: `mom-${m.id}`,
      kind: 'moment',
      title: clip(m.title || 'Client Moment', 90),
      body: 'Geteilter Lieferstand-Snapshot für den Kunden.',
      occurredAt: m.created_at,
      clientVisible: true,
      reportImpact: 'supports',
    })
  }

  entries.sort((a, b) => {
    const rank = (e: ProjectTruthEntry) =>
      (e.reportImpact === 'blocks' ? 4 : 0)
      + (e.reportImpact === 'awaits' ? 3 : 0)
      + (e.clientVisible ? 1 : 0)
    const rd = rank(b) - rank(a)
    if (rd !== 0) return rd
    return Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  })

  const proof = entries
    .map(e => e.proof)
    .filter((p): p is ProofCapsule => Boolean(p))
    .slice(0, 3)

  return {
    projectId: project.id,
    projectTitle: project.title,
    control,
    readiness,
    entries: entries.slice(0, 18),
    proof,
    openDecisionCount: openDecisions.length,
    pendingApprovalCount: approvalTasks.length,
    blockerCount: blockedTasks.length,
    clientVisibleEvidenceCount: clientEvidence.length,
    generatedAt: new Date().toISOString(),
  }
}
