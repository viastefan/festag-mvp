/**
 * Delivery Pulse — Tagro-compressed clarity for clients and CEOs.
 * Exactly three calm lines: progress, risk, next step.
 * Not a briefing, not a chat, not a PM dashboard.
 */

import type { ProofCapsule } from '@/lib/proof/types'

export type PulseHealth = 'healthy' | 'watch' | 'risk' | 'blocked'

export type PulseScope = 'overall' | 'project'

export type PulseSource = 'heuristic' | 'tagro' | 'cached'

/** @deprecated Prefer ProofCapsule from lib/proof/types — kept as alias. */
export type PulseProofCapsule = ProofCapsule

export type DeliveryPulse = {
  progress: string
  risk: string
  next_step: string
  health: PulseHealth
  confidence: number
  proof: ProofCapsule[]
  scope: PulseScope
  projectId: string | null
  projectTitle: string | null
  source: PulseSource
  generatedAt: string
}

export type ComposePulseInput = {
  scope: PulseScope
  projectId?: string | null
  projectTitle?: string | null
  health: PulseHealth
  headline?: string | null
  summary?: string | null
  progressPct?: number | null
  openIssues?: number
  criticalIssues?: number
  openDecisions?: number
  /** Client-safe decision titles waiting on the reader. */
  pendingDecisionTitles?: string[]
  /** Recent client-visible signal / activity lines. */
  recentSignals?: string[]
  /** Prefer evidence / deliverable capsules when available. */
  evidenceProof?: ProofCapsule[]
  /** Optional longer Tagro summary to compress. */
  tagroSummary?: string | null
  /** Optional next-steps from a status digest. */
  tagroNextSteps?: string[]
  /** Optional risks/blockers from a status digest. */
  tagroRisks?: string[]
  /** Optional completed work lines. */
  tagroCompleted?: string[]
}

export function emptyPulse(partial?: Partial<DeliveryPulse>): DeliveryPulse {
  return {
    progress: 'Noch keine Liefersignale — sobald Arbeit läuft, verdichtet Festag sie hier.',
    risk: 'Kein aktives Risiko erkannt.',
    next_step: 'Workspace verbinden oder erstes Projekt starten.',
    health: 'healthy',
    confidence: 0.35,
    proof: [],
    scope: 'overall',
    projectId: null,
    projectTitle: null,
    source: 'heuristic',
    generatedAt: new Date().toISOString(),
    ...partial,
  }
}

export function clampPulseLine(s: string, max = 140): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
