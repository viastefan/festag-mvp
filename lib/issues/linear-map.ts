import type { IssueSeverity, IssueStatus, IssueType } from '@/lib/issues/types'
import type { ConnectorIssue } from '@/lib/connectors/types'
import type { LinearIssue } from '@/lib/linear/api'

function labelNames(issue: LinearIssue): string[] {
  return (issue.labels?.nodes ?? []).map(l => String(l.name || '').toLowerCase()).filter(Boolean)
}

export function mapLinearIssueType(labels: string[], title: string): IssueType {
  const hay = `${labels.join(' ')} ${title}`.toLowerCase()
  if (labels.some(l => l.includes('blocker')) || hay.includes('blocker')) return 'blocker'
  if (labels.some(l => l.includes('security')) || hay.includes('security')) return 'security'
  if (labels.some(l => l.includes('tech-debt')) || hay.includes('tech debt')) return 'technical_debt'
  if (labels.some(l => l.includes('bug')) || hay.includes('bug')) return 'bug'
  if (labels.some(l => l.includes('feature')) || hay.includes('feature')) return 'feature'
  if (labels.some(l => l.includes('improvement'))) return 'improvement'
  return 'bug'
}

export function mapLinearSeverity(priority: number, labels: string[]): IssueSeverity {
  if (labels.some(l => ['critical', 'p0', 'urgent'].includes(l))) return 'critical'
  if (priority === 1) return 'critical'
  if (priority === 2) return 'high'
  if (priority === 4) return 'low'
  return 'medium'
}

export function mapLinearStatus(stateType: string, stateName: string): IssueStatus {
  const type = stateType.toLowerCase()
  const name = stateName.toLowerCase()
  if (type === 'completed') return 'resolved'
  if (type === 'canceled') return name.includes('wont') ? 'wont_fix' : 'closed'
  if (type === 'started') return 'in_progress'
  return 'open'
}

export function linearIssueToConnectorIssue(issue: LinearIssue): ConnectorIssue {
  const labels = labelNames(issue)
  const labelDisplay = (issue.labels?.nodes ?? []).map(l => l.name).filter(Boolean).slice(0, 20)

  return {
    externalId: issue.id,
    externalUrl: issue.url,
    externalStatus: issue.state?.name ?? null,
    title: issue.title,
    description: issue.description?.slice(0, 8000) || null,
    issue_type: mapLinearIssueType(labels, issue.title),
    severity: mapLinearSeverity(issue.priority, labels),
    status: mapLinearStatus(issue.state?.type ?? 'unstarted', issue.state?.name ?? ''),
    source: 'linear',
    source_id: issue.id,
    source_url: issue.url,
    labels: labelDisplay,
    reporterExternalId: issue.creator?.displayName ?? null,
    ownerExternalId: issue.assignee?.displayName ?? null,
    updatedAt: issue.updatedAt,
    raw: issue as unknown as Record<string, unknown>,
  }
}
