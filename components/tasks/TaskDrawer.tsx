'use client'

import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import TaskWorkspaceDetail from '@/components/TaskWorkspaceDetail'
import { TASK_DRAWER_CSS } from '@/components/tasks/tasks-styles-drawer'
import { clientStatusLabelDe, resolveClientVisibleStatus } from '@/lib/tasks/client-view'

type Props = {
  taskId: string
  projectId?: string | null
  title?: string
  onClose: () => void
}

export function TaskDrawer({ taskId, projectId, title, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="task-drawer-overlay" role="dialog" aria-modal="true" aria-label="Aufgabe">
      <style>{TASK_DRAWER_CSS}</style>
      <button type="button" className="task-drawer-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="task-drawer-panel">
        <header className="task-drawer-head">
          <div className="task-drawer-head-meta">
            <span className="task-drawer-kicker">Aufgabe</span>
            {title ? <h2 className="task-drawer-title">{title}</h2> : null}
          </div>
          <button type="button" className="task-drawer-close" onClick={onClose} aria-label="Schließen">
            <X size={18} weight="regular" />
          </button>
        </header>
        <div className="task-drawer-body">
          <TaskWorkspaceDetail
            taskId={taskId}
            projectId={projectId ?? undefined}
            variant="drawer"
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
  )
}

export function taskDrawerSubtitle(task: {
  title?: string | null
  client_visible_status?: string | null
  dev_status?: string | null
  status?: string | null
  client_status?: string | null
}) {
  return clientStatusLabelDe(resolveClientVisibleStatus(task as any))
}
