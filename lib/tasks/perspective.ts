/**
 * Task perspective — one Workspace row, two presentations.
 *
 * Client Portal → trust (client_visible_status + Tagro summaries)
 * Execution Panel → productivity (dev_status / technical fields)
 *
 * @see docs/festag-workspace-portal-system.md
 * @see lib/tasks/client-view.ts
 */

import {
  clientProgress,
  clientViewBucket,
  isClientVisibleTask,
  resolveClientVisibleStatus,
  type ClientTaskShape,
} from '@/lib/tasks/client-view'
import { devFlowFromLegacy } from '@/lib/tasks/work-types'

export type TaskPerspective = 'client' | 'execution'

/** Simple board columns shared by the project page (legacy layout). */
export type ProjectBoardColumn = 'todo' | 'doing' | 'done'

export function visibleTasksForPerspective<T extends ClientTaskShape>(
  tasks: T[],
  perspective: TaskPerspective,
): T[] {
  if (perspective === 'execution') return tasks
  return tasks.filter(isClientVisibleTask)
}

export function projectBoardColumn(
  task: ClientTaskShape,
  perspective: TaskPerspective,
): ProjectBoardColumn {
  if (perspective === 'client') {
    const bucket = clientViewBucket(resolveClientVisibleStatus(task))
    if (bucket === 'done') return 'done'
    if (bucket === 'open') return 'todo'
    return 'doing'
  }

  const flow = devFlowFromLegacy(task.status, task.dev_status)
  if (
    flow === 'approved_by_owner'
    || flow === 'completed'
    || flow === 'verified_by_tagro'
    || task.status === 'done'
  ) return 'done'
  if (
    flow === 'in_progress'
    || flow === 'needs_review'
    || flow === 'blocked'
    || flow === 'finished_by_dev'
    || task.status === 'doing'
    || task.status === 'waiting'
    || task.status === 'blocked'
  ) return 'doing'
  return 'todo'
}

export function projectBoardProgress(tasks: ClientTaskShape[], perspective: TaskPerspective): number {
  const visible = visibleTasksForPerspective(tasks, perspective)
  if (!visible.length) return 0
  if (perspective === 'client') {
    const sum = visible.reduce((acc, t) => acc + clientProgress(t), 0)
    return Math.round(sum / visible.length)
  }
  const done = visible.filter(t => projectBoardColumn(t, 'execution') === 'done').length
  return Math.round((done / visible.length) * 100)
}
