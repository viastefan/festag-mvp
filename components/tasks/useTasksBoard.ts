'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TaskApiError,
  commentOnTask,
  deleteTask as deleteTaskRequest,
  fetchTaskBoard,
  patchTask,
  transitionTask,
  type AccessRecord,
  type PersonRecord,
  type ProjectRecord,
  type TaskBoardPayload,
  type TaskPatch,
  type TaskRecord,
} from '@/lib/tasks/client-api'
import {
  TASK_ACTIONS,
  attentionOf,
  bucketOf,
  isTaskLifecycle,
  priorityRank,
  type TaskAction,
  type TaskBucket,
  type TaskLifecycle,
  type TaskViewerRole,
} from '@/lib/tasks/lifecycle'
import { getTaskGroup } from '@/lib/tasks/groups'

export type BoardView = 'attention' | 'all' | TaskBucket
export type BoardSort = 'smart' | 'updated' | 'created' | 'due' | 'priority' | 'project' | 'group'
export type BoardGrouping = 'none' | 'status' | 'project' | 'assignee' | 'group'

export type Toast = {
  id: string
  tone: 'ok' | 'warn' | 'error'
  message: string
  undo?: () => void
}

export type BoardState = {
  loading: boolean
  refreshing: boolean
  error: string | null
  tasks: TaskRecord[]
  projects: ProjectRecord[]
  people: PersonRecord[]
  access: Record<string, AccessRecord>
  viewerId: string | null
}

const EMPTY: BoardState = {
  loading: true,
  refreshing: false,
  error: null,
  tasks: [],
  projects: [],
  people: [],
  access: {},
  viewerId: null,
}

