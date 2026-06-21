'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowsClockwise,
  Article,
  Code,
  FileText,
  FunnelSimple,
  Gauge,
  Globe,
  ListChecks,
  MagnifyingGlass,
  Palette,
  PencilSimple,
  Plugs,
  Plus,
  RocketLaunch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getTaskGroup, type TaskGroupKey } from '@/lib/tasks/groups'
import { isCompletedTaskStillFresh } from '@/lib/tasks/status'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import TaskCardRow from '@/components/tasks/TaskCardRow'
import TaskSuggestModal from '@/components/tasks/TaskSuggestModal'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import { TASKS_CSS } from '@/components/tasks/tasks-styles'
import {
  buildTaskLeadLine,
  SORT_OPTIONS,
  TASK_VIEWS,
  taskBucket,
  type ProjectRow,
  type SortMode,
  type TaskRow,
  type TaskView,
} from '@/components/tasks/tasks-shared'
import { openTagro } from '@/components/TagroOverlay'

const PROJECT_COLOR_SYNC_EVENT = 'festag-project-color-change'

const TASK_GROUP_ICONS: Record<TaskGroupKey, typeof FileText> = {
  legal: ShieldCheck,
  tech: Gauge,
  qa: ListChecks,
  seo: MagnifyingGlass,
  launch: RocketLaunch,
  integration: Plugs,
  design: Palette,
  content: Article,
  web: Globe,
  code: Code,
  process: SlidersHorizontal,
  decision: ShieldCheck,
  blocker: Gauge,
  client_action: FileText,
  follow_up: SlidersHorizontal,
  admin: ShieldCheck,
  planning: FileText,
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="dec-empty" style={{ padding: 48 }}>Aufgaben werden geladen…</p>}>
      <TasksPageInner />
    </Suspense>
  )
}

function TasksPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const sortWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)

  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [view, setView] = useState<TaskView>('all')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [projectScope, setProjectScope] = useState<string>('all')
  const [navOpen, setNavOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const qs = projectScope !== 'all' ? `?projectId=${encodeURIComponent(projectScope)}` : ''
      const res = await fetch(`/api/client/tasks${qs}`)
      const data = await res.json()
      if (res.ok) {
        setTasks((data.tasks as TaskRow[]) ?? [])
        setProjects((data.projects as ProjectRow[]) ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectScope])

  useEffect(() => {
    void loadTasks()
    const channel = supabase
      .channel('client-tasks-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void loadTasks()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadTasks, supabase])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
    const project = searchParams?.get('project')
    if (project) setProjectScope(project)
  }, [searchParams])

  useEffect(() => {
    if (projectScope === 'all') return
    if (!projects.find((p) => p.id === projectScope)) setProjectScope('all')
  }, [projects, projectScope])

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      const target = event.target as Node
      if (filterWrapRef.current?.contains(target) || mobileFilterWrapRef.current?.contains(target)) return
      if (sortWrapRef.current?.contains(target)) return
      setFilterMenuOpen(false)
      setSortMenuOpen(false)
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFilterMenuOpen(false)
        setSortMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeMenus)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenus)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  useEffect(() => {
    const onProjectColor = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const projectId = event.detail?.projectId
      const color = event.detail?.color
      if (!projectId || !color) return
      setProjects((current) => current.map((project) => project.id === projectId ? { ...project, color } : project))
    }
    window.addEventListener(PROJECT_COLOR_SYNC_EVENT, onProjectColor)
    return () => window.removeEventListener(PROJECT_COLOR_SYNC_EVENT, onProjectColor)
  }, [])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const hasProjects = projects.length > 0
  const projectList = projects

  const counts = useMemo(() => ({
    open: tasks.filter((task) => taskBucket(task) === 'open').length,
    active: tasks.filter((task) => taskBucket(task) === 'active').length,
    review: tasks.filter((task) => taskBucket(task) === 'review').length,
    decision: tasks.filter((task) => taskBucket(task) === 'decision').length,
    done: tasks.filter((task) => taskBucket(task) === 'done').length,
  }), [tasks])

  const pageLeadLine = buildTaskLeadLine(counts)

  const visibleTasks = useMemo(() => {
    const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return tasks
      .filter((task) => {
        if (projectScope !== 'all' && task.project_id !== projectScope) return false
        const bucket = taskBucket(task)
        if (view === 'all') return bucket !== 'done' || isCompletedTaskStillFresh(task)
        return bucket === view
      })
      .sort((a, b) => {
        if (sortMode === 'priority') {
          return (priorityRank[a.priority || ''] ?? 9) - (priorityRank[b.priority || ''] ?? 9)
        }
        if (sortMode === 'project') {
          const pa = a.project_id ? projectById.get(a.project_id)?.title || '' : ''
          const pb = b.project_id ? projectById.get(b.project_id)?.title || '' : ''
          return pa.localeCompare(pb)
        }
        if (sortMode === 'group') {
          const ga = getTaskGroup(a)
          const gb = getTaskGroup(b)
          if (ga.sortWeight !== gb.sortWeight) return ga.sortWeight - gb.sortWeight
          return new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime()
        }
        const field = sortMode === 'updated' ? 'updated_at' : 'created_at'
        return new Date((b as any)[field] || b.created_at || 0).getTime() - new Date((a as any)[field] || a.created_at || 0).getTime()
      })
  }, [tasks, view, sortMode, projectById, projectScope])

  const taskCategoryGroups = useMemo(() => {
    if (sortMode !== 'group') return []
    const groups = new Map<TaskGroupKey, { group: ReturnType<typeof getTaskGroup>; tasks: TaskRow[] }>()
    for (const task of visibleTasks) {
      const group = getTaskGroup(task)
      const existing = groups.get(group.key)
      if (existing) existing.tasks.push(task)
      else groups.set(group.key, { group, tasks: [task] })
    }
    return Array.from(groups.values()).sort((a, b) => a.group.sortWeight - b.group.sortWeight)
  }, [visibleTasks, sortMode])

  const filterActive = view !== 'all' || projectScope !== 'all'
  const sortActive = sortMode !== 'newest'
  const defaultSuggestProjectId = projectScope !== 'all' ? projectScope : projects[0]?.id

  function applyProjectScope(id: string) {
    setProjectScope(id)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (id === 'all') params.delete('project')
    else params.set('project', id)
    const qs = params.toString()
    router.replace(qs ? `/tasks?${qs}` : '/tasks', { scroll: false })
  }

  function openTaskDetail(task: TaskRow) {
    setOpenId(task.id)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('open', task.id)
    if (task.project_id) params.set('project', task.project_id)
    const qs = params.toString()
    router.replace(qs ? `/tasks?${qs}` : '/tasks', { scroll: false })
  }

  function closeTaskDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/tasks?${qs}` : '/tasks', { scroll: false })
  }

  function updateProjectColor(projectId: string, color: string) {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, color } : project))
    window.dispatchEvent(new CustomEvent(PROJECT_COLOR_SYNC_EVENT, { detail: { projectId, color } }))
    void (supabase as any).from('projects').update({ color }).eq('id', projectId)
  }

  const openTask = openId ? tasks.find((t) => t.id === openId) ?? null : null

  const tagroHandler = () => openTagro({
    contextType: 'task',
    id: 'list',
    projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
    title: 'Aufgaben · Übersicht',
    subtitle: pageLeadLine,
  })

  function renderFilterMenu() {
    return (
      <div className="dec-filter-menu" role="menu">
        <p className="dec-filter-menu-label dec-dt">Ansicht</p>
        {TASK_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${view === item.id ? ' on' : ''}`}
            onClick={() => { setView(item.id); setFilterMenuOpen(false) }}
          >
            <span>{item.label}</span>
            {view === item.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
        <p className="dec-filter-menu-label dec-dt">Projekt</p>
        <button
          type="button"
          role="menuitem"
          className={`dec-filter-menu-item${projectScope === 'all' ? ' on' : ''}`}
          onClick={() => { applyProjectScope('all'); setFilterMenuOpen(false) }}
        >
          <span>Alle Projekte</span>
          {projectScope === 'all' && <span className="dec-filter-check">✓</span>}
        </button>
        {projectList.map((project) => (
          <button
            key={project.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${projectScope === project.id ? ' on' : ''}`}
            onClick={() => { applyProjectScope(project.id); setFilterMenuOpen(false) }}
          >
            <span>{project.title}</span>
            {projectScope === project.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  function renderSortMenu() {
    return (
      <div className="dec-filter-menu" role="menu">
        <p className="dec-filter-menu-label dec-dt">Sortieren</p>
        {SORT_OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${sortMode === item.id ? ' on' : ''}`}
            onClick={() => { setSortMode(item.id); setSortMenuOpen(false) }}
          >
            <span>{item.label}</span>
            {sortMode === item.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  function renderTaskList() {
    if (sortMode !== 'group') {
      return visibleTasks.map((task, index) => (
        <TaskCardRow
          key={task.id}
          task={task}
          project={task.project_id ? projectById.get(task.project_id) ?? null : null}
          isLast={index === visibleTasks.length - 1}
          onOpen={(id) => {
            const row = tasks.find((t) => t.id === id)
            if (row) openTaskDetail(row)
          }}
        />
      ))
    }

    return taskCategoryGroups.map((category) => {
      const GroupIcon = TASK_GROUP_ICONS[category.group.key]
      return (
        <section key={category.group.key} className="task-category-section">
          <div className="task-category-head">
            <GroupIcon size={14} weight="regular" />
            <span>{category.group.label}</span>
            <em>{category.tasks.length} {category.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}</em>
          </div>
          {category.tasks.map((task, index) => (
            <TaskCardRow
              key={task.id}
              task={task}
              project={task.project_id ? projectById.get(task.project_id) ?? null : null}
              isLast={index === category.tasks.length - 1}
              onOpen={(id) => {
                const row = tasks.find((t) => t.id === id)
                if (row) openTaskDetail(row)
              }}
            />
          ))}
        </section>
      )
    })
  }

  return (
    <div className="dec-os">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: TASKS_CSS }} />

      {(filterMenuOpen || sortMenuOpen) && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => { setFilterMenuOpen(false); setSortMenuOpen(false) }} />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Aufgaben."
            lead="Was das Projektteam umsetzt — Status kommt live aus dem Dev Panel."
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void loadTasks() },
              { id: 'suggest', label: 'Aufgabe vorschlagen', onClick: () => setSuggestOpen(true) },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroHandler },
            ]}
            actions={(
              <>
                <div className="dec-page-actions-group">
                  <div className="dec-filter-wrap" ref={filterWrapRef}>
                    <button
                      type="button"
                      className={`dec-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                      aria-label="Filter"
                      aria-expanded={filterMenuOpen}
                      onClick={() => { setSortMenuOpen(false); setFilterMenuOpen((v) => !v) }}
                    >
                      <FunnelSimple size={15} weight="regular" />
                    </button>
                    {filterMenuOpen && renderFilterMenu()}
                  </div>
                  <div className="dec-filter-wrap" ref={sortWrapRef}>
                    <button
                      type="button"
                      className={`dec-head-tool${sortMenuOpen || sortActive ? ' on' : ''}`}
                      aria-label="Sortieren"
                      aria-expanded={sortMenuOpen}
                      onClick={() => { setFilterMenuOpen(false); setSortMenuOpen((v) => !v) }}
                    >
                      <SlidersHorizontal size={15} weight="regular" />
                    </button>
                    {sortMenuOpen && renderSortMenu()}
                  </div>
                </div>
                <button
                  type="button"
                  className="task-create-btn"
                  disabled={!hasProjects}
                  onClick={() => setSuggestOpen(true)}
                >
                  <Plus size={14} weight="bold" />
                  Aufgabe vorschlagen
                </button>
                <button type="button" className="dec-head-tool" aria-label="Aktualisieren" onClick={() => void loadTasks()}>
                  <ArrowsClockwise size={15} weight="regular" />
                </button>
              </>
            )}
          />

          <div className="task-filters dec-dt">
            {TASK_VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`task-filter${view === item.id ? ' on' : ''}`}
                onClick={() => setView(item.id)}
              >
                {item.id === 'open' ? `Offen (${counts.open})`
                  : item.id === 'active' ? `In Arbeit (${counts.active})`
                    : item.id === 'decision' ? `Warten (${counts.decision})`
                      : item.id === 'review' ? `Prüfung (${counts.review})`
                        : item.id === 'done' ? `Erledigt (${counts.done})`
                          : 'Alle'}
              </button>
            ))}
          </div>

          <div className="dec-m-actions">
            <div className="dec-m-actions-group">
              <div className="dec-filter-wrap" ref={mobileFilterWrapRef}>
                <button
                  type="button"
                  className={`dec-m-ctl${filterMenuOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => { setSortMenuOpen(false); setFilterMenuOpen((v) => !v) }}
                >
                  <FunnelSimple size={17} weight="regular" />
                </button>
                {filterMenuOpen && renderFilterMenu()}
              </div>
              <button type="button" className="dec-m-ctl" aria-label="Aktualisieren" onClick={() => void loadTasks()}>
                <ArrowsClockwise size={17} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        <div className="dec-scroll-body">
          {!loading && !hasProjects ? (
            <div className="dec-empty">
              <ListChecks size={16} />
              <p>Noch kein Projekt vorhanden</p>
              <small>Aufgaben entstehen innerhalb eines Projekts. Lege zuerst ein Projekt an oder starte ein Briefing mit Tagro.</small>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
                <Link href="/new-project" className="task-create-btn">Erstes Projekt anlegen</Link>
                <Link href="/ai" className="task-filter" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  <Sparkle size={14} weight="fill" />
                  Projektbriefing starten
                </Link>
              </div>
            </div>
          ) : (
            <>
              {hasProjects && tasks.length === 0 && !loading && (
                <div className="task-bridge-banner" role="status">
                  <strong>Dev Panel ↔ Portal</strong>
                  Vorschläge und Briefings landen im Dev Panel. Sobald das Team startet, siehst du hier Status, Fortschritt und Updates — ohne Nachfragen.
                </div>
              )}

              {loading && visibleTasks.length === 0 ? (
                <p className="dec-empty">Lade Aufgaben…</p>
              ) : visibleTasks.length === 0 ? (
                <div className="dec-empty">
                  <FunnelSimple size={14} />
                  <p>{tasks.length === 0 ? 'Noch keine Aufgaben.' : 'Keine Aufgaben in dieser Ansicht.'}</p>
                  <small>
                    {tasks.length === 0
                      ? 'Schlage eine Aufgabe vor — sie erscheint im Dev Panel und hier, sobald die Umsetzung läuft.'
                      : 'Passe den Filter an oder wähle ein anderes Projekt.'}
                  </small>
                  {tasks.length === 0 && hasProjects && (
                    <button type="button" className="task-create-btn" style={{ marginTop: 16 }} onClick={() => setSuggestOpen(true)}>
                      <Plus size={14} weight="bold" />
                      Erste Aufgabe vorschlagen
                    </button>
                  )}
                </div>
              ) : renderTaskList()}
            </>
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'task',
            id: 'list',
            projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
            title: 'Aufgaben · Übersicht',
            subtitle: pageLeadLine,
          }}
        />
      </div>

      <MobilePageDock
        onDragUp={() => setSuggestOpen(true)}
        primary={{
          id: 'suggest',
          label: 'Aufgabe vorschlagen…',
          icon: <Plus size={14} weight="bold" />,
          onClick: () => setSuggestOpen(true),
          ariaLabel: 'Aufgabe vorschlagen',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />

      <TaskSuggestModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        projects={projects}
        defaultProjectId={defaultSuggestProjectId}
        onCreated={() => void loadTasks()}
        onProjectColorChange={updateProjectColor}
      />

      {openTask && (
        <TaskDrawer
          taskId={openTask.id}
          projectId={openTask.project_id}
          title={openTask.title}
          onClose={closeTaskDrawer}
        />
      )}
    </div>
  )
}
