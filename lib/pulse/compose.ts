/**
 * Heuristic Delivery Pulse composer — always returns exactly 3 calm lines.
 * Tagro may refine later; this path must work offline / without LLM.
 */

import {
  clampPulseLine,
  emptyPulse,
  type ComposePulseInput,
  type DeliveryPulse,
  type PulseHealth,
  type PulseProofCapsule,
} from '@/lib/pulse/types'
import { clampProofLabel } from '@/lib/proof/types'

function firstUseful(lines: Array<string | null | undefined>, max = 140): string {
  for (const raw of lines) {
    const t = clampPulseLine(String(raw || ''), max)
    if (t.length >= 12) return t
  }
  return ''
}

function healthFromCounts(input: ComposePulseInput): PulseHealth {
  if (input.health) return input.health
  if ((input.criticalIssues ?? 0) > 0) return 'blocked'
  if ((input.openDecisions ?? 0) > 0 || (input.openIssues ?? 0) >= 5) return 'risk'
  if ((input.openIssues ?? 0) > 0) return 'watch'
  return 'healthy'
}

function composeProgress(input: ComposePulseInput): string {
  const fromTagro = firstUseful([
    ...(input.tagroCompleted ?? []),
    input.tagroSummary,
    input.summary,
    input.headline,
  ])
  if (fromTagro) return fromTagro

  const pct = typeof input.progressPct === 'number' ? Math.round(input.progressPct) : null
  const title = input.projectTitle?.trim()
  if (pct != null && title) {
    return `${title} liegt bei etwa ${pct} Prozent Fortschritt — die Lieferung bewegt sich.`
  }
  if (pct != null) {
    return `Portfolio-Fortschritt bei etwa ${pct} Prozent — ohne Unterbrechung der Lieferung.`
  }
  if (title) {
    return `${title}: Arbeit läuft — Festag verdichtet die Signale zu Klarheit.`
  }
  return 'Die Lieferung läuft — Festag wartet auf frische Signale aus dem Workspace.'
}

function composeRisk(input: ComposePulseInput, health: PulseHealth): string {
  const fromTagro = firstUseful(input.tagroRisks ?? [])
  if (fromTagro) return fromTagro

  const critical = input.criticalIssues ?? 0
  const open = input.openIssues ?? 0
  const decisions = input.openDecisions ?? 0

  if (health === 'blocked' || critical > 0) {
    return critical > 1
      ? `${critical} kritische Punkte blockieren gerade den Fortschritt.`
      : 'Ein kritischer Punkt blockiert gerade den Fortschritt.'
  }
  if (decisions > 0) {
    const titled = input.pendingDecisionTitles?.[0]
    if (titled) {
      return `Offene Entscheidung: ${clampPulseLine(titled, 100)}`
    }
    return decisions === 1
      ? 'Eine Entscheidung steht aus und kann den Tempo-Verlust erklären.'
      : `${decisions} offene Entscheidungen können den Fortschritt bremsen.`
  }
  if (open > 0) {
    return open === 1
      ? 'Ein offenes Issue im Blick — noch kein Blocker.'
      : `${open} offene Issues im Blick — noch kein Blocker.`
  }
  if (health === 'watch') {
    return 'Ruhig, aber im Blick behalten — kleine Abweichungen ohne Blockade.'
  }
  return 'Kein aktives Risiko erkannt.'
}

function composeNext(input: ComposePulseInput): string {
  const fromTagro = firstUseful(input.tagroNextSteps ?? [])
  if (fromTagro) return fromTagro

  const pending = input.pendingDecisionTitles?.[0]
  if (pending) {
    return `Als Nächstes: ${clampPulseLine(pending, 110)} entscheiden.`
  }
  if ((input.openDecisions ?? 0) > 0) {
    return 'Als Nächstes die offene Entscheidung klären — dann geht die Lieferung weiter.'
  }
  if ((input.criticalIssues ?? 0) > 0) {
    return 'Als Nächstes den kritischen Punkt lösen — Status danach neu verdichten.'
  }
  const signal = firstUseful(input.recentSignals ?? [])
  if (signal) {
    return `Als Nächstes: ${clampPulseLine(signal, 110)}`
  }
  return 'Als Nächstes den aktuellen Statusbericht öffnen oder Tagro nach einer Verdichtung fragen.'
}

function buildProof(input: ComposePulseInput): PulseProofCapsule[] {
  const evidence = (input.evidenceProof ?? []).slice(0, 3)
  if (evidence.length > 0) return evidence

  const out: PulseProofCapsule[] = []
  for (const title of (input.pendingDecisionTitles ?? []).slice(0, 2)) {
    out.push({
      id: `dec-${out.length}`,
      label: clampProofLabel(title, 48),
      kind: 'decision',
    })
  }
  for (const s of (input.recentSignals ?? []).slice(0, 3 - out.length)) {
    out.push({
      id: `sig-${out.length}`,
      label: clampProofLabel(s, 48),
      kind: 'signal',
    })
  }
  if ((input.criticalIssues ?? 0) > 0 && out.length < 3) {
    out.push({
      id: 'iss-critical',
      label: `${input.criticalIssues} kritische Issues`,
      kind: 'issue',
    })
  }
  return out.slice(0, 3)
}

function confidenceFor(input: ComposePulseInput, health: PulseHealth): number {
  let c = 0.45
  if (input.tagroSummary) c += 0.2
  if ((input.tagroNextSteps?.length ?? 0) > 0) c += 0.1
  if ((input.recentSignals?.length ?? 0) > 0) c += 0.1
  if ((input.openDecisions ?? 0) + (input.openIssues ?? 0) > 0) c += 0.05
  if (health === 'blocked') c += 0.05
  return Math.min(0.92, Math.max(0.3, c))
}

export function composeDeliveryPulse(input: ComposePulseInput): DeliveryPulse {
  const health = healthFromCounts(input)
  const progress = composeProgress(input)
  const risk = composeRisk(input, health)
  const next_step = composeNext(input)

  if (!input.projectId && !input.projectTitle && !(input.openIssues || input.openDecisions || input.tagroSummary)) {
    return emptyPulse({
      scope: input.scope,
      projectId: input.projectId ?? null,
      projectTitle: input.projectTitle ?? null,
      health,
    })
  }

  return {
    progress,
    risk,
    next_step,
    health,
    confidence: confidenceFor(input, health),
    proof: buildProof(input),
    scope: input.scope,
    projectId: input.projectId ?? null,
    projectTitle: input.projectTitle ?? null,
    source: input.tagroSummary ? 'tagro' : 'heuristic',
    generatedAt: new Date().toISOString(),
  }
}
