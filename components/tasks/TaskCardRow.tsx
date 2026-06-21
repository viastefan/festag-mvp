'use client'

import { Check } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'
import type { ProjectRow, TaskRow } from '@/components/tasks/tasks-shared'
import {
  dateLabel,
  priorityLabel,
  sourceLabel,
  taskBucket,
  taskProgress,
  taskStatusDotColor,
  taskStatusHint,
  taskStatusLabel,
  taskSummary,
} from '@/components/tasks/tasks-shared'
import { resolveClientVisibleStatus } from '@/lib/tasks/client-view'

type Props = {
  task: TaskRow
  project: ProjectRow | null
  isLast?: boolean
  onOpen: (id: string) => void
}

export default function TaskCardRow({ task, project, isLast, onOpen }: Props) {
  const status = resolveClientVisibleStatus(task)
  const bucket = taskBucket(task)
  const isDone = bucket === 'done'
  const progress = taskProgress(task)

  return (
    <div>
      <button
        type="button"
        className="dec-card task-card"
        onClick={() => onOpen(task.id)}
        aria-label={`${task.title} — Details öffnen`}
      >
        <div className="dec-card-left">
          <div className="dec-card-title-block">
            <span className="dec-card-title">{task.title}</span>
            {project && <span className="dec-card-project">{project.title}</span>}
          </div>
          <span
            className="dec-card-type-pill"
            style={{ ['--dec-dot-color' as string]: taskStatusDotColor(status) }}
          >
            <span className="dec-card-dot" aria-hidden />
            {taskStatusLabel(task)}
          </span>
        </div>

        <div className="dec-card-mid">
          <div className="dec-card-section">
            <span className="dec-card-label">Letztes Update</span>
            <ClampedTip text={taskSummary(task)} className="dec-card-muted" lines={2} />
          </div>
          <div className="dec-card-section">
            <span className="dec-card-label">Dev Panel</span>
            <ClampedTip text={taskStatusHint(task)} className="dec-card-muted" lines={2} />
          </div>
        </div>

        <div className="dec-card-meta">
          <div className="dec-card-section">
            <span className="dec-card-label">Priorität</span>
            <span className="dec-card-prio-pill">
              <span
                className="dec-card-dot dec-card-dot--prio"
                style={{ ['--dec-dot-color' as string]: project?.color || '#64748b' }}
                aria-hidden
              />
              {priorityLabel(task.priority)}
            </span>
          </div>
          <div className="dec-card-section">
            <span className="dec-card-label">{isDone ? 'Abgeschlossen' : 'Fortschritt'}</span>
            <span className="dec-card-muted task-card-progress">
              {isDone ? (
                <>
                  <Check size={12} weight="bold" className="task-card-done-ico" />
                  Erledigt
                </>
              ) : (
                <>
                  {progress}%
                  <span className="task-card-progress-bar" aria-hidden>
                    <span className="task-card-progress-fill" style={{ width: `${progress}%` }} />
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="dec-card-section task-card-source">
            <span className="dec-card-label">Quelle · {dateLabel(task.updated_at || task.created_at)}</span>
            <span className="dec-card-muted">{sourceLabel(task.source)}</span>
          </div>
        </div>
      </button>
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
