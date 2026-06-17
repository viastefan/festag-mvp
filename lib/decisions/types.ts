// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — canonical TypeScript types
//
// Mirrors the Supabase schema set up by 20260527_decision_engine_v1.sql.
// API handlers, Tagro framing code, and UI surfaces all import from here.
//
// The decisions table carries both legacy columns (open / waiting_for_client
// statuses, options_json, etc.) and the v1 extension (state machine, response
// types, framing, delegation, audit). New code should write the v1 shape;
// legacy fields are read-only fallbacks for back-compat.
// ─────────────────────────────────────────────────────────────────────────────

// ── State machine ───────────────────────────────────────────────────────────

export const DECISION_STATES_V1 = [
  'drafted',
  'pending_client',
  'awaiting_clarification',
  'decided',
  'applied',
  'archived',
  'rejected',
  'expired',
  'superseded',
] as const

export const DECISION_STATES_LEGACY = [
  'open',
  'waiting_for_client',
  'in_progress',
  'closed',
] as const

export const DECISION_STATES = [...DECISION_STATES_V1, ...DECISION_STATES_LEGACY] as const
export type DecisionStatus = (typeof DECISION_STATES)[number]

// States that mean "still needs human attention".
export const DECISION_OPEN_STATES: ReadonlySet<DecisionStatus> = new Set<DecisionStatus>([
  'drafted',
  'pending_client',
  'awaiting_clarification',
  'open',
  'waiting_for_client',
  'in_progress',
])

/** For Supabase `.in('status', …)` filters — keep in sync with DECISION_OPEN_STATES. */
export const DECISION_OPEN_STATUS_LIST: DecisionStatus[] = Array.from(DECISION_OPEN_STATES)

// States that mean "resolved, no further action required".
export const DECISION_TERMINAL_STATES: ReadonlySet<DecisionStatus> = new Set<DecisionStatus>([
  'applied',
  'archived',
  'rejected',
  'expired',
  'superseded',
  'closed',
])


// ── Typology, response shape, authority ──────────────────────────────────────

export const DECISION_TYPES = [
  'scope',
  'budget',
  'direction',
  'approval',
  'risk_response',
  'tradeoff',
  'clarification',
  'escalation',
  'legal',
  'payment',
  'contract',
  'data_protection',
] as const
export type DecisionType = (typeof DECISION_TYPES)[number]

// Types where delegation to Tagro is forbidden — humans must decide.
export const DECISION_TYPES_NO_DELEGATE: ReadonlySet<DecisionType> = new Set<DecisionType>([
  'legal',
  'payment',
  'contract',
  'data_protection',
])

export const RESPONSE_TYPES = ['binary', 'single_choice', 'multi_choice', 'free_text'] as const
export type ResponseType = (typeof RESPONSE_TYPES)[number]

export const DECISION_AUTHORITIES = ['client', 'owner', 'client_and_owner', 'tagro_default'] as const
export type DecisionAuthority = (typeof DECISION_AUTHORITIES)[number]

export const URGENCIES = ['low', 'normal', 'high', 'critical'] as const
export type DecisionUrgency = (typeof URGENCIES)[number]


// ── v2 orchestration — reversibility, auto-resolve, due derivation ───────────

// Bezos door. Drives auto-resolve eligibility, delegation, and the default
// deliberation window.
export const REVERSIBILITIES = ['two_way_door', 'one_way_door', 'unknown'] as const
export type DecisionReversibility = (typeof REVERSIBILITIES)[number]

// What the engine may do at the deadline when still unanswered.
export const AUTO_RESOLVE_STRATEGIES = ['tagro_default', 'escalate_only', 'hold'] as const
export type AutoResolveStrategy = (typeof AUTO_RESOLVE_STRATEGIES)[number]

// How the engine derived due_at (recorded for legibility — never a black box).
export const EFFECTIVE_DUE_SOURCES = [
  'deadline_hard',
  'blocking_horizon',
  'deliberation_floor',
  'type_default',
] as const
export type EffectiveDueSource = (typeof EFFECTIVE_DUE_SOURCES)[number]

export function isReversibility(value: unknown): value is DecisionReversibility {
  return typeof value === 'string' && (REVERSIBILITIES as readonly string[]).includes(value)
}

export function isAutoResolveStrategy(value: unknown): value is AutoResolveStrategy {
  return typeof value === 'string' && (AUTO_RESOLVE_STRATEGIES as readonly string[]).includes(value)
}


