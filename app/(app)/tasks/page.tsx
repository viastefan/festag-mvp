'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowsClockwise,
  FunnelSimple,
  ListChecks,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Warning,
  X,
} from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { TASKS_CSS } from '@/components/tasks/tasks-styles'
import { TASKS_BOARD_CSS } from '@/components/tasks/tasks-board-styles'
import TaskListRow from '@/components/tasks/TaskListRow'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import {
  bucketCounts,
  sortTasks,
  useTasksBoard,
  type BoardGrouping,
  type BoardSort,
  type BoardView,
} from '@/components/tasks/useTasksBoard'
import {
  BUCKET_LABEL,
  LIFECYCLE_DE,
  actionsFor,
  attentionOf,
  bucketOf,
  lifecycleLabel,
  type TaskAction,
} from '@/lib/tasks/lifecycle'
import { getTaskGroup } from '@/lib/tasks/groups'
import type { TaskRecord } from '@/lib/tasks/client-api'

const VIEWS: { id: BoardView; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Offen' },
  { id: 'active', label: 'In Arbeit' },
  { id: 'waiting', label: 'Wartet' },
  { id: 'review', label: 'Prüfung' },
  { id: 'done', label: 'Erledigt' },
]

const SORTS: { id: BoardSort; label: string }[] = [
  { id: 'smart', label: 'Was jetzt zählt' },
  { id: 'updated', label: 'Zuletzt bewegt' },
  { id: 'created', label: 'Neueste zuerst' },
  { id: 'due', label: 'Termin' },
  { id: 'priority', label: 'Priorität' },
  { id: 'project', label: 'Projekt' },
]

const GROUPINGS: { id: BoardGrouping; label: string }[] = [
  { id: 'none', label: 'Keine Gruppierung' },
  { id: 'status', label: 'Nach Status' },
  { id: 'project', label: 'Nach Projekt' },
  { id: 'assignee', label: 'Nach Verantwortung' },
  { id: 'group', label: 'Nach Bereich' },
]

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="dec-os"><p className="tsk-state">Aufgaben werden geladen…</p></div>}>
      <TasksPageInner />
    </Suspense>
  )
}

function TasksPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const board = useTasksBoard(searchParams?.get('project') || 'all')

  const [view, setView] = useState<BoardView>((searchParams?.get('view') as BoardView) || 'all')
  const [sort, setSort] = useState<BoardSort>('smart')
  const [grouping, setGrouping] = useState<BoardGrouping>('none')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focusIndex, setFocusIndex] = useState(-1)
  const [createOpen, setCreateOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { tasks, projects, people, loading, error, projectById, personById, roleFor, accessFor, flowOf } = board

  /* ── URL ↔ state ─────────────────────────────────────────────────── */

  const syncUrl = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === 'all') params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    router.replace(qs ? `/tasks?${qs}` : '/tasks', { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
  }, [searchParams])

  /* ── derived list ────────────────────────────────────────────────── */

  const counts = useMemo(() => bucketCounts(tasks, roleFor), [tasks, roleFor])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      if (view === 'attention') {
        if (!attentionOf(task, roleFor(task))) return false
      } else if (view !== 'all') {
        if (bucketOf(flowOf(task)) !== view) return false
      } else if (bucketOf(flowOf(task)) === 'done') {
        // "Alle" keeps finished work for a day so the last step stays visible
        const done = task.completed_at || task.updated_at
        if (done && Date.now() - new Date(done).getTime() > 86_400_000) return false
      }
      if (!needle) return true
      return [task.title, task.description, task.latest_client_update, projectById.get(task.project_id)?.title]
        .some((field) => field?.toLowerCase().includes(needle))
    })
    return sortTasks(filtered, sort, { projectById, role: roleFor })
  }, [tasks, view, query, sort, projectById, roleFor, flowOf])

  const groups = useMemo(() => {
    if (grouping === 'none') return [{ key: 'all', label: '', tasks: visible }]
    const map = new Map<string, { key: string; label: string; weight: number; tasks: TaskRecord[] }>()
    for (const task of visible) {
      let key = 'other'
      let label = 'Sonstige'
      let weight = 50
      if (grouping === 'status') {
        const flow = flowOf(task)
        key = flow
        label = lifecycleLabel(flow, roleFor(task))
        weight = Object.keys(LIFECYCLE_DE).indexOf(flow)
      } else if (grouping === 'project') {
        key = task.project_id
        label = projectById.get(task.project_id)?.title ?? 'Ohne Projekt'
        weight = 0
      } else if (grouping === 'assignee') {
        key = task.assigned_to ?? 'unassigned'
        label = task.assigned_to ? personById.get(task.assigned_to)?.name ?? 'Teammitglied' : 'Noch niemand verantwortlich'
        weight = task.assigned_to ? 1 : 0
      } else if (grouping === 'group') {
        const group = getTaskGroup(task)
        key = group.key
        label = group.label
        weight = group.sortWeight
      }
      const entry = map.get(key) ?? { key, label, weight, tasks: [] }
      entry.tasks.push(task)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.weight - b.weight || a.label.localeCompare(b.label))
  }, [visible, grouping, flowOf, roleFor, projectById, personById])

  const flatVisible = useMemo(() => groups.flatMap((group) => group.tasks), [groups])

  useEffect(() => {
    setSelected((current) => {
      if (!current.size) return current
      const alive = new Set(tasks.map((task) => task.id))
      const next = new Set(Array.from(current).filter((id) => alive.has(id)))
      return next.size === current.size ? current : next
    })
  }, [tasks])

  /* ── menus close on outside click ────────────────────────────────── */

  useEffect(() => {
    if (!filterOpen && !sortOpen) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (filterRef.current?.contains(target) || sortRef.current?.contains(target)) return
      setFilterOpen(false)
      setSortOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [filterOpen, sortOpen])

  /* ── keyboard ────────────────────────────────────────────────────── */

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (event.key === 'Escape') {
        if (typing && target === searchRef.current) { searchRef.current?.blur(); return }
        if (selected.size) { setSelected(new Set()); return }
        if (focusIndex >= 0) setFocusIndex(-1)
        return
      }
      if (typing || createOpen || openId) return

      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); return }
      if (event.key === 'n' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); setCreateOpen(true); return }
      if (event.key === 'r' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); void board.reload({ silent: true }); return }

      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault()
        setFocusIndex((index) => Math.min(flatVisible.length - 1, index + 1))
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault()
        setFocusIndex((index) => Math.max(0, index - 1))
        return
      }
      const focused = flatVisible[focusIndex]
      if (!focused) return
      if (event.key === 'Enter') { event.preventDefault(); openTask(focused); return }
      if (event.key === 'x') {
        event.preventDefault()
        setSelected((current) => {
          const next = new Set(current)
          if (next.has(focused.id)) next.delete(focused.id)
          else next.add(focused.id)
          return next
        })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatVisible, focusIndex, selected.size, createOpen, openId])

  useEffect(() => {
    if (focusIndex < 0) return
    const task = flatVisible[focusIndex]
    if (!task) return
    listRef.current
      ?.querySelector(`[data-task-id="${task.id}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex, flatVisible])

  /* ── actions ─────────────────────────────────────────────────────── */

  function openTask(task: TaskRecord) {
    setOpenId(task.id)
    syncUrl({ open: task.id })
  }

  function closeTask() {
    setOpenId(null)
    syncUrl({ open: null })
    void board.reload({ silent: true })
  }

  function applyView(next: BoardView) {
    setView(next)
    setFocusIndex(-1)
    syncUrl({ view: next === 'all' ? null : next })
  }

  function applyProject(next: string) {
    board.setProjectScope(next)
    setFocusIndex(-1)
    syncUrl({ project: next })
  }

  function toggleSelect(task: TaskRecord, shiftKey: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (shiftKey && current.size) {
        const indices = flatVisible.map((row, index) => (current.has(row.id) ? index : -1)).filter((i) => i >= 0)
        const anchor = indices.length ? indices[indices.length - 1] : 0
        const target = flatVisible.findIndex((row) => row.id === task.id)
        const [from, to] = anchor < target ? [anchor, target] : [target, anchor]
        for (let index = from; index <= to; index += 1) next.add(flatVisible[index].id)
        return next
      }
      if (next.has(task.id)) next.delete(task.id)
      else next.add(task.id)
      return next
    })
  }

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selected.has(task.id)),
    [tasks, selected],
  )

  /** Only actions every selected task can actually perform are offered. */
  const bulkActions = useMemo(() => {
    if (!selectedTasks.length) return []
    const sets = selectedTasks.map((task) => new Set(actionsFor(flowOf(task), roleFor(task))))
    const shared = Array.from(sets[0] ?? []).filter((action) => sets.every((set) => set.has(action)))
    return shared.filter((action) => action !== 'cancel' && action !== 'reopen') as TaskAction[]
  }, [selectedTasks, flowOf, roleFor])

  async function runBulk(action: TaskAction) {
    setBulkBusy(true)
    try {
      await board.runBulk(selectedTasks, action)
      setSelected(new Set())
    } finally {
      setBulkBusy(false)
    }
  }

  const openTaskRecord = openId ? tasks.find((task) => task.id === openId) ?? null : null
  const attentionCount = counts.attention
  const hasProjects = projects.length > 0
  const canCreate = Object.values(board.access).some((grant) => grant.canCreate)
  const leadLine = `${counts.open} offen · ${counts.active} in Arbeit · ${counts.review} in Prüfung`

  const tagroContext = {
    contextType: 'task' as const,
    id: 'list',
    projectId: board.projectScope !== 'all' ? board.projectScope : projects[0]?.id,
    title: 'Aufgaben',
    subtitle: leadLine,
  }

  return (
    <div className="dec-os tsk-shell">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: TASKS_CSS + TASKS_BOARD_CSS }} />

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Aufgaben"
            onMenu={() => setNavOpen(true)}
            onSearch={() => searchRef.current?.focus()}
            actions={(
              <>
                <button
                  type="button"
                  className="tsk-icon-btn"
                  aria-label="Aktualisieren"
                  onClick={() => void board.reload()}
                >
                  <ArrowsClockwise size={15} weight="regular" className={board.refreshing ? 'tsk-spin' : ''} />
                </button>
                <button
                  type="button"
                  className="tsk-primary-btn"
                  disabled={!canCreate}
                  title={canCreate ? 'Neue Aufgabe (n)' : 'In deinen Projekten kannst du keine Aufgaben anlegen'}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={13} weight="bold" />
                  Aufgabe
                </button>
              </>
            )}
          />

          <div className="tsk-toolbar">
            <label className="tsk-search">
              <MagnifyingGlass size={14} weight="regular" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setFocusIndex(-1) }}
                placeholder="Aufgaben durchsuchen…"
                aria-label="Aufgaben durchsuchen"
              />
              {query
                ? <button type="button" className="tsk-icon-btn" aria-label="Suche leeren" onClick={() => setQuery('')}><X size={13} weight="bold" /></button>
                : <kbd>/</kbd>}
            </label>

            <div className="tsk-tabs" role="tablist" aria-label="Ansicht">
              {attentionCount > 0 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'attention'}
                  className={`tsk-tab attention${view === 'attention' ? ' on' : ''}`}
                  onClick={() => applyView('attention')}
                >
                  <Warning size={12} weight="fill" />
                  Braucht dich <em>{attentionCount}</em>
                </button>
              )}
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={view === item.id}
                  className={`tsk-tab${view === item.id ? ' on' : ''}`}
                  onClick={() => applyView(item.id)}
                >
                  {item.label}
                  <em>{item.id === 'all' ? counts.all : counts[item.id as keyof typeof counts]}</em>
                </button>
              ))}
            </div>

            <span className="tsk-toolbar-spacer" />

            <div className="tsk-menu-wrap" ref={filterRef}>
              <button
                type="button"
                className={`tsk-icon-btn${filterOpen || board.projectScope !== 'all' ? ' on' : ''}`}
                aria-label="Projekt filtern"
                aria-expanded={filterOpen}
                onClick={() => { setSortOpen(false); setFilterOpen((value) => !value) }}
              >
                <FunnelSimple size={15} weight="regular" />
              </button>
              {filterOpen && (
                <div className="tsk-menu" role="menu">
                  <p className="tsk-pop-label">Projekt</p>
                  <button
                    type="button"
                    role="menuitem"
                    className={`tsk-pop-item${board.projectScope === 'all' ? ' on' : ''}`}
                    onClick={() => { applyProject('all'); setFilterOpen(false) }}
                  >
                    Alle Projekte
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      role="menuitem"
                      className={`tsk-pop-item${board.projectScope === project.id ? ' on' : ''}`}
                      onClick={() => { applyProject(project.id); setFilterOpen(false) }}
                    >
                      <span className="tsk-pop-dot" style={{ background: project.color || '#64748b' }} aria-hidden />
                      {project.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="tsk-menu-wrap" ref={sortRef}>
              <button
                type="button"
                className={`tsk-icon-btn${sortOpen || sort !== 'smart' || grouping !== 'none' ? ' on' : ''}`}
                aria-label="Sortieren und gruppieren"
                aria-expanded={sortOpen}
                onClick={() => { setFilterOpen(false); setSortOpen((value) => !value) }}
              >
                <SlidersHorizontal size={15} weight="regular" />
              </button>
              {sortOpen && (
                <div className="tsk-menu" role="menu">
                  <p className="tsk-pop-label">Sortieren</p>
                  {SORTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={`tsk-pop-item${sort === item.id ? ' on' : ''}`}
                      onClick={() => { setSort(item.id); setSortOpen(false) }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="tsk-menu-sep" />
                  <p className="tsk-pop-label">Gruppieren</p>
                  {GROUPINGS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={`tsk-pop-item${grouping === item.id ? ' on' : ''}`}
                      onClick={() => { setGrouping(item.id); setSortOpen(false) }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dec-scroll-body" ref={listRef}>
          {error ? (
            <div className="tsk-state">
              <Warning size={18} weight="regular" />
              <strong>Aufgaben konnten nicht geladen werden</strong>
              <p>{error}</p>
              <div className="tsk-state-actions">
                <button type="button" className="tsk-primary-btn" onClick={() => void board.reload()}>Erneut versuchen</button>
              </div>
            </div>
          ) : loading ? (
            <div aria-busy="true" aria-label="Aufgaben werden geladen">
              {[0, 1, 2, 3, 4].map((index) => <div key={index} className="tsk-skeleton-row" />)}
            </div>
          ) : !hasProjects ? (
            <div className="tsk-state">
              <ListChecks size={18} weight="regular" />
              <strong>Noch kein Projekt</strong>
              <p>Aufgaben gehören immer zu einem Projekt — so bleibt nachvollziehbar, worauf sie einzahlen. Lege ein Projekt an oder beschreibe dein Vorhaben, Tagro strukturiert daraus den Plan.</p>
              <div className="tsk-state-actions">
                <Link href="/new-project" className="tsk-primary-btn">Projekt anlegen</Link>
                <Link href="/ai" className="tsk-bulk-btn"><Sparkle size={12} weight="fill" /> Mit Tagro starten</Link>
              </div>
            </div>
          ) : !visible.length ? (
            <EmptyState
              view={view}
              query={query}
              total={tasks.length}
              canCreate={canCreate}
              onCreate={() => setCreateOpen(true)}
              onReset={() => { setQuery(''); applyView('all') }}
            />
          ) : (
            <>
              {view !== 'attention' && attentionCount > 0 && (
                <div className="tsk-attention-band" role="status">
                  <Warning size={15} weight="fill" />
                  <div>
                    <strong>{attentionCount} {attentionCount === 1 ? 'Aufgabe braucht' : 'Aufgaben brauchen'} eine Entscheidung</strong>
                    <p>Freigaben, Blocker und offene Rückfragen halten die Umsetzung auf.</p>
                  </div>
                  <button type="button" onClick={() => applyView('attention')}>Ansehen</button>
                </div>
              )}

              {groups.map((group) => (
                <section key={group.key}>
                  {group.label && (
                    <div className="tsk-group">
                      <span>{group.label}</span>
                      <em>{group.tasks.length}</em>
                    </div>
                  )}
                  {group.tasks.map((task) => {
                    const grant = accessFor(task.project_id)
                    return (
                      <TaskListRow
                        key={task.id}
                        task={task}
                        project={projectById.get(task.project_id) ?? null}
                        assignee={task.assigned_to ? personById.get(task.assigned_to) ?? null : null}
                        people={people.filter((person) => !person.projects?.length || person.projects.includes(task.project_id))}
                        flow={flowOf(task)}
                        role={roleFor(task)}
                        canAssign={Boolean(grant?.canAssign)}
                        canEdit={Boolean(grant?.canEdit)}
                        canDelete={Boolean(grant?.canDelete)}
                        busy={Boolean(board.pending[task.id])}
                        selected={selected.has(task.id)}
                        selectionMode={selected.size > 0}
                        focused={flatVisible[focusIndex]?.id === task.id}
                        onOpen={() => openTask(task)}
                        onToggleSelect={(event) => toggleSelect(task, event.shiftKey)}
                        onAction={(action, reason) => void board.runAction(task, action, reason)}
                        onAssign={(userId) => void board.editTask(task, { assignedTo: userId })}
                        onPriority={(priority) => void board.editTask(task, { priority })}
                        onDueDate={(due) => void board.editTask(task, { dueDate: due })}
                        onDelete={() => void board.removeTask(task)}
                      />
                    )
                  })}
                </section>
              ))}
            </>
          )}

          {selected.size > 0 && (
            <div className="tsk-bulk" role="toolbar" aria-label="Auswahl bearbeiten">
              <span className="tsk-bulk-count">
                {selected.size} {selected.size === 1 ? 'Aufgabe' : 'Aufgaben'}
              </span>
              <div className="tsk-bulk-actions">
                {bulkActions.length ? bulkActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="tsk-bulk-btn"
                    disabled={bulkBusy}
                    onClick={() => void runBulk(action)}
                  >
                    {BULK_LABEL[action] ?? action}
                  </button>
                )) : (
                  <span className="tsk-bulk-count" style={{ opacity: .7 }}>
                    Für diese Mischung gibt es keinen gemeinsamen Schritt
                  </span>
                )}
                <button type="button" className="tsk-bulk-btn" onClick={() => setSelected(new Set())}>
                  Auswahl aufheben
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tsk-toasts" role="status" aria-live="polite">
        {board.toasts.map((toast) => (
          <div key={toast.id} className={`tsk-toast ${toast.tone}`}>
            <span className="tsk-toast-dot" aria-hidden />
            <p>{toast.message}</p>
            {toast.undo && (
              <button type="button" className="undo" onClick={() => { toast.undo?.(); board.dismissToast(toast.id) }}>
                Rückgängig
              </button>
            )}
            <button type="button" aria-label="Schließen" onClick={() => board.dismissToast(toast.id)}>
              <X size={12} weight="bold" />
            </button>
          </div>
        ))}
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab context={tagroContext} />
      </div>

      <MobilePageDock
        onDragUp={() => setCreateOpen(true)}
        primary={{
          id: 'create',
          label: 'Aufgabe erstellen…',
          icon: <Plus size={14} weight="bold" />,
          onClick: () => setCreateOpen(true),
          ariaLabel: 'Aufgabe erstellen',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: () => openTagro(tagroContext),
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />

      <TaskCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        people={people}
        access={board.access}
        defaultProjectId={board.projectScope !== 'all' ? board.projectScope : undefined}
        onCreated={(task) => {
          board.pushToast({ tone: 'ok', message: `„${task.title}" wurde angelegt.` })
          void board.reload({ silent: true })
        }}
      />

      {openTaskRecord && (
        <TaskDrawer
          taskId={openTaskRecord.id}
          projectId={openTaskRecord.project_id}
          title={openTaskRecord.title}
          onClose={closeTask}
        />
      )}
    </div>
  )
}

