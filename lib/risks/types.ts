// ─────────────────────────────────────────────────────────────────────────────
// Risk Intelligence — canonical TypeScript types
//
// Mirrors supabase/migrations/20260814_risk_intelligence_v1.sql.
// API handlers, the detection engine, Tagro and every UI surface import here.
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_CATEGORIES = [
  'delivery',
  'technical',
  'scope',
  'budget',
  'quality',
  'dependency',
  'team',
  'client',
  'timeline',
  'other',
] as const
export type RiskCategory = (typeof RISK_CATEGORIES)[number]

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const RISK_STATUSES = [
  'detected',
  'active',
  'monitoring',
  'decision_required',
  'accepted',
  'mitigated',
  'resolved',
  'dismissed',
] as const
export type RiskStatus = (typeof RISK_STATUSES)[number]

export const RISK_SOURCES = [
  'tagro',
  'manual',
  'developer',
  'client',
  'github',
  'task',
  'timeline',
  'system',
] as const
export type RiskSource = (typeof RISK_SOURCES)[number]

/** The Maßnahme picked in the Risiko flow. */
export const RISK_RESPONSES = ['accept', 'mitigate', 'delegate', 'monitor'] as const
export type RiskResponse = (typeof RISK_RESPONSES)[number]

export const RISK_SIGNAL_SOURCE_TYPES = [
  'work_signal',
  'task',
  'decision',
  'github',
  'ci',
  'timeline',
  'client',
  'manual',
  'system',
] as const
export type RiskSignalSourceType = (typeof RISK_SIGNAL_SOURCE_TYPES)[number]

export const RISK_LINK_TARGETS = [
  'task',
  'decision',
  'milestone',
  'issue',
  'project',
  'status_report',
  'developer',
] as const
export type RiskLinkTarget = (typeof RISK_LINK_TARGETS)[number]

export const RISK_LINK_KINDS = [
  'affects',
  'blocks',
  'caused_by',
  'resolves',
  'originated_from',
] as const
export type RiskLinkKind = (typeof RISK_LINK_KINDS)[number]

/** Still needs attention. */
export const RISK_OPEN_STATUSES: ReadonlySet<RiskStatus> = new Set<RiskStatus>([
  'detected',
  'active',
  'monitoring',
  'decision_required',
])
export const RISK_OPEN_STATUS_LIST: RiskStatus[] = Array.from(RISK_OPEN_STATUSES)

/** Closed one way or another — no longer surfaced as attention. */
export const RISK_CLOSED_STATUSES: ReadonlySet<RiskStatus> = new Set<RiskStatus>([
  'mitigated',
  'resolved',
  'dismissed',
])

/**
 * Statuses that keep a fingerprint occupied. Detection upserts against these,
 * so a resolved risk whose signals return opens a fresh row (and a fresh
 * history) instead of resurrecting the old one.
 */
export const RISK_LIVE_STATUS_LIST: RiskStatus[] = [
  'detected',
  'active',
  'monitoring',
  'decision_required',
  'accepted',
]

export type Risk = {
  id: string
  project_id: string
  workspace_id?: string | null

  title: string
  description?: string | null
  client_title?: string | null
  client_summary?: string | null

  category: RiskCategory
  probability?: number | null
  impact: RiskLevel
  severity: RiskLevel
  confidence?: number | null
  status: RiskStatus
  source: RiskSource
  fingerprint?: string | null

  potential_delay_days?: number | null
  potential_cost?: number | null

  recommendation?: string | null
  recommendation_reason?: string | null

  response?: RiskResponse | null
  response_note?: string | null
  responded_by?: string | null
  responded_at?: string | null

  owner_id?: string | null
  decision_id?: string | null

  detected_at: string
  last_signal_at?: string | null
  signal_count: number

  resolved_at?: string | null
  resolution_note?: string | null
  dismissed_at?: string | null
  dismiss_reason?: string | null

  created_by?: string | null
  created_by_tagro: boolean
  created_at: string
  updated_at: string
}

export type RiskSignal = {
  id: string
  risk_id: string
  source_type: RiskSignalSourceType
  source_ref?: string | null
  source_external_id?: string | null
  dedupe_key: string
  label: string
  detail?: string | null
  weight: number
  occurrences: number
  metadata?: Record<string, unknown>
  occurred_at: string
  created_at: string
}

