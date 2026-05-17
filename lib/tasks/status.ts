export const COMPLETED_TASK_VISIBLE_MS = 24 * 60 * 60 * 1000

const DONE_STATES = new Set(['done', 'completed', 'delivered', 'erledigt'])

export function isDoneTaskState(status?: string | null) {
  return DONE_STATES.has(String(status || '').toLowerCase())
}

export function taskCompletionTime(task: { completed_at?: string | null; updated_at?: string | null }) {
  return task.completed_at || task.updated_at || null
}

export function isCompletedTaskStillFresh(task: { completed_at?: string | null; updated_at?: string | null }) {
  const value = taskCompletionTime(task)
  if (!value) return true
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return true
  return Date.now() - time < COMPLETED_TASK_VISIBLE_MS
}

export function completedAtForStatus(status?: string | null, previousCompletedAt?: string | null) {
  return isDoneTaskState(status) ? previousCompletedAt || new Date().toISOString() : null
}

export function taskStatusPatch(status?: string | null, previousCompletedAt?: string | null) {
  return {
    status,
    completed_at: completedAtForStatus(status, previousCompletedAt),
    updated_at: new Date().toISOString(),
  }
}
