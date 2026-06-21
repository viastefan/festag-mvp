'use client'

import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'

type Props = {
  task: { id: string; title: string; priority?: string | null; project_id?: string | null }
  projectTitle: string
  projectColor?: string | null
  assigneeName: string
  statusLabel: string
  updatedLabel: string
  isLast?: boolean
}

export default function TeamTaskCardRow({
  task,
  projectTitle,
  projectColor,
  assigneeName,
  statusLabel,
  updatedLabel,
  isLast,
}: Props) {
  const href = `/tasks?open=${task.id}${task.project_id ? `&project=${task.project_id}` : ''}`

  return (
    <Link
      href={href}
      className="dec-card team-panel-row"
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <p className="dec-card-title">{task.title}</p>
          <p className="dec-card-project">{task.priority || 'Keine Priorität'}</p>
        </div>
        <span className="dec-card-type-pill">
          <span className="dec-card-dot" style={{ background: projectColor || '#94a3b8' }} />
          Task
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Projekt</span>
          <ClampedTip text={projectTitle} className="dec-card-muted" lines={1} />
        </div>
        <div className="dec-card-section">
          <span className="dec-card-label">Verantwortlich</span>
          <ClampedTip text={assigneeName} className="dec-card-muted" lines={1} />
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Status</span>
          <span className="dec-card-muted">{statusLabel}</span>
        </div>
        <span className="dec-card-prio-pill">{updatedLabel}</span>
      </div>

      <div className="dec-card-actions team-panel-arrow">
        <ArrowRight size={16} />
      </div>
    </Link>
  )
}