export type RiskLink = {
  id: string
  risk_id: string
  target_kind: RiskLinkTarget
  target_id: string
  link_kind: RiskLinkKind
  metadata?: Record<string, unknown>
  created_at: string
}

export type RiskEvent = {
  id: string
  risk_id: string
  event_type: string
  actor_user_id?: string | null
  actor_kind: 'user' | 'tagro' | 'system'
  from_status?: string | null
  to_status?: string | null
  summary: string
  payload?: Record<string, unknown>
  created_at: string
}

export type RiskSettings = {
  id: string
  workspace_id: string
  project_id?: string | null
  detect_risks: boolean
  detect_scope_changes: boolean
  detect_blockers: boolean
  sensitivity: 'low' | 'medium' | 'high'
  source_tasks: boolean
  source_developer: boolean
  source_github: boolean
  source_client: boolean
  source_timeline: boolean
  source_decisions: boolean
  autonomy: 'observe' | 'recommend' | 'assist' | 'act'
  action_permissions: Record<string, 'auto' | 'ask' | 'off'>
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export const DEFAULT_RISK_SETTINGS: Omit<
  RiskSettings,
  'id' | 'workspace_id' | 'created_at' | 'updated_at'
> = {
  project_id: null,
  detect_risks: true,
  detect_scope_changes: true,
  detect_blockers: true,
  sensitivity: 'medium',
  source_tasks: true,
  source_developer: true,
  source_github: true,
  source_client: true,
  source_timeline: true,
  source_decisions: true,
  autonomy: 'recommend',
  action_permissions: {},
  updated_by: null,
}

export type RiskCreateInput = {
  project_id: string
  title: string
  description?: string | null
  category?: RiskCategory
  impact?: RiskLevel
  probability?: number | null
  /** Convenience for the mobile flow, which speaks low/mid/high. */
  probability_level?: 'low' | 'medium' | 'high'
  status?: RiskStatus
  source?: RiskSource
  owner_id?: string | null
  potential_delay_days?: number | null
  recommendation?: string | null
  task_ids?: string[]
  decision_id?: string | null
}

export type RiskUpdateInput = Partial<
  Pick<
    Risk,
    | 'title'
    | 'description'
    | 'client_title'
    | 'client_summary'
    | 'category'
    | 'impact'
    | 'probability'
    | 'status'
    | 'owner_id'
    | 'potential_delay_days'
    | 'potential_cost'
    | 'recommendation'
    | 'recommendation_reason'
  >
>

/** The full object with its evidence and relations, as the detail views need it. */
export type RiskWithContext = Risk & {
  signals?: RiskSignal[]
  links?: RiskLink[]
  events?: RiskEvent[]
  project_title?: string | null
}

export function isOpenRiskStatus(status: string | null | undefined): boolean {
  return RISK_OPEN_STATUSES.has((status || 'detected') as RiskStatus)
}

export function isValidRiskCategory(v: string | null | undefined): v is RiskCategory {
  return !!v && RISK_CATEGORIES.includes(v as RiskCategory)
}

export function isValidRiskLevel(v: string | null | undefined): v is RiskLevel {
  return !!v && RISK_LEVELS.includes(v as RiskLevel)
}

export function isValidRiskStatus(v: string | null | undefined): v is RiskStatus {
  return !!v && RISK_STATUSES.includes(v as RiskStatus)
}

export function isValidRiskSource(v: string | null | undefined): v is RiskSource {
  return !!v && RISK_SOURCES.includes(v as RiskSource)
}

export function isValidRiskResponse(v: string | null | undefined): v is RiskResponse {
  return !!v && RISK_RESPONSES.includes(v as RiskResponse)
}

/** low/mid/high segment ↔ probability. The UI never shows raw decimals. */
export const PROBABILITY_BY_LEVEL: Record<'low' | 'medium' | 'high', number> = {
  low: 0.25,
  medium: 0.55,
  high: 0.8,
}

export function probabilityToLevel(p: number | null | undefined): 'low' | 'medium' | 'high' {
  const value = typeof p === 'number' ? p : 0.5
  if (value < 0.4) return 'low'
  if (value < 0.7) return 'medium'
  return 'high'
}
