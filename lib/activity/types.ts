export type ActivityImpact = 'low' | 'medium' | 'high' | 'critical'
export type ActivityMeaning =
  | 'progress'
  | 'blocker'
  | 'risk'
  | 'decision_needed'
  | 'approval_needed'
  | 'scope_change'
  | 'quality_issue'
  | 'delay'
  | 'next_step'
  | 'internal_noise'
  | 'client_relevant'
  | 'issue'
  | 'task'
  | 'system'

export type ActivityFeedItem = {
  id: string
  source: 'work_signal' | 'issue' | 'legacy' | 'decision' | 'task'
  project_id: string | null
  project_title?: string | null
  kind: string
  title: string
  body?: string | null
  meaning?: ActivityMeaning | null
  impact?: ActivityImpact | null
  priority?: number | null
  risk?: boolean
  actor_role?: string | null
  created_at: string
  href?: string | null
}

export type ActivityFeedResponse = {
  items: ActivityFeedItem[]
  count: number
  unclassified_signals: number
}
