import type { IssueSeverity, IssueStatus, IssueType } from '@/lib/issues/types'
import type { ConnectorIssue } from '@/lib/connectors/types'
import type { GhIssue } from '@/lib/github/api'

function labelNames(issue: GhIssue): string[] {
  return (issue.labels ?? []).map(l => String(l.name || '').toLowerCase()).filter(Boolean)
}

export function mapGitHubIssueType(labels: string[]): IssueType {
  if (labels.some(l => l.includes('blocker') || l === 'blocked')) return 'blocker'
  if (labels.some(l => l.includes('security') || l === 'vulnerability')) return 'security'
  if (labels.some(l => l.includes('tech-debt') || l.includes('technical debt'))) return 'technical_debt'
  if (labels.some(l => l.includes('bug'))) return 'bug'
  if (labels.some(l => l.includes('enhancement') || l.includes('feature'))) return 'feature'
  if (labels.some(l => l.includes('improvement'))) return 'improvement'
  return 'bug'
}

export function mapGitHubSeverity(labels: string[]): IssueSeverity {
  if (labels.some(l => ['critical', 'p0', 'sev-1', 'severity-critical'].includes(l))) return 'critical'
  if (labels.some(l => ['high', 'p1', 'sev-2', 'severity-high'].includes(l))) return 'high'
  if (labels.some(l => ['low', 'p3', 'sev-4', 'severity-low'].includes(l))) return 'low'
  return 'medium'
}

export function mapGitHubStatus(state: string, labels: string[]): IssueStatus {
  if (state === 'open') return 'open'
  if (labels.some(l => l.includes('wontfix') || l.includes("won't fix") || l === 'wont-fix')) return 'wont_fix'
  return 'resolved'
}

export function ghIssueToConnectorIssue(issue: GhIssue): ConnectorIssue {
  const labels = labelNames(issue)
  return {
    externalId: String(issue.number),
    externalUrl: issue.html_url,
    externalStatus: issue.state,
    title: issue.title,
    description: issue.body?.slice(0, 8000) || null,
    issue_type: mapGitHubIssueType(labels),
    severity: mapGitHubSeverity(labels),
    status: mapGitHubStatus(issue.state, labels),
    source: 'github',
    source_id: String(issue.number),
    source_url: issue.html_url,
    labels: (issue.labels ?? []).map(l => l.name).filter(Boolean).slice(0, 20),
    reporterExternalId: issue.user?.login ?? null,
    ownerExternalId: issue.assignee?.login ?? null,
    updatedAt: issue.updated_at,
    raw: issue as unknown as Record<string, unknown>,
  }
}
