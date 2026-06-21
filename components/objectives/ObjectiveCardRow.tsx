'use client'

import { WarningCircle } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'
import type { Objective } from '@/lib/objectives/types'

export type ProjectLite = {
  id: string
  title: string
  color?: string | null
}

export function fmtDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function objectiveStatusLabel(status: Objective['status']): string {
  return {
    active: 'Aktiv',
    completed: 'Abgeschlossen',
    paused: 'Pausiert',
    cancelled: 'Abgebrochen',
  }[status] ?? status
}

type Props = {
  objective: Objective
  project: ProjectLite | null
  isLast?: boolean
}

export default function ObjectiveCardRow({ objective, project, isLast }: Props) {
  return (
    <div
      className="dec-card"
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <span className="dec-card-title">{objective.title}</span>
          {project && <span className="dec-card-project">{project.title}</span>}
        </div>
        <span className="dec-card-type-pill">
          <span
            className="dec-card-dot"
            style={{ background: project?.color || '#64748b' }}
          />
          {objectiveStatusLabel(objective.status)}
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Warum</span>
          {objective.description ? (
            <ClampedTip text={objective.description} className="dec-card-muted" lines={2} />
          ) : (
            <span className="dec-card-muted">Kein Kontext</span>
          )}
        </div>
        <div className="dec-card-section">
          <span className="dec-card-label">Fortschritt</span>
          <span className="dec-card-muted">
            {objective.progress_pct}%
            {(objective.task_count ?? 0) > 0 && ` · ${objective.task_done ?? 0}/${objective.task_count} Tasks`}
          </span>
          <div className="obj-progress-bar" aria-hidden>
            <div className="obj-progress-fill" style={{ width: `${objective.progress_pct}%` }} />
          </div>
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Zieldatum</span>
          <span className="obj-target">{fmtDate(objective.target_date)}</span>
        </div>
        {objective.at_risk && (
          <span className="obj-risk-pill">
            <WarningCircle size={12} weight="fill" />
            Gefährdet
          </span>
        )}
      </div>
    </div>
  )
}