export function useTasksBoard(initialProject = 'all') {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState<BoardState>(EMPTY)
  const [projectScope, setProjectScope] = useState(initialProject)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const loadRef = useRef(0)

  /* ── toasts ───────────────────────────────────────────────────────── */

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((current) => [...current.slice(-2), { ...toast, id }])
    window.setTimeout(() => dismissToast(id), toast.undo ? 8000 : 4200)
    return id
  }, [dismissToast])

  /* ── load ─────────────────────────────────────────────────────────── */

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const token = ++loadRef.current
    setState((current) => ({
      ...current,
      loading: options.silent ? current.loading : current.tasks.length === 0,
      refreshing: true,
      error: options.silent ? current.error : null,
    }))
    try {
      const payload: TaskBoardPayload = await fetchTaskBoard({ project: projectScope, limit: 400 })
      if (token !== loadRef.current) return
      setState({
        loading: false,
        refreshing: false,
        error: null,
        tasks: payload.tasks ?? [],
        projects: payload.projects ?? [],
        people: payload.people ?? [],
        access: payload.access ?? {},
        viewerId: payload.viewer?.id ?? null,
      })
    } catch (error) {
      if (token !== loadRef.current) return
      const message = error instanceof TaskApiError ? error.message : 'Aufgaben konnten nicht geladen werden.'
      setState((current) => ({ ...current, loading: false, refreshing: false, error: message }))
    }
  }, [projectScope])

  useEffect(() => { void load() }, [load])

  // Realtime: someone else moved a task — fold it in without losing the view.
  useEffect(() => {
    const channel = supabase
      .channel('festag-tasks-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void load({ silent: true })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [supabase, load])

  // Coming back to the tab should not show a stale board.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  /* ── derived lookups ──────────────────────────────────────────────── */

  const projectById = useMemo(
    () => new Map(state.projects.map((project) => [project.id, project])),
    [state.projects],
  )
  const personById = useMemo(
    () => new Map(state.people.map((person) => [person.id, person])),
    [state.people],
  )

  const roleFor = useCallback((task: TaskRecord): TaskViewerRole => {
    return state.access[task.project_id]?.role ?? 'observer'
  }, [state.access])

  const accessFor = useCallback((projectId: string): AccessRecord | null => {
    return state.access[projectId] ?? null
  }, [state.access])

  const flowOf = useCallback((task: TaskRecord): TaskLifecycle => {
    return isTaskLifecycle(task.dev_status) ? task.dev_status : 'new'
  }, [])

  /* ── optimistic write helper ──────────────────────────────────────── */

  const applyLocal = useCallback((taskId: string, patch: Partial<TaskRecord>) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...patch } : task),
    }))
  }, [])

  const replaceLocal = useCallback((task: TaskRecord) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((row) => row.id === task.id ? { ...row, ...task } : row),
    }))
  }, [])

  const removeLocal = useCallback((taskId: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) }))
  }, [])

  const markPending = useCallback((taskId: string, value: boolean) => {
    setPending((current) => {
      if (!value) {
        const next = { ...current }
        delete next[taskId]
        return next
      }
      return { ...current, [taskId]: true }
    })
  }, [])

  /* ── mutations — the only way the UI changes anything ─────────────── */

  const runAction = useCallback(async (
    task: TaskRecord,
    action: TaskAction,
    reason?: string | null,
  ): Promise<boolean> => {
    const definition = TASK_ACTIONS[action]
    if (!definition) return false
    const snapshot = { ...task }

    markPending(task.id, true)
    applyLocal(task.id, { dev_status: definition.to })
    try {
      const result = await transitionTask(task.id, action, reason)
      replaceLocal(result.task)
      pushToast({
        tone: 'ok',
        message: result.message,
        undo: canUndo(action)
          ? () => { void undoTransition(snapshot, action) }
          : undefined,
      })
      return true
    } catch (error) {
      applyLocal(task.id, snapshot)
      const apiError = error instanceof TaskApiError ? error : null
      pushToast({ tone: 'error', message: apiError?.message ?? 'Der Schritt konnte nicht gespeichert werden.' })
      if (apiError?.code === 'action_not_available' || apiError?.code === 'task_not_found') {
        void load({ silent: true })
      }
      return false
    } finally {
      markPending(task.id, false)
    }
  }, [applyLocal, replaceLocal, markPending, pushToast, load])

  const undoTransition = useCallback(async (snapshot: TaskRecord, action: TaskAction) => {
    const back = UNDO_ACTION[action]
    if (!back) return
    try {
      const result = await transitionTask(snapshot.id, back, 'Rückgängig gemacht')
      replaceLocal(result.task)
      pushToast({ tone: 'ok', message: 'Rückgängig gemacht.' })
    } catch {
      pushToast({ tone: 'error', message: 'Rückgängig machen hat nicht funktioniert.' })
      void load({ silent: true })
    }
  }, [replaceLocal, pushToast, load])

  const editTask = useCallback(async (task: TaskRecord, patch: TaskPatch): Promise<boolean> => {
    const snapshot = { ...task }
    const optimistic: Partial<TaskRecord> = {}
    if (patch.title !== undefined) optimistic.title = patch.title
    if (patch.priority !== undefined) optimistic.priority = patch.priority
    if (patch.dueDate !== undefined) optimistic.due_date = patch.dueDate
    if (patch.assignedTo !== undefined) optimistic.assigned_to = patch.assignedTo
    if (patch.labels !== undefined) optimistic.tags = patch.labels

    markPending(task.id, true)
    applyLocal(task.id, optimistic)
    try {
      const result = await patchTask(task.id, patch)
      replaceLocal(result.task)
      if (result.changed.length) {
        pushToast({ tone: 'ok', message: `${result.changed.join(' · ')} aktualisiert.` })
      }
      return true
    } catch (error) {
      applyLocal(task.id, snapshot)
      pushToast({
        tone: 'error',
        message: error instanceof TaskApiError ? error.message : 'Änderung konnte nicht gespeichert werden.',
      })
      return false
    } finally {
      markPending(task.id, false)
    }
  }, [applyLocal, replaceLocal, markPending, pushToast])

  const removeTask = useCallback(async (task: TaskRecord): Promise<boolean> => {
    markPending(task.id, true)
    removeLocal(task.id)
    try {
      await deleteTaskRequest(task.id)
      pushToast({ tone: 'ok', message: `„${task.title}" wurde gelöscht.` })
      return true
    } catch (error) {
      pushToast({
        tone: 'error',
        message: error instanceof TaskApiError ? error.message : 'Löschen hat nicht funktioniert.',
      })
      void load({ silent: true })
      return false
    } finally {
      markPending(task.id, false)
    }
  }, [removeLocal, markPending, pushToast, load])

  const addComment = useCallback(async (task: TaskRecord, body: string, internal = false) => {
    try {
      await commentOnTask(task.id, body, internal)
      if (!internal) applyLocal(task.id, { latest_client_update: body.slice(0, 400) })
      pushToast({ tone: 'ok', message: 'Update gespeichert.' })
      return true
    } catch (error) {
      pushToast({
        tone: 'error',
        message: error instanceof TaskApiError ? error.message : 'Update konnte nicht gespeichert werden.',
      })
      return false
    }
  }, [applyLocal, pushToast])

  /** Bulk actions stop at the first hard failure and report honestly. */
  const runBulk = useCallback(async (tasks: TaskRecord[], action: TaskAction, reason?: string | null) => {
    let ok = 0
    let failed = 0
    for (const task of tasks) {
      const success = await runAction(task, action, reason)
      if (success) ok += 1
      else failed += 1
    }
    if (ok && !failed) pushToast({ tone: 'ok', message: `${ok} ${ok === 1 ? 'Aufgabe' : 'Aufgaben'} aktualisiert.` })
    else if (ok && failed) pushToast({ tone: 'warn', message: `${ok} aktualisiert, ${failed} nicht möglich.` })
    else if (failed) pushToast({ tone: 'error', message: 'Keine der Aufgaben konnte aktualisiert werden.' })
    return { ok, failed }
  }, [runAction, pushToast])

  return {
    ...state,
    projectScope,
    setProjectScope,
    reload: load,
    projectById,
    personById,
    roleFor,
    accessFor,
    flowOf,
    pending,
    toasts,
    pushToast,
    dismissToast,
    runAction,
    editTask,
    removeTask,
    addComment,
    runBulk,
  }
}

