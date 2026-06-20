'use client'

import { WarningCircle } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'
import type { Issue, ProjectLite } from '@/components/issues/issues-shared'
import {
  fmtAgo,
  impactLine,
  issueSeverityLabel,
  issueStatusLabel,
  issueTypeLabel,
  isOpenIssue,
  severityDotColor,
} from '@/components/issues/issues-shared'

type Props = {
  issue: Issue
  project: ProjectLite | null
  isLast?: boolean
  onOpen: (id: string) => void
}

export default function IssueCardRow({ issue, project, isLast, onOpen }: Props) {
  const impactText = impactLine(issue)
  const open = isOpenIssue(issue)

  return (
    <button
      type="button"
      className="dec-card"
      style={isLast ? { borderBottom: 'none' } : undefined}
      onClick={() => onOpen(issue.id)}
    >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <span className="dec-card-title">{issue.title}</span>
          {project && <span className="dec-card-project">{project.title}</span>}
        </div>
        <span className="dec-card-type-pill">
          <span
            className="dec-card-dot"
            style={{ background: severityDotColor(issue.severity) }}
          />
          {issueTypeLabel(issue.issue_type)}
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Auswirkung</span>
          {impactText ? (
            <ClampedTip text={impactText} className="dec-card-muted" lines={2} />
          ) : (
            <span className="dec-card-muted">Keine Beschreibung</span>
          )}
        </div>
        {issue.source !== 'manual' && (
          <div className="dec-card-section">
            <span className="dec-card-label">Quelle</span>
            <span className="dec-card-muted">{issue.source}{issue.source_id ? ` · #${issue.source_id}` : ''}</span>
          </div>
        )}
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Status</span>
          <span className="dec-card-muted">{issueStatusLabel(issue.status)}</span>
        </div>
        <span className="dec-card-prio-pill">
          <span
            className="dec-card-dot dec-card-dot--prio"
            style={{ ['--dec-dot-color' as string]: severityDotColor(issue.severity) }}
          />
          {issueSeverityLabel(issue.severity)}
          {(issue.severity === 'critical' || issue.severity === 'high') && open && (
            <WarningCircle size={12} weight="fill" className="dec-card-prio-warn" />
          )}
        </span>
      </div>

      <div className="dec-card-actions">
        <span className="dec-card-muted">{fmtAgo(issue.updated_at || issue.created_at)}</span>
      </div>
    </button>
  )
}
