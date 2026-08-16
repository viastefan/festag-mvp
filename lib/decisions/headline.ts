// ─────────────────────────────────────────────────────────────────────────────
// The Decisions headline — one editorial sentence generated from real state.
//
// It is never hard-coded copy: the counts come from the engine (open decisions
// the viewer can actually answer, total open, and the risk signals derived in
// lib/decisions/risks.ts). Clauses that would read as noise — "0 Notfall",
// "keine Risiken" — are dropped rather than rendered as zeroes.
//
// Structure mirrors the reference: a dark clause, then a muted clause, twice.
// ─────────────────────────────────────────────────────────────────────────────

import type { Decision, ProjectLite } from '@/components/decisions/decisions-shared'
import { isOpenDecisionStatus } from '@/components/decisions/decisions-shared'
import { deriveDecisionRisks } from '@/lib/decisions/risks'

export type HeadlineClause = { ink: string; muted: string }

export type DecisionHeadline = {
  /** "Treffen Sie heute mit Tagro" + "6 von 8 offenen Entscheidungen." */
  primary: HeadlineClause
  /** "Weiter haben wir" + "2 offene Risiken, 1 Notfall." — omitted when quiet. */
  secondary: HeadlineClause | null
}

export type HeadlineInput = {
  decisions: Decision[]
  projects: Record<string, ProjectLite>
  /** Decisions the viewer may actually answer — the "heute" part of the sentence. */
  actionable: number
}

function pluralDecisions(n: number): string {
  return n === 1 ? 'offene Entscheidung' : 'offene Entscheidungen'
}

export function buildDecisionHeadline({
  decisions,
  projects,
  actionable,
}: HeadlineInput): DecisionHeadline {
  const open = decisions.filter(d => isOpenDecisionStatus(d.status))
  const totalOpen = open.length

  if (totalOpen === 0) {
    return {
      primary: {
        ink: 'Alles entschieden.',
        muted: 'Tagro beobachtet das Projekt weiter.',
      },
      secondary: null,
    }
  }

  // The viewer can act on everything that is open → say it plainly instead of
  // "8 von 8", which reads like a progress bar rather than a sentence.
  const primary: HeadlineClause = actionable >= totalOpen
    ? {
        ink: 'Treffen Sie heute mit Tagro',
        muted: `${totalOpen} ${pluralDecisions(totalOpen)}.`,
      }
    : {
        ink: 'Treffen Sie heute mit Tagro',
        muted: `${actionable} von ${totalOpen} ${pluralDecisions(totalOpen)}.`,
      }

  const risks = deriveDecisionRisks(decisions, projects)
  const critical = risks.filter(r => r.severity === 'critical').length
  const nonCritical = risks.length - critical

  const clauses: string[] = []
  if (nonCritical > 0) {
    clauses.push(`${nonCritical} ${nonCritical === 1 ? 'offenes Risiko' : 'offene Risiken'}`)
  }
  if (critical > 0) {
    clauses.push(`${critical} ${critical === 1 ? 'Notfall' : 'Notfälle'}`)
  }

  return {
    primary,
    secondary: clauses.length > 0
      ? { ink: 'Weiter haben wir', muted: `${clauses.join(', ')}.` }
      : null,
  }
}
