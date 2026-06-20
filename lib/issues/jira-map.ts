import type { IssueSeverity, IssueStatus, IssueType } from '@/lib/issues/types'
import type { ConnectorIssue } from '@/lib/connectors/types'
import type { JiraAuth, JiraIssue } from '@/lib/jira/api'
import { jiraIssueUrl } from '@/lib/jira/api'

function labelNames(issue: JiraIssue): string[] {
  return (issue.fields.labels ?? []).map(l => String(l).toLowerCase()).filter(Boolean)
}

export function mapJiraIssueType(typeName: string | undefined, labels: string[]): IssueType {
  const t = (typeName ?? '').toLowerCase()
  if (t.includes('bug')) return 'bug'
  if (t.includes('story') || t.includes('feature') || t.includes('epic')) return 'feature'
  if (t.includes('improvement') || t.includes('enhancement')) return 'improvement'
  if (labels.some(l => l.includes('blocker'))) return 'blocker'
  if (labels.some(l => l.includes('security'))) return 'security'
  if (labels.some(l => l.includes('tech-debt'))) return 'technical_debt'
  return 'bug'
}

export function mapJiraSeverity(priorityName: string | undefined, labels: string[]): IssueSeverity {
  const p = (priorityName ?? '').toLowerCase()
  if (labels.some(l => ['critical', 'p0', 'blocker'].includes(l))) return 'critical'
  if (p.includes('highest') || p.includes('critical')) return 'critical'
  if (p.includes('high')) return 'high'
  if (p.includes('low') || p.includes('lowest')) return 'low'
  return 'medium'
}

export function mapJiraStatus(statusCategory: string | undefined, statusName: string): IssueStatus {
  const cat = (statusCategory ?? '').toLowerCase()
  const name = statusName.toLowerCase()
  if (cat === 'done') return 'resolved'
  if (cat === 'indeterminate' || name.includes('progress') || name.includes('review')) return 'in_progress'
  if (name.includes('wont') || name.includes("won't")) return 'wont_fix'
  if (name.includes('cancel') || name.includes('closed')) return 'closed'
  return 'open'
}

export function jiraIssueToConnectorIssue(issue: JiraIssue, auth: JiraAuth): ConnectorIssue {
  const labels = labelNames(issue)
  const typeName = issue.fields.issuetype?.name
  const statusName = issue.fields.status?.name ?? 'Open'

  return {
    externalId: issue.id,
    externalUrl: jiraIssueUrl(auth, issue.key),
    externalStatus: statusName,
    title: issue.fields.summary,
    description: typeof issue.fields.description === 'string'
      ? issue.fields.description.slice(0, 8000)
      : null,
    issue_type: mapJiraIssueType(typeName, labels),
    severity: mapJiraSeverity(issue.fields.priority?.name, labels),
    status: mapJiraStatus(issue.fields.status?.statusCategory?.key, statusName),
    source: 'jira',
    source_id: issue.id,
    source_url: jiraIssueUrl(auth, issue.key),
    labels: (issue.fields.labels ?? []).slice(0, 20),
    reporterExternalId: issue.fields.creator?.displayName ?? null,
    ownerExternalId: issue.fields.assignee?.displayName ?? null,
    updatedAt: issue.fields.updated ?? null,
    raw: issue as unknown as Record<string, unknown>,
  }
}
