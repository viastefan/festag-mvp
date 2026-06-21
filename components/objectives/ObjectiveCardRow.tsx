'use client'

import { WarningCircle } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'
import type { Objective } from '@/lib/objectives/types'
import {
  fmtAgo,
  fmtDate,
  objectiveStatusLabel,
  type ProjectLite,
} from '@/components/objectives/objectives-shared'

export type { ProjectLite }

type Props = {
  objective: Objective
  project: ProjectLite | null
  isLast?: boolean
  onOpen: (id: string) => void
}

export default function ObjectiveCardRow({ objective, project, isLast, onOpen }: Props) {
  return (
    <div>
      <button
        type="button"
        className="dec-card"
        onClick={() => onOpen(objective.id)}
        aria-label={`${objective.title} — Details öffnen`}
      >
        <div className="dec-card-left">
          <div className="dec-card-title-block">
            <p className="dec-card-title">{objective.title}</p>
            {project && <p className="dec-card-project">{project.title}</p>}
          </div>
          <span
            className="dec-card-type-pill"
            style={{ ['--dec-dot-color' as string]: project?.color || '#64748b' }}
          >
            <span className="dec-card-dot" aria-hidden />
            {objectiveStatusLabel(objective.status)}
          </span>
        </div>

        <div className="dec-card-mid">
          <div className="dec-card-section">
            <p className="dec-card-label">Warum</p>
            {objective.description ? (
              <ClampedTip text={objective.description} className="dec-card-muted" lines={2} />
            ) : (
              <p className="dec-card-muted">Kein Kontext</p>
            )}
          </div>
          <div className="dec-card-section">
            <p className="dec-card-label">Fortschritt</p>
            <p className="dec-card-muted">
              {objective.progress_pct}%
              {(objective.task_count ?? 0) > 0 && ` · ${objective.task_done ?? 0}/${objective.task_count} Tasks`}
            </p>
            <div className="obj-progress-bar" aria-hidden>
              <div className="obj-progress-fill" style={{ width: `${objective.progress_pct}%` }} />
            </div>
          </div>
        </div>

        <div className="dec-card-meta">
          <div className="dec-card-section">
            <p className="dec-card-label">Zieldatum</p>
            <p className="dec-card-muted">{fmtDate(objective.target_date)}</p>
          </div>
          {objective.at_risk ? (
            <span className="obj-risk-pill">
              <WarningCircle size={12} weight="fill" />
              Gefährdet
            </span>
          ) : (
            <span className="dec-card-prio-pill">
              <span
                className="dec-card-dot dec-card-dot--prio"
                style={{ ['--dec-dot-color' as string]: project?.color || '#64748b' }}
              />
              {objective.progress_pct}%
            </span>
          )}
        </div>

        <div className="dec-card-actions">
          <span className="dec-card-muted">{fmtAgo(objective.updated_at)}</span>
        </div>
      </button>
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
