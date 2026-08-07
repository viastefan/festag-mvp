/**
 * Tagro Intelligence — shared types.
 *
 * The Efficiency Engine is internal. Nothing here is a user-facing label:
 * the product surface speaks about "Projekt läuft effizient", never about
 * scores, credits or tokens.
 */

/** How a recommendation was handled by the humans in the loop. */
export type DecisionAcceptance =
  | 'accepted'      // taken as recommended
  | 'modified'      // accepted, but the human changed the option
  | 'dev_override'  // developer replaced it during implementation
  | 'rejected'      // recommendation declined outright

/**
 * Measurable facts collected over a decision's lifecycle. Never entered by
 * hand — every field is derived from real project events.
 */
export type DecisionSignals = {
  acceptance: DecisionAcceptance
  /** Decision was later replaced by a different choice. */
  reverted?: boolean
  /** Customer-requested revisions traced back to this decision. */
  revisions?: number
  /** Bugs traced back to this decision. */
  bugs?: number
  /** Delay of the dependent work, in days. Negative = ahead of plan. */
  delayDays?: number
  /** Customer satisfaction, 1–5. Omit when not surveyed. */
  satisfaction?: number
  /** Follow-up questions this decision triggered. */
  followUpQuestions?: number
}

export type DecisionOutcome = {
  decisionId: string
  /** 0–100. Higher is better. */
  score: number
  /** Per-component sub-scores, 0–1 — used to explain the result. */
  parts: Record<string, number>
  /** Plain-language explanation, ready for the calm UI. */
  summary: string
}

/** A decision as it enters the project-level roll-up. */
export type ScoredDecision = {
  decisionId: string
  /** Free-form category, e.g. "security", "hosting", "design". */
  category: string
  score: number
}

export type ProjectWisdom = {
  /** 0–100, weighted by decision importance. */
  score: number
  decisionCount: number
  /** Categories that dragged the score down, most severe first. */
  weakest: Array<{ category: string; score: number }>
}

export type ProjectDNA = {
  industry?: string
  projectType?: string
  stack?: string[]
  designStyle?: string
  brandDirection?: string
  architecture?: string
  hosting?: string
  framework?: string
}

export type ProjectRecord = {
  projectId: string
  dna: ProjectDNA
  wisdomScore: number
  satisfaction?: number
  deliveryDays?: number
  revisionCount?: number
  bugCount?: number
}

/** A combination of decisions that repeatedly produced a given outcome. */
export type DecisionPattern = {
  /** Sorted, normalised decision values, e.g. ["next.js","supabase"]. */
  key: string[]
  outcomeScore: number
  sampleSize: number
}
