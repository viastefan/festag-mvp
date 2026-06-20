// ─────────────────────────────────────────────────────────────────────────────
// Issue Management — canonical TypeScript types
//
// Mirrors supabase/migrations/20260620_issues_system_v1.sql.
// API handlers, Tagro intelligence, and UI surfaces import from here.
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_TYPES = [
  'bug',
  'feature',
  'improvement',
  'security',
  'technical_debt',
  'blocker',
] as const
export type IssueType = (typeof ISSUE_TYPES)[number]

export const ISSUE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number]

export const ISSUE_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
  'wont_fix',
] as const
export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export const ISSUE_SOURCES = [
  'manual',
  'github',
  'jira',
  'linear',
  'clickup',
  'ai',
] as const
export type IssueSource = (typeof ISSUE_SOURCES)[number]

export const ISSUE_TASK_LINK_KINDS = [
  'blocks',
  'related',
  'duplicates',
  'caused_by',
] as const
export type IssueTaskLinkKind = (typeof ISSUE_TASK_LINK_KINDS)[number]

/** States that still need attention in operational views. */
export const ISSUE_OPEN_STATUSES: ReadonlySet<IssueStatus> = new Set<IssueStatus>([
  'open',
  'in_progress',
])

export const ISSUE_OPEN_STATUS_LIST: IssueStatus[] = Array.from(ISSUE_OPEN_STATUSES)

export const ISSUE_TERMINAL_STATUSES: ReadonlySet<IssueStatus> = new Set<IssueStatus>([
  'resolved',
  'closed',
  'wont_fix',
])

export type Issue = {
  id: string
  project_id: string
  workspace_id?: string | null
  title: string
  description?: string | null
  issue_type: IssueType
  severity: IssueSeverity
  status: IssueStatus
  impact?: string | null
  owner?: string | null
  reporter?: string | null
  source: IssueSource
  source_id?: string | null
  source_url?: string | null
  labels?: string[]
  tagro_summary?: string | null
  tagro_confidence?: number | null
  created_by?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export type IssueTaskLink = {
  id: string
  issue_id: string
  task_id: string
  link_kind: IssueTaskLinkKind
  created_at: string
}

export type IssueCreateInput = {
  project_id: string
  title: string
  description?: string | null
  issue_type?: IssueType
  severity?: IssueSeverity
  status?: IssueStatus
  impact?: string | null
  owner?: string | null
  labels?: string[]
  source?: IssueSource
  source_id?: string | null
  source_url?: string | null
  task_ids?: string[]
}

export type IssueUpdateInput = Partial<
  Pick<
    Issue,
    | 'title'
    | 'description'
    | 'issue_type'
    | 'severity'
    | 'status'
    | 'impact'
    | 'owner'
    | 'labels'
    | 'tagro_summary'
    | 'tagro_confidence'
  >
>

export function isOpenIssueStatus(status: string | null | undefined): boolean {
  return ISSUE_OPEN_STATUSES.has((status || 'open') as IssueStatus)
}

export function isValidIssueType(value: string | undefined | null): value is IssueType {
  return !!value && ISSUE_TYPES.includes(value as IssueType)
}

export function isValidIssueSeverity(value: string | undefined | null): value is IssueSeverity {
  return !!value && ISSUE_SEVERITIES.includes(value as IssueSeverity)
}

export function isValidIssueStatus(value: string | undefined | null): value is IssueStatus {
  return !!value && ISSUE_STATUSES.includes(value as IssueStatus)
}

export function isValidIssueSource(value: string | undefined | null): value is IssueSource {
  return !!value && ISSUE_SOURCES.includes(value as IssueSource)
}