// ── Response payload (jsonb shape) ───────────────────────────────────────────

export type DecisionResponseValue =
  | { selected_option_id: string }
  | { binary_value: 'yes' | 'no' }
  | { selected_option_ids: string[] }
  | { free_text: string }


// ── Option implications ──────────────────────────────────────────────────────

export type DecisionImpactScalar = 'unknown' | 'low' | 'medium' | 'high'

export type DecisionOptionImplications = {
  cost_delta?: number | DecisionImpactScalar
  time_delta_days?: number | DecisionImpactScalar
  risk_delta?: DecisionImpactScalar
  scope_delta?: 'narrows' | 'unchanged' | 'broadens'
  /** Guided client setup in an external tool (Stripe, Vercel, …). */
  external_handoff?: {
    provider?: string
    provider_label?: string
    url: string
    steps: Array<string | { title?: string; body: string }>
    open_label?: string
    confirm_label?: string
    note?: string
  }
}


// ── Row shapes ───────────────────────────────────────────────────────────────

export type DecisionRow = {
  id: string
  project_id: string
  source: string
  source_report_id: string | null
  source_task_id: string | null
  title: string
  description: string | null
  // Legacy unstructured options (still populated by older API path).
  options_json: Array<{ id: string; label: string; hint?: string }>
  recommended_option: string | null
  impact_summary: string | null
  status: DecisionStatus
  selected_option: string | null
  visible_to_client: boolean
  due_date: string | null
  created_by: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
  requested_for: string | null
  urgency: DecisionUrgency
  notification_channels: string[]
  notified_at: string | null
  tagro_reasoning: string | null
  tagro_run_at: string | null
  decision_note: string | null

  // v1 extension
  client_title: string | null
  client_summary: string | null
  internal_title: string | null
  internal_description: string | null
  tagro_recommendation_reason: string | null
  tagro_confidence_in_framing: number | null
  decision_type: DecisionType
  response_type: ResponseType
  authority: DecisionAuthority
  delegate_allowed: boolean
  response_value: DecisionResponseValue | null
  rationale: string | null
  tagro_delegation_reason: string | null
  override_window_until: string | null
  applied_at: string | null
  superseded_by: string | null
  archived_at: string | null
  created_by_tagro: boolean
  deadline_hard: string | null
  approved_by_owner: string | null
  approved_by_owner_at: string | null

  // v2 orchestration — classification + scheduling (engine-derived where noted)
  reversibility: DecisionReversibility
  auto_resolve_strategy: AutoResolveStrategy
  lead_time_days: number
  deliberation_hours: number | null
  cost_of_delay_per_day: number | null
  blocking_horizon: string | null
  surfaced_at: string | null            // engine: when it became visible to the decider
  due_at: string | null                 // engine: derived deadline
  effective_due_source: EffectiveDueSource | null  // engine
  auto_resolve_at: string | null        // engine: when it acts on silence
  urgency_score: number                 // engine: 0..100
  escalation_level: number              // engine: 0 fresh · 1 reminded · 2 escalated · 3 auto/locked
  reminder_count: number                // engine
  last_reminded_at: string | null       // engine
  next_reminder_at: string | null       // engine
  queued: boolean                       // engine: held back by the open-decision cap
}

export type DecisionOptionRow = {
  id: string
  decision_id: string
  ordinal: number
  external_id: string | null
  label: string
  client_label: string | null
  description: string | null
  technical_notes: string | null
  implications_json: DecisionOptionImplications
  recommended_by_tagro: boolean
  created_at: string
}

export type DecisionEventKind =
  | 'created'
  | 'framed'
  | 'published'
  | 'clarification_requested'
  | 'clarification_resolved'
  | 'decided'
  | 'delegated_to_tagro'
  | 'overridden'
  | 'applied'
  | 'superseded'
  | 'expired'
  | 'archived'
  | 'rejected'
  | 'reopened'
  | 'option_added'
  | 'option_removed'
  | 'recommendation_set'
  | 'status_change'

export type DecisionActorKind = 'user' | 'tagro' | 'system'

export type DecisionEventRow = {
  id: string
  decision_id: string
  event_type: DecisionEventKind
  actor_user_id: string | null
  actor_kind: DecisionActorKind
  from_status: DecisionStatus | null
  to_status: DecisionStatus | null
  payload: Record<string, unknown>
  created_at: string
}

