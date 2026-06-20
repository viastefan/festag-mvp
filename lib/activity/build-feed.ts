import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityFeedItem, ActivityImpact, ActivityMeaning } from '@/lib/activity/types'
import type { WorkSignalClassification } from '@/lib/work-signals'
import { ISSUE_OPEN_STATUSES } from '@/lib/issues/types'

function impactFromMeaning(meaning?: ActivityMeaning | null): ActivityImpact {
  switch (meaning) {
    case 'blocker':
      return 'critical'
    case 'risk':
    case 'delay':
    case 'quality_issue':
      return 'high'
    case 'decision_needed':
    case 'approval_needed':
    case 'scope_change':
      return 'medium'
    default:
      return 'low'
  }
}

function priorityFromImpact(impact: ActivityImpact): number {
  return { critical: 100, high: 75, medium: 50, low: 25 }[impact]
}

function mapSignal(row: any, projectTitle?: string | null): ActivityFeedItem {
  const cls = (row.tagro_classification_json || {}) as WorkSignalClassification
  const meaning = (cls.meaning || 'internal_noise') as ActivityMeaning
  const impact = impactFromMeaning(meaning)
  const title = cls.internal_summary?.trim()
    || cls.client_translation?.trim()
    || row.content?.slice(0, 120)
    || row.type

  return {
    id: `ws:${row.id}`,
    source: 'work_signal',
    project_id: row.project_id,
    project_title: projectTitle ?? null,
    kind: row.type,
    title,
    body: row.content,
    meaning,
    impact,
    priority: priorityFromImpact(impact),
    risk: meaning === 'risk' || meaning === 'blocker' || meaning === 'delay',
    actor_role: row.source === 'slack' ? 'system' : 'dev',
    created_at: row.created_at,
    href: row.project_id ? `/project/${row.project_id}` : null,
  }
}

function mapIssue(row: any, projectTitle?: string | null): ActivityFeedItem {
  const open = ISSUE_OPEN_STATUSES.has(row.status)
  const meaning: ActivityMeaning = row.issue_type === 'blocker' ? 'blocker' : 'issue'
  const impact: ActivityImpact =
    row.severity === 'critical' ? 'critical'
      : row.severity === 'high' ? 'high'
        : open ? 'medium' : 'low'

  return {
    id: `issue:${row.id}`,
    source: 'issue',
    project_id: row.project_id,
    project_title: projectTitle ?? null,
    kind: row.issue_type,
    title: row.tagro_summary?.trim() || row.title,
    body: row.description,
    meaning,
    impact,
    priority: priorityFromImpact(impact),
    risk: open && (row.issue_type === 'blocker' || row.severity === 'critical'),
    actor_role: row.source === 'manual' ? 'dev' : 'system',
    created_at: row.updated_at || row.created_at,
    href: `/issues?open=${row.id}`,
  }
}

function mapLegacy(row: any, projectTitle?: string | null): ActivityFeedItem {
  return {
    id: `legacy:${row.id}`,
    source: 'legacy',
    project_id: row.project_id ?? null,
    project_title: projectTitle ?? row.projects?.title ?? null,
    kind: row.event_type || row.type || 'system',
    title: row.title || row.message || 'Aktivität',
    body: row.message,
    meaning: 'system',
    impact: 'low',
    priority: 20,
    risk: false,
    actor_role: row.actor_role || 'system',
    created_at: row.created_at,
    href: row.project_id ? `/project/${row.project_id}` : null,
  }
}

export async function buildActivityFeed(
  sb: SupabaseClient<any>,
  opts?: { projectId?: string; limit?: number },
): Promise<{ items: ActivityFeedItem[]; unclassified_signals: number }> {
  const limit = Math.min(opts?.limit ?? 80, 150)
  const perSource = Math.ceil(limit / 2)

  let signalQ = sb
    .from('work_signals')
    .select('*, projects(title)')
    .order('created_at', { ascending: false })
    .limit(perSource)

  let issueQ = sb
    .from('issues')
    .select('id,project_id,title,description,issue_type,severity,status,tagro_summary,source,updated_at,created_at, projects(title)')
    .order('updated_at', { ascending: false })
    .limit(Math.ceil(perSource / 2))

  let legacyQ = sb
    .from('activity_feed')
    .select('*, projects(title)')
    .order('created_at', { ascending: false })
    .limit(Math.ceil(perSource / 2))

  if (opts?.projectId) {
    signalQ = signalQ.eq('project_id', opts.projectId)
    issueQ = issueQ.eq('project_id', opts.projectId)
    legacyQ = legacyQ.eq('project_id', opts.projectId)
  }

  const [{ data: signals }, { data: issues }, legacyRes] = await Promise.all([
    signalQ,
    issueQ,
    legacyQ,
  ])

  const legacyRows = legacyRes.error ? [] : ((legacyRes.data as any[]) ?? [])
  const signalRows = (signals as any[]) ?? []
  const issueRows = (issues as any[]) ?? []

  const unclassified_signals = signalRows.filter(s => {
    const cls = s.tagro_classification_json || {}
    return !cls.meaning
  }).length

  const items: ActivityFeedItem[] = [
    ...signalRows.map(s => mapSignal(s, s.projects?.title)),
    ...issueRows.map(i => mapIssue(i, i.projects?.title)),
    ...legacyRows.map(l => mapLegacy(l, l.projects?.title)),
  ]

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    items: items.slice(0, limit),
    unclassified_signals,
  }
}