const UNDO_ACTION: Partial<Record<TaskAction, TaskAction>> = {
  start: 'pause',
  pause: 'resume',
  resume: 'pause',
  approve: 'reopen',
  cancel: 'restore',
}

function canUndo(action: TaskAction): boolean {
  return Boolean(UNDO_ACTION[action])
}

/* ── selection / sorting / grouping used by the page ───────────────── */

export function sortTasks(
  tasks: TaskRecord[],
  sort: BoardSort,
  ctx: { projectById: Map<string, ProjectRecord>; role: (task: TaskRecord) => TaskViewerRole },
): TaskRecord[] {
  const copy = [...tasks]
  const time = (value?: string | null) => (value ? new Date(value).getTime() : 0)

  switch (sort) {
    case 'priority':
      return copy.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || time(b.updated_at) - time(a.updated_at))
    case 'due':
      return copy.sort((a, b) => {
        if (!a.due_date && !b.due_date) return time(b.updated_at) - time(a.updated_at)
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    case 'created':
      return copy.sort((a, b) => time(b.created_at) - time(a.created_at))
    case 'project':
      return copy.sort((a, b) => {
        const left = ctx.projectById.get(a.project_id)?.title ?? ''
        const right = ctx.projectById.get(b.project_id)?.title ?? ''
        return left.localeCompare(right) || time(b.updated_at) - time(a.updated_at)
      })
    case 'group':
      return copy.sort((a, b) => getTaskGroup(a).sortWeight - getTaskGroup(b).sortWeight || time(b.updated_at) - time(a.updated_at))
    case 'updated':
      return copy.sort((a, b) => time(b.updated_at) - time(a.updated_at))
    case 'smart':
    default:
      // What Festag thinks matters now: attention first, then priority,
      // then the thing that moved most recently.
      return copy.sort((a, b) => {
        const left = attentionOf(a, ctx.role(a))
        const right = attentionOf(b, ctx.role(b))
        const leftWeight = left ? left.weight : 9
        const rightWeight = right ? right.weight : 9
        if (leftWeight !== rightWeight) return leftWeight - rightWeight
        const priority = priorityRank(a.priority) - priorityRank(b.priority)
        if (priority !== 0) return priority
        return time(b.updated_at) - time(a.updated_at)
      })
  }
}

export function bucketCounts(tasks: TaskRecord[], role: (task: TaskRecord) => TaskViewerRole) {
  const counts = { all: 0, open: 0, active: 0, waiting: 0, review: 0, done: 0, attention: 0 }
  for (const task of tasks) {
    const flow = isTaskLifecycle(task.dev_status) ? task.dev_status : 'new'
    const bucket = bucketOf(flow)
    counts[bucket] += 1
    counts.all += 1
    if (attentionOf(task, role(task))) counts.attention += 1
  }
  return counts
}
