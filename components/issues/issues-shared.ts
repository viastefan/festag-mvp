import type { Issue, IssueSeverity, IssueStatus, IssueType } from '@/lib/issues/types'
import { isOpenIssueStatus } from '@/lib/issues/types'
import {
  ISSUE_SEVERITY_LABEL,
  ISSUE_STATUS_LABEL,
  ISSUE_TYPE_LABEL,
  ISSUE_SEVERITY_COLOR,
} from '@/lib/issues/labels'

export type ProjectLite = {
  id: string
  title: string
  color?: string | null
  status?: string | null
  workspace_id?: string | null
}

export type LinkedTask = {
  id: string
  task_id: string
  link_kind: string
  task?: {
    id: string
    title: string
    status?: string | null
    dev_status?: string | null
    client_status?: string | null
    priority?: string | null
  } | null
}

export type { Issue }

export function fmtAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.round(d / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.round(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

export function issueTypeLabel(type: string | null | undefined): string {
  return ISSUE_TYPE_LABEL[(type || 'bug') as IssueType] || type || 'Bug'
}

export function issueSeverityLabel(severity: string | null | undefined): string {
  return ISSUE_SEVERITY_LABEL[(severity || 'medium') as IssueSeverity] || severity || 'Mittel'
}

export function issueStatusLabel(status: string | null | undefined): string {
  return ISSUE_STATUS_LABEL[(status || 'open') as IssueStatus] || status || 'Offen'
}

export function severityDotColor(severity: string | null | undefined): string {
  return ISSUE_SEVERITY_COLOR[(severity || 'medium') as IssueSeverity] || '#64748B'
}

export function isOpenIssue(issue: Pick<Issue, 'status'>): boolean {
  return isOpenIssueStatus(issue.status)
}

export function impactLine(issue: Issue): string | null {
  if (issue.tagro_summary?.trim()) return issue.tagro_summary.trim()
  if (issue.impact?.trim()) return issue.impact.trim()
  if (issue.description?.trim()) return issue.description.trim().slice(0, 160)
  return null
}

export const ISSUE_FILTERS = [
  { id: 'open', label: 'Offen' },
  { id: 'critical', label: 'Kritisch' },
  { id: 'resolved', label: 'Gelöst' },
  { id: 'all', label: 'Alle' },
] as const

export type IssueFilter = (typeof ISSUE_FILTERS)[number]['id']

export const ISSUE_TYPE_OPTIONS: Array<{ id: IssueType; label: string }> = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature' },
  { id: 'improvement', label: 'Verbesserung' },
  { id: 'security', label: 'Sicherheit' },
  { id: 'technical_debt', label: 'Technische Schuld' },
  { id: 'blocker', label: 'Blocker' },
]

export const ISSUE_SEVERITY_OPTIONS: Array<{ id: IssueSeverity; label: string }> = [
  { id: 'critical', label: 'Kritisch' },
  { id: 'high', label: 'Hoch' },
  { id: 'medium', label: 'Mittel' },
  { id: 'low', label: 'Niedrig' },
]

export const ISSUE_STATUS_OPTIONS: Array<{ id: IssueStatus; label: string }> = [
  { id: 'open', label: 'Offen' },
  { id: 'in_progress', label: 'In Arbeit' },
  { id: 'resolved', label: 'Gelöst' },
  { id: 'closed', label: 'Geschlossen' },
  { id: 'wont_fix', label: 'Wird nicht behoben' },
]
