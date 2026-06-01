// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — signals, intents, framed shape
//
// Pipeline:
//   Signal       — typed input observed by the system (a blocker, a vague
//                  task, a status-report question, an explicit dev request).
//   Intent       — output of detect(): "yes, a decision is needed here, and
//                  here is what the dev meant in raw language".
//   FramedDec    — output of frame(): both client-safe and internal
//                  language, structured options with implications, a Veyra
//                  recommendation. Ready to persist.
//
// Detection and framing are split so framing can be re-run independently
// (re-framing after clarification, regenerating with a different model).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DecisionAuthority,
  DecisionLinkTargetKind,
  DecisionOptionImplications,
  DecisionType,
  DecisionUrgency,
  ResponseType,
} from './types'

// ── Signals ──────────────────────────────────────────────────────────────────

export type DecisionSignal =
  | {
      kind: 'vague_task'
      projectId: string
      taskId: string
      title: string
      description: string | null
      acceptanceCriteria: string[]
      taskType?: string | null
    }
  | {
      kind: 'blocker'
      projectId: string
      taskId: string
      blockerReason: string
      taskTitle: string
    }
  | {
      kind: 'dev_request'
      projectId: string
      taskId?: string
      authorUserId: string | null
      question: string
      suggestedOptions?: string[]
      suggestedResponseType?: ResponseType
      suggestedDecisionType?: DecisionType
      // Devs can hint urgency; engine respects it.
      urgency?: DecisionUrgency
    }
  | {
      kind: 'scope_drift'
      projectId: string
      observation: string
      affectedTaskIds: string[]
      severity: 'medium' | 'high' | 'critical'
    }
  | {
      kind: 'risk_threshold'
      projectId: string
      riskDescription: string
      severity: 'medium' | 'high' | 'critical'
    }
  | {
      kind: 'status_report'
      projectId: string
      reportId: string
      openQuestion: string
      excerpt?: string
    }

export type DecisionSignalKind = DecisionSignal['kind']


// ── Intent ──────────────────────────────────────────────────────────────────

export type DecisionIntent = {
  projectId: string
  decisionType: DecisionType
  urgency: DecisionUrgency
  // Where this intent came from. `id` references the originating row when
  // applicable (task id, report id, etc).
  origin: {
    kind: DecisionSignalKind
    id: string | null
    reason: string
  }
  // Dev-language seed — what the dev (or the heuristic) actually said.
  // The framer rewrites this into both internal and client form.
  rawTitle: string
  rawQuestion: string
  rawOptionSeeds?: string[]
  // Hints the detector can pass to the framer when it has strong evidence.
  hints?: {
    responseType?: ResponseType
    authority?: DecisionAuthority
    suggestedRecommendation?: string
  }
  // Forward links the persistence step writes into decision_links.
  blocks?: Array<{ kind: DecisionLinkTargetKind; id: string }>
  affects?: Array<{ kind: DecisionLinkTargetKind; id: string }>
  // Full signal preserved for audit (decision_events.payload).
  signal: DecisionSignal
}


// ── Framed decision (ready to persist) ──────────────────────────────────────

export type FramedDecisionOption = {
  label: string
  clientLabel: string
  description?: string
  technicalNotes?: string
  implications: DecisionOptionImplications
  recommendedByVeyra: boolean
}

export type FramedDecision = {
  intent: DecisionIntent
  internalTitle: string
  internalDescription: string
  clientTitle: string
  clientSummary: string
  tagroReasoning: string
  tagroRecommendationReason: string | null
  tagroConfidenceInFraming: number
  decisionType: DecisionType
  responseType: ResponseType
  authority: DecisionAuthority
  delegateAllowed: boolean
  urgency: DecisionUrgency
  options: FramedDecisionOption[]
  // Model used for framing — 'heuristic' when the LLM path was skipped.
  model: string
  // Status the persistence layer should write. Almost always
  // 'pending_client' for fresh framings; 'drafted' when we need a human
  // (owner) to review the framing before publishing.
  initialStatus: 'pending_client' | 'drafted'
}