const BULK_LABEL: Partial<Record<TaskAction, string>> = {
  start: 'Starten',
  pause: 'Pausieren',
  resume: 'Fortsetzen',
  submit: 'Fertig melden',
  approve: 'Freigeben',
  unblock: 'Blocker auflösen',
  block: 'Blockiert',
  ask: 'Rückfrage',
  request_changes: 'Änderungen',
  restore: 'Zurückholen',
}

function EmptyState({
  view, query, total, canCreate, onCreate, onReset,
}: {
  view: BoardView
  query: string
  total: number
  canCreate: boolean
  onCreate: () => void
  onReset: () => void
}) {
  if (query) {
    return (
      <div className="tsk-state">
        <MagnifyingGlass size={18} weight="regular" />
        <strong>Nichts gefunden</strong>
        <p>Für „{query}" gibt es in dieser Ansicht keine Aufgabe.</p>
        <div className="tsk-state-actions">
          <button type="button" className="tsk-bulk-btn" onClick={onReset}>Filter zurücksetzen</button>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="tsk-state">
        <ListChecks size={18} weight="regular" />
        <strong>Noch keine Aufgaben</strong>
        <p>Aufgaben entstehen aus dem, was das Projekt braucht — von dir erfasst oder von Tagro aus Briefings, Entscheidungen und Statusberichten abgeleitet.</p>
        {canCreate && (
          <div className="tsk-state-actions">
            <button type="button" className="tsk-primary-btn" onClick={onCreate}>
              <Plus size={13} weight="bold" /> Erste Aufgabe
            </button>
          </div>
        )}
      </div>
    )
  }

  const copy: Record<string, { title: string; body: string }> = {
    attention: { title: 'Nichts wartet auf dich', body: 'Keine Freigabe, kein Blocker, keine offene Rückfrage. Die Umsetzung läuft.' },
    open: { title: 'Nichts liegt offen', body: 'Jede Aufgabe hat jemanden, der sie bewegt.' },
    active: { title: 'Gerade wird nichts umgesetzt', body: 'Keine Aufgabe ist aktuell in Arbeit — offene Aufgaben warten auf den Start.' },
    waiting: { title: 'Nichts hängt', body: 'Keine Aufgabe wartet auf eine Klärung oder ist pausiert.' },
    review: { title: 'Nichts in Prüfung', body: 'Es liegt nichts zur Freigabe bereit.' },
    done: { title: 'Noch nichts abgeschlossen', body: 'Sobald eine Aufgabe freigegeben ist, erscheint sie hier.' },
  }
  const text = copy[view] ?? { title: 'Keine Aufgaben in dieser Ansicht', body: 'Wechsle die Ansicht oder den Projektfilter.' }

  return (
    <div className="tsk-state">
      <ListChecks size={18} weight="regular" />
      <strong>{text.title}</strong>
      <p>{text.body}</p>
      <div className="tsk-state-actions">
        <button type="button" className="tsk-bulk-btn" onClick={onReset}>Alle Aufgaben zeigen</button>
      </div>
    </div>
  )
}
