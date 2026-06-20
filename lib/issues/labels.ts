import type { IssueSeverity, IssueStatus, IssueType } from '@/lib/issues/types'

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Verbesserung',
  security: 'Sicherheit',
  technical_debt: 'Technische Schuld',
  blocker: 'Blocker',
}

export const ISSUE_SEVERITY_LABEL: Record<IssueSeverity, string> = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
}

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Offen',
  in_progress: 'In Arbeit',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
  wont_fix: 'Wird nicht behoben',
}

export const ISSUE_SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#64748B',
}

export const ISSUE_STATUS_COLOR: Record<IssueStatus, string> = {
  open: '#2563EB',
  in_progress: '#7C3AED',
  resolved: '#16A34A',
  closed: '#64748B',
  wont_fix: '#94A3B8',
}