export type DecisionLinkKind = 'blocks' | 'affects' | 'originated_from' | 'resolves'
export type DecisionLinkTargetKind = 'task' | 'status_report' | 'message' | 'blocker' | 'milestone'

export type DecisionLinkRow = {
  id: string
  decision_id: string
  target_kind: DecisionLinkTargetKind
  target_id: string
  link_kind: DecisionLinkKind
  metadata: Record<string, unknown>
  created_at: string
}


// ── Validators (lightweight, no zod dep) ─────────────────────────────────────

export function isDecisionStatus(value: unknown): value is DecisionStatus {
  return typeof value === 'string' && (DECISION_STATES as readonly string[]).includes(value)
}

export function isDecisionType(value: unknown): value is DecisionType {
  return typeof value === 'string' && (DECISION_TYPES as readonly string[]).includes(value)
}

export function isResponseType(value: unknown): value is ResponseType {
  return typeof value === 'string' && (RESPONSE_TYPES as readonly string[]).includes(value)
}

export function isDecisionAuthority(value: unknown): value is DecisionAuthority {
  return typeof value === 'string' && (DECISION_AUTHORITIES as readonly string[]).includes(value)
}

export function isUrgency(value: unknown): value is DecisionUrgency {
  return typeof value === 'string' && (URGENCIES as readonly string[]).includes(value)
}

export function delegateAllowedFor(type: DecisionType): boolean {
  return !DECISION_TYPES_NO_DELEGATE.has(type)
}

// Validates a response_value payload against the declared response_type.
// Returns a normalized value or null when the payload doesn't match.
export function normalizeResponseValue(
  responseType: ResponseType,
  raw: unknown,
): DecisionResponseValue | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  switch (responseType) {
    case 'binary':
      return v.binary_value === 'yes' || v.binary_value === 'no'
        ? { binary_value: v.binary_value }
        : null
    case 'single_choice':
      return typeof v.selected_option_id === 'string' && v.selected_option_id.length > 0
        ? { selected_option_id: v.selected_option_id }
        : null
    case 'multi_choice': {
      const ids = Array.isArray(v.selected_option_ids)
        ? v.selected_option_ids.filter((x): x is string => typeof x === 'string')
        : null
      return ids && ids.length > 0 ? { selected_option_ids: ids } : null
    }
    case 'free_text':
      return typeof v.free_text === 'string' && v.free_text.trim().length > 0
        ? { free_text: v.free_text.trim().slice(0, 4000) }
        : null
    default:
      return null
  }
}


// ── Helpers used by surfaces ─────────────────────────────────────────────────

export function isDecisionOpen(status: DecisionStatus): boolean {
  return DECISION_OPEN_STATES.has(status)
}

export function isDecisionResolved(status: DecisionStatus): boolean {
  return DECISION_TERMINAL_STATES.has(status)
}

// Default authority for a given decision type. Used when the API caller
// doesn't specify one explicitly.
export function defaultAuthorityFor(type: DecisionType): DecisionAuthority {
  switch (type) {
    case 'legal':
    case 'payment':
    case 'contract':
    case 'data_protection':
      return 'owner'
    case 'budget':
    case 'escalation':
    case 'risk_response':
      return 'client_and_owner'
    case 'scope':
    case 'approval':
    case 'direction':
    case 'tradeoff':
    case 'clarification':
    default:
      return 'client'
  }
}

// Default Bezos door for a type, per the classification matrix (docs §2).
// `scope` and `risk_response` are `depends` — the framer must inspect option
// implications; we return the safe default (one_way) until it does.
export function defaultReversibilityFor(type: DecisionType): DecisionReversibility {
  switch (type) {
    case 'direction':
    case 'tradeoff':
    case 'approval':
    case 'clarification':
      return 'two_way_door'
    case 'legal':
    case 'contract':
    case 'payment':
    case 'data_protection':
    case 'budget':
      return 'one_way_door'
    case 'scope':
    case 'risk_response':
    case 'escalation':
    default:
      return 'one_way_door' // safe default; framer refines `depends` cases
  }
}

// Default auto-resolve strategy, per the matrix. Only reversible direction/
// tradeoff decisions are eligible for tagro_default; compliance types hold.
export function defaultAutoResolveStrategyFor(type: DecisionType): AutoResolveStrategy {
  switch (type) {
    case 'direction':
    case 'tradeoff':
      return 'tagro_default'
    case 'payment':
    case 'contract':
    case 'legal':
    case 'data_protection':
      return 'hold'
    default:
      return 'escalate_only'
  }
}
