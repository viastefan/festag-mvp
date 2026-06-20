'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTaskGroup, type TaskGroupKey } from '@/lib/tasks/groups'
import { isCompletedTaskStillFresh } from '@/lib/tasks/status'
import {
  Check,
  Article,
  Code,
  FileText,
  FunnelSimple,
  Gauge,
  Globe,
  ListChecks,
  MagnifyingGlass,
  Palette,
  Plugs,
  Plus,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react'
import EmptyState from '@/components/EmptyState'
import HelpHint from '@/components/HelpHint'
import TagroEntryButton from '@/components/TagroEntryButton'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import { TASKS_CSS } from '@/components/tasks/tasks-styles'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import {
  clientProgress,
  clientStatusLabelDe,
  clientSummaryText,
  clientViewBucket,
  resolveClientVisibleStatus,
} from '@/lib/tasks/client-view'
import { openTagro } from '@/components/TagroOverlay'
import { PencilSimple, ArrowsClockwise } from '@phosphor-icons/react'

type TaskView = 'all' | 'open' | 'active' | 'decision' | 'review' | 'done'
type SortMode = 'newest' | 'updated' | 'priority' | 'project' | 'group'
type ComposerMode = 'tagro' | 'manual'

type TaskRow = {
  id: string
  title: string
  status: string | null
  priority?: string | null
  customer_update?: string | null
  dev_notes?: string | null
  project_id?: string | null
  assigned_to?: string | null
  owner?: string | null
  developer_name?: string | null
  source?: string | null
  task_type?: string | null
  group_key?: string | null
  client_status?: string | null
  dev_status?: string | null
  client_visible_status?: string | null
  tagro_client_summary?: string | null
  audience?: string | null
  client_visible?: boolean | null
  latest_client_update?: string | null
  latest_dev_update?: string | null
  due_date?: string | null
  progress?: number | null
  updated_at?: string | null
  created_at?: string | null
  completed_at?: string | null
}

type ProjectRow = {
  id: string
  title: string
  color?: string | null
}

type TagroPreview = {
  client_summary?: string
  suggested_title?: string
  suggested_description?: string
  priority?: string
  possible_dev_interpretation?: string
  possible_dev_tasks?: string[]
  risks?: string[]
  open_questions?: string[]
  recommended_next_step?: string
  confidence_score?: number
}

const PRIORITY_OPTIONS = [
  { id: 'none', label: 'Keine Priorität' },
  { id: 'critical', label: 'Kritisch' },
  { id: 'high', label: 'Hoch' },
  { id: 'medium', label: 'Mittel' },
  { id: 'low', label: 'Niedrig' },
]

const VIEWS: { id: TaskView; label: string }[] = [
  { id: 'all', label: 'Alle Aufgaben' },
  { id: 'open', label: 'Offen' },
  { id: 'active', label: 'In Arbeit' },
  { id: 'decision', label: 'Warten' },
  { id: 'review', label: 'In Prüfung' },
  { id: 'done', label: 'Erledigt' },
]

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Neueste zuerst' },
  { id: 'updated', label: 'Letztes Update' },
  { id: 'priority', label: 'Priorität' },
  { id: 'project', label: 'Projekt' },
  { id: 'group', label: 'Nach Gruppen ordnen' },
]

const PROJECT_COLOR_SYNC_EVENT = 'festag-project-color-change'
const STATE_POPOVER_ID = 'task-state-popover'

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

function projectAccentColor(id?: string | null, color?: string | null) {
  if (color && color !== 'var(--text-muted)' && color !== 'var(--task-soft-text)') return color
  return '#64748b'
}

function taskBucket(task: TaskRow) {
  return clientViewBucket(resolveClientVisibleStatus(task))
}

function statusLabel(task: TaskRow) {
  return clientStatusLabelDe(resolveClientVisibleStatus(task))
}

function priorityLabel(priority?: string | null) {
  if (!priority) return '---'
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'medium') return 'Mittel'
  if (priority === 'low') return 'Niedrig'
  return priority
}

function sourceLabel(source?: string | null) {
  if (source === 'client_manual') return 'Manuell erstellt'
  if (source === 'client_tagro') return 'Von Tagro vorbereitet'
  if (source === 'status_report') return 'Aus Statusbericht'
  if (source === 'decision') return 'Aus Entscheidung'
  if (source === 'admin' || source === 'developer') return 'Vom Projektteam'
  if (source === 'briefing') return 'Aus Briefing'
  if (source === 'github_activity' || source === 'tagro_internal' || source === 'system') return 'System'
  return 'System'
}

function dateLabel(value?: string | null) {
  if (!value) return '---'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '---'
  }
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="task-empty" style={{ padding: 48 }}>Aufgaben werden geladen…</div>}>
      <TasksPageInner />
    </Suspense>
  )
}

function TasksPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [view, setView] = useState<TaskView>('all')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  // Project scope — 'all' (default) or a single project id. Same UX
  // pattern as the dashboard briefing dropdown so users don't have to
  // re-learn how scoping works across the app.
  const [projectScope, setProjectScope] = useState<string>('all')
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<ComposerMode>('tagro')
  const [suggestProjectId, setSuggestProjectId] = useState('')
  const [suggestTitle, setSuggestTitle] = useState('')
  const [suggestDescription, setSuggestDescription] = useState('')
  const [suggestPriority, setSuggestPriority] = useState('none')
  const [suggestDueDate, setSuggestDueDate] = useState('')
  const [suggestLabelInput, setSuggestLabelInput] = useState('')
  const [suggestLabels, setSuggestLabels] = useState<string[]>([])
  const [creatingSuggestion, setCreatingSuggestion] = useState(false)
  const [composerNotice, setComposerNotice] = useState('')
  const [tagroPreview, setTagroPreview] = useState<TagroPreview | null>(null)
  const [activeStatePopoverTaskId, setActiveStatePopoverTaskId] = useState<string | null>(null)
  const [statePopoverAnchor, setStatePopoverAnchor] = useState<{ left: number; top: number } | null>(null)
  const taskToolsRef = useRef<HTMLDivElement | null>(null)

  const supabase = createClient()

  async function loadTasks() {
    setLoading(true)
    try {
      const qs = projectScope !== 'all' ? `?projectId=${encodeURIComponent(projectScope)}` : ''
      const res = await fetch(`/api/client/tasks${qs}`)
      const data = await res.json()
      if (res.ok) {
        setTasks((data.tasks as TaskRow[]) ?? [])
        setProjects((data.projects as ProjectRow[]) ?? [])
        setSuggestProjectId((current) => current || ((data.projects as ProjectRow[] | null)?.[0]?.id ?? ''))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()

    const channel = supabase
      .channel('client-tasks-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectScope])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
    const project = searchParams?.get('project')
    if (project) setProjectScope(project)
  }, [searchParams])

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]))
  }, [projects])
  const hasProjects = projects.length > 0

  useEffect(() => {
    function closeFloatingMenus(event: PointerEvent) {
      const targetNode = event.target as Node | null
      const targetElement = event.target instanceof Element ? event.target : null
      if (!targetElement?.closest('.task-state-wrap, .task-state-popover')) {
        closeStatePopover()
      }
      if (targetNode && taskToolsRef.current?.contains(targetNode)) return
      setFilterMenuOpen(false)
      setSortMenuOpen(false)
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setFilterMenuOpen(false)
      setSortMenuOpen(false)
      closeStatePopover()
    }

    document.addEventListener('pointerdown', closeFloatingMenus)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeFloatingMenus)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [])

  useEffect(() => {
    if (!activeStatePopoverTaskId) return

    function closeOnViewportMove() {
      closeStatePopover()
    }

    window.addEventListener('resize', closeOnViewportMove)
    window.addEventListener('scroll', closeOnViewportMove, true)
    return () => {
      window.removeEventListener('resize', closeOnViewportMove)
      window.removeEventListener('scroll', closeOnViewportMove, true)
    }
  }, [activeStatePopoverTaskId])

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

  function updateProjectColor(projectId: string, color: string) {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, color } : project))
    window.dispatchEvent(new CustomEvent(PROJECT_COLOR_SYNC_EVENT, { detail: { projectId, color } }))
    void (supabase as any).from('projects').update({ color }).eq('id', projectId)
  }

  // Reset scope if the selected project disappears (e.g. deleted).
  useEffect(() => {
    if (projectScope === 'all') return
    if (!projects.find(p => p.id === projectScope)) setProjectScope('all')
  }, [projects, projectScope])

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
        if (sortMode === 'priority') return (priorityRank[a.priority || ''] ?? 9) - (priorityRank[b.priority || ''] ?? 9)
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
      if (existing) {
        existing.tasks.push(task)
      } else {
        groups.set(group.key, { group, tasks: [task] })
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.group.sortWeight - b.group.sortWeight)
  }, [visibleTasks, sortMode])

  const scopedProject = projectScope === 'all' ? null : projects.find(p => p.id === projectScope)
  const scopeLabel = scopedProject?.title ?? 'Alle Projekte'

  const doneCount = tasks.filter((task) => taskBucket(task) === 'done').length
  const reviewCount = tasks.filter((task) => taskBucket(task) === 'review').length
  const decisionCount = tasks.filter((task) => taskBucket(task) === 'decision').length
  const activeCount = tasks.filter((task) => taskBucket(task) === 'active').length
  const openCount = tasks.filter((task) => taskBucket(task) === 'open').length

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

  const openTask = openId ? tasks.find(t => t.id === openId) ?? null : null

  function closeStatePopover() {
    setActiveStatePopoverTaskId(null)
    setStatePopoverAnchor(null)
  }

  function openStatePopover(taskId: string, anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect()
    const preferredLeft = rect.right + 8
    const maxLeft = Math.max(12, window.innerWidth - 292)
    setActiveStatePopoverTaskId(taskId)
    setStatePopoverAnchor({
      left: Math.min(preferredLeft, maxLeft),
      top: rect.top + rect.height / 2,
    })
  }

  function resetComposer() {
    setSuggestTitle('')
    setSuggestDescription('')
    setSuggestPriority('none')
    setSuggestDueDate('')
    setSuggestLabelInput('')
    setSuggestLabels([])
    setComposerMode('tagro')
    setComposerNotice('')
    setTagroPreview(null)
  }

  function closeComposer() {
    setComposerOpen(false)
    resetComposer()
  }

  function renderTaskRow(task: TaskRow, rowIndex: number) {
    const normalized = taskBucket(task)
    const isDone = normalized === 'done'
    const progress = clientProgress(task)
    const lead = task.developer_name || task.owner || task.assigned_to || 'Entwickler'
    const group = getTaskGroup(task)
    const GroupIcon = TASK_GROUP_ICONS[group.key]
    const motionIndex = Math.min(rowIndex, 6)

    return (
      <div
        key={task.id}
        className={`task-row task-row-flat${activeStatePopoverTaskId === task.id ? ' state-open' : ''}`}
        role="button"
        tabIndex={0}
        style={{ ['--row-index' as string]: motionIndex, ['--task-group-color' as string]: group.color }}
        onClick={() => openTaskDetail(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openTaskDetail(task)
          }
        }}
      >
        <div className="task-group-cell" title={group.label}>
          <span className="task-group-icon">
            <GroupIcon size={14} weight="regular" />
          </span>
        </div>
        <div className="task-name">
          <span className={`task-state-wrap${activeStatePopoverTaskId === task.id ? ' is-open' : ''}`}>
            <button
              type="button"
              className={`task-state-mark${isDone ? ' done' : ''}`}
              aria-label={isDone ? 'Erledigt-Logik anzeigen' : 'Status-Logik anzeigen'}
              aria-expanded={activeStatePopoverTaskId === task.id}
              aria-controls={STATE_POPOVER_ID}
              aria-haspopup="dialog"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (activeStatePopoverTaskId === task.id) {
                  closeStatePopover()
                } else {
                  openStatePopover(task.id, event.currentTarget)
                }
              }}
              onKeyDown={(event) => {
                event.stopPropagation()
              }}
            >
              {isDone ? <Check size={9} weight="bold" /> : null}
            </button>
            {activeStatePopoverTaskId === task.id ? (
              <span
                id={STATE_POPOVER_ID}
                className="task-state-popover is-open"
                role="dialog"
                aria-label="Erledigt-Logik"
                style={statePopoverAnchor ? {
                  ['--state-popover-left' as string]: `${statePopoverAnchor.left}px`,
                  ['--state-popover-top' as string]: `${statePopoverAnchor.top}px`,
                } : undefined}
                onClick={(event) => event.stopPropagation()}
              >
                <strong>So funktioniert Erledigt</strong>
                <span>Tagro oder der Developer haken Aufgaben ab. Erledigte Aufgaben bleiben 24h sichtbar und verschwinden dann nur aus Standardansichten. Eigene Aufgaben kannst du löschen.</span>
              </span>
            ) : null}
          </span>
          <span className="task-name-text">
            <strong>{task.title}</strong>
          </span>
        </div>

        <div className={`task-health ${normalized}`}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clientSummaryText(task)}
          </span>
        </div>

        <div>{priorityLabel(task.priority)}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span className="task-lead-avatar">{lead.charAt(0).toUpperCase()}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead}</span>
        </div>

        <div>{dateLabel(task.updated_at || task.created_at)}</div>
        <div>{sourceLabel(task.source)}</div>

        <div className="task-progress" title={statusLabel(task)}>
          <span className={`task-progress-dot ${normalized}`} />
          <span>{normalized === 'done' ? '100%' : `${progress}%`}</span>
        </div>
      </div>
    )
  }

  function addSuggestionLabel() {
    const label = suggestLabelInput.trim()
    if (!label || suggestLabels.includes(label)) return
    setSuggestLabels((current) => [...current, label])
    setSuggestLabelInput('')
  }

  async function createSuggestedTask(options: { regenerate?: boolean } = {}) {
    const title = suggestTitle.trim()
    const description = suggestDescription.trim()
    const fallbackTitle = description.split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '')
    const finalTitle = title || fallbackTitle
    if (!hasProjects) {
      setComposerNotice('Du brauchst zuerst ein Projekt, bevor du Aufgaben oder Wünsche hinzufügen kannst.')
      return
    }
    if (!finalTitle || !suggestProjectId || creatingSuggestion) return

    setCreatingSuggestion(true)
    setComposerNotice('')
    try {
      const response = await fetch('/api/tagro/task-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: suggestProjectId,
          mode: composerMode,
          title: finalTitle,
          description: options.regenerate
            ? `${description || finalTitle}\n\nBitte formuliere den Vorschlag noch kürzer, klarer und prüfbarer.`
            : description,
          priority: suggestPriority === 'none' ? null : suggestPriority,
          dueDate: suggestDueDate || null,
          labels: suggestLabels,
          proposal: options.regenerate ? null : tagroPreview,
          confirmCreate: composerMode === 'manual' || (!options.regenerate && Boolean(tagroPreview)),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) {
        setComposerNotice(result.error === 'project_id_required'
          ? 'Du brauchst zuerst ein Projekt, bevor du Aufgaben oder Wünsche hinzufügen kannst.'
          : 'Der Vorschlag konnte gerade nicht verarbeitet werden.')
        return
      }

      if (composerMode === 'tagro' && (!tagroPreview || options.regenerate) && result.proposal) {
        setTagroPreview(result.proposal)
        return
      }

      if (result.task) {
        closeComposer()
        await loadTasks()
      }
    } catch {
      setComposerNotice('Der Vorschlag konnte gerade nicht verarbeitet werden.')
    } finally {
      setCreatingSuggestion(false)
    }
  }

  function openComposer() {
    if (!hasProjects) {
      setComposerNotice('Du brauchst zuerst ein Projekt, bevor du Aufgaben oder Wünsche hinzufügen kannst.')
      return
    }
    setComposerOpen((open) => !open)
  }

  const tagroTasks = () => openTagro({
    contextType: 'empty',
    id: 'tasks',
    title: 'Tasks · Übersicht',
    subtitle: `${openCount} offen · ${activeCount} in Arbeit`,
  })

  return (
    <div className="task-os mcl-page">
      <style>{TASKS_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="task-m-shell">
      <div className="task-static-top">
        <header className="mcl-head task-m-head">
          <div className="mcl-head-copy">
            <h1>
              <span className="mcl-m">Aktuelle Aufgaben.</span>
            </h1>
            <p className="mcl-page-sub"><span className="mcl-m">Alles auf einen Blick.</span></p>
          </div>
          <div className="mcl-head-actions">
            <CodexMobileActionPill
              onMenu={() => setNavOpen(true)}
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            />
          </div>
        </header>

        <div className="mcl-actions task-m-actions">
          <button type="button" className="mcl-add-btn" aria-label="Neue Aufgabe" disabled={!hasProjects} onClick={openComposer}>
            <Plus size={18} weight="bold" />
          </button>
          <div className="mcl-actions-group">
            <button
              type="button"
              className={`mcl-ctl${filterMenuOpen ? ' on' : ''}${view !== 'all' ? ' has-active' : ''}`}
              aria-label="Filter"
              aria-expanded={filterMenuOpen}
              onClick={() => { setFilterMenuOpen(v => !v); setSortMenuOpen(false) }}
            >
              <FunnelSimple size={17} weight="regular" />
            </button>
            <button
              type="button"
              className={`mcl-ctl${sortMenuOpen ? ' on' : ''}${sortMode !== 'newest' ? ' has-active' : ''}`}
              aria-label="Sortieren"
              aria-expanded={sortMenuOpen}
              onClick={() => { setSortMenuOpen(v => !v); setFilterMenuOpen(false) }}
            >
              <SlidersHorizontal size={17} weight="regular" />
            </button>
            <button type="button" className="mcl-ctl" aria-label="Aktualisieren" onClick={() => void loadTasks()}>
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
          {filterMenuOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Ansicht</p>
                {VIEWS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`mcl-filter-item${view === item.id ? ' on' : ''}`}
                    onClick={() => { setView(item.id); setFilterMenuOpen(false) }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
            </>
          )}
          {sortMenuOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Sortieren</p>
                {SORT_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`mcl-filter-item${sortMode === item.id ? ' on' : ''}`}
                    onClick={() => { setSortMode(item.id); setSortMenuOpen(false) }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setSortMenuOpen(false)} />
            </>
          )}
        </div>

        <div className="task-legacy-mph">
        {/* Mobile-only Linear-style header (replaces .task-top on phones). */}
        <MobilePageHeader
          title="Tasks"
          primaryIcon={PencilSimple}
          primaryLabel="Neue Aufgabe"
          onPrimary={() => openComposer()}
          menuItems={[
            { id: 'refresh', label: 'Aktualisieren', onClick: () => setView(view) },
          ]}
        />
        </div>
        <header className="task-festag-head">
          <div className="task-festag-head-copy">
            <h1 className="task-festag-title">Aktuelle Aufgaben.</h1>
            <p className="task-festag-lead">{openCount} offen · {activeCount} in Arbeit · {reviewCount} in Prüfung</p>
          </div>
        </header>
        <div className="task-top">
          <div className="task-top-left">
            <span style={{ display:'inline-flex', alignItems:'center', gap:7, minWidth:0 }}>
              <HelpHint
                title="Aufgaben"
                description="Aufgaben und Wünsche zu deinen Projekten. Tagro ordnet neue Vorschläge ein und bereitet sie prüfbar für die Umsetzung vor."
              />
            </span>
            {/* Project scope dropdown — same UX as the dashboard's
                "Gesamtbericht für alle Projekte" so users can narrow
                down to a single project without losing the table. */}
            {hasProjects && (
              <div className="task-scope">
                <button
                  type="button"
                  className="task-scope-trigger"
                  onClick={() => setScopeMenuOpen(v => !v)}
                  aria-expanded={scopeMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span>{scopeLabel}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {scopeMenuOpen && (
                  <>
                    <button type="button" className="task-scope-backdrop" aria-hidden onClick={() => setScopeMenuOpen(false)} />
                    <div className="task-scope-menu" role="listbox">
                      <button
                        type="button"
                        role="option"
                        aria-selected={projectScope === 'all'}
                        className={`task-scope-opt${projectScope === 'all' ? ' on' : ''}`}
                        onClick={() => { setProjectScope('all'); setScopeMenuOpen(false) }}
                      >
                        <span className="task-scope-dot" />
                        <span className="task-scope-main">
                          <strong>Alle Projekte</strong>
                          <small>{tasks.length} Task{tasks.length === 1 ? '' : 's'} insgesamt</small>
                        </span>
                        {projectScope === 'all' ? <Check size={12} weight="bold" /> : null}
                      </button>
                      {projects.length > 0 && <div className="task-scope-divider" />}
                      {projects.map(p => {
                        const taskCount = tasks.filter(t => t.project_id === p.id).length
                        return (
                          <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={projectScope === p.id}
                            className={`task-scope-opt${projectScope === p.id ? ' on' : ''}`}
                            onClick={() => { setProjectScope(p.id); setScopeMenuOpen(false) }}
                          >
                            <span className="task-scope-dot" style={{ background: p.color || 'var(--text-muted)' }} />
                            <span className="task-scope-main">
                              <strong>{p.title}</strong>
                              <small>{taskCount} Task{taskCount === 1 ? '' : 's'}</small>
                            </span>
                            {projectScope === p.id ? <Check size={12} weight="bold" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="task-create" type="button" aria-label="Neue Aufgabe vorschlagen" disabled={!hasProjects} onClick={openComposer}>
            <span>Aufgabe vorschlagen</span>
            <span className="task-create-plus" aria-hidden="true">+</span>
          </button>
        </div>

        <div className="task-toolbar">
        <div className="task-filters" role="tablist" aria-label="Aufgabenfilter">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`task-filter${view === item.id ? ' on' : ''}`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="task-count-summary">
            {openCount} offen · {activeCount} in Arbeit · {decisionCount} warten · {reviewCount} Prüfung · {doneCount} erledigt
          </span>
        </div>
        <div className="task-tools" ref={taskToolsRef}>
          <div className="task-tool-wrap">
            <button className={`task-tool${filterMenuOpen ? ' on' : ''}`} type="button" aria-label="Aufgaben filtern" onClick={() => { setFilterMenuOpen(v => !v); setSortMenuOpen(false) }}>
              <FunnelSimple size={15} />
            </button>
            {filterMenuOpen && (
              <div className="task-menu">
                {VIEWS.map((item) => (
                  <button key={item.id} type="button" className={view === item.id ? 'on' : ''} onClick={() => { setView(item.id); setFilterMenuOpen(false) }}>
                    <span>{item.label}</span>
                    {view === item.id ? <span>✓</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="task-tool-wrap">
            <button className={`task-tool${sortMenuOpen ? ' on' : ''}`} type="button" aria-label="Aufgaben sortieren" onClick={() => { setSortMenuOpen(v => !v); setFilterMenuOpen(false) }}>
              <SlidersHorizontal size={15} />
            </button>
            {sortMenuOpen && (
              <div className="task-menu">
                {SORT_OPTIONS.map((item) => (
                  <button key={item.id} type="button" className={sortMode === item.id ? 'on' : ''} onClick={() => { setSortMode(item.id); setSortMenuOpen(false) }}>
                    <span>{item.label}</span>
                    {sortMode === item.id ? <span>✓</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Tagro entry on the tasks list — context = current scope. */}
          <TagroEntryButton
            context={{
              contextType: 'task',
              id: 'list',
              title: 'Tasks · Übersicht',
              subtitle: `${openCount} offen · ${activeCount} in Arbeit`,
            }}
          />
        </div>
        </div>
      </div>

      <div className="task-scroll-body">
      {!loading && !hasProjects && (
        <div>
          <EmptyState
            icon={ListChecks}
            kicker="Aufgaben"
            title="Noch kein Projekt vorhanden"
            description="Aufgaben entstehen innerhalb eines Projekts. Lege zuerst ein Projekt an oder starte ein Briefing mit Tagro."
            actions={[
              { label: 'Erstes Projekt anlegen', icon: Plus, primary: true, href: '/new-project' },
              { label: 'Projektbriefing starten', icon: Sparkle, href: '/ai' },
            ]}
          />
          {composerNotice ? <div className="task-notice" style={{ marginTop: 14, textAlign:'center' }}>{composerNotice}</div> : null}
        </div>
      )}

      {composerOpen && (
        <section className="task-composer" aria-label="Aufgabe vorschlagen">
          <div className="task-composer-top">
            <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
              <label className="task-project-select">
                <span
                  className="task-project-ring"
                  style={{ ['--project-ring' as string]: projectAccentColor(suggestProjectId, projectById.get(suggestProjectId)?.color) }}
                  title="Projektfarbe ändern"
                >
                  <input
                    aria-label="Projektfarbe ändern"
                    type="color"
                    value={projectAccentColor(suggestProjectId, projectById.get(suggestProjectId)?.color).startsWith('#') ? projectAccentColor(suggestProjectId, projectById.get(suggestProjectId)?.color) : '#64748b'}
                    onChange={(event) => suggestProjectId && updateProjectColor(suggestProjectId, event.target.value)}
                  />
                </span>
                <select value={suggestProjectId} onChange={(event) => setSuggestProjectId(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </label>
              <span style={{ color:'var(--task-soft-text)', fontSize:12 }}>›</span>
              <span className="task-composer-title">
                <strong>Neue Aufgabe</strong>
              </span>
            </div>
            <button className="task-plus" type="button" aria-label="Vorschlag schließen" onClick={closeComposer}>
              <X size={15} weight="bold" />
            </button>
          </div>

          <div className="task-composer-body">
            <div className="task-mode-tabs" role="tablist" aria-label="Vorschlagmodus">
              <button type="button" className={composerMode === 'tagro' ? 'on' : ''} onClick={() => { setComposerMode('tagro'); setTagroPreview(null); setComposerNotice('') }}>
                Mit Tagro prüfen
              </button>
              <button type="button" className={composerMode === 'manual' ? 'on' : ''} onClick={() => { setComposerMode('manual'); setTagroPreview(null); setComposerNotice('') }}>
                Manuell
              </button>
            </div>

            {composerNotice ? <div className="task-notice">{composerNotice}</div> : null}
            {tagroPreview && (
              <div className="task-preview">
                <span className="task-preview-avatar">V</span>
                <div className="task-preview-bubble">
                  <span className="task-preview-kicker">Tagro Vorschlag</span>
                  <strong>{tagroPreview.suggested_title || 'Geprüfte Aufgabe'}</strong>
                  <p>{tagroPreview.client_summary || tagroPreview.suggested_description}</p>
                  {tagroPreview.possible_dev_interpretation ? <p>Mögliche Umsetzung: {tagroPreview.possible_dev_interpretation}</p> : null}
                  {tagroPreview.open_questions?.length ? (
                    <ul>
                      {tagroPreview.open_questions.slice(0, 3).map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  ) : null}
                  {tagroPreview.risks?.length ? (
                    <p>Risiko: {tagroPreview.risks.slice(0, 2).join(' · ')}</p>
                  ) : null}
                  <div className="task-preview-actions">
                    <button type="button" onClick={() => { setTagroPreview(null); setComposerNotice('Vorschlag verworfen. Du kannst den Text anpassen oder neu prüfen lassen.') }}>
                      Ablehnen
                    </button>
                    <button type="button" onClick={() => createSuggestedTask({ regenerate: true })} disabled={creatingSuggestion}>
                      Neu formulieren
                    </button>
                    <button type="button" className="primary" onClick={() => createSuggestedTask()} disabled={creatingSuggestion}>
                      Vorschlag übernehmen
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              className="task-composer-field title"
              value={suggestTitle}
              onChange={(event) => { setSuggestTitle(event.target.value); setTagroPreview(null) }}
              placeholder="Aufgabe kurz benennen…"
              autoFocus
            />
            <textarea
              className="task-composer-field description"
              value={suggestDescription}
              onChange={(event) => { setSuggestDescription(event.target.value); setTagroPreview(null) }}
              placeholder="Beschreibe Ziel, Kontext oder gewünschte Änderung…"
            />
          </div>

          <div className="task-chip-row">
            <span className="task-composer-chip has-value">
              <span style={{ width:7, height:7, borderRadius:'50%', border:'1.5px solid currentColor', opacity:.72 }} />
              Zur Prüfung
            </span>
            <label className={`task-composer-chip ${suggestPriority !== 'none' ? 'has-value' : ''}`}>
              Priorität
              <select className="task-chip-field" value={suggestPriority} onChange={(event) => setSuggestPriority(event.target.value)}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.id} value={priority.id}>{priority.label}</option>
                ))}
              </select>
            </label>
            <label className={`task-composer-chip ${suggestDueDate ? 'has-value' : ''}`}>
              Datum
              <input className="task-chip-field" type="date" value={suggestDueDate} onChange={(event) => setSuggestDueDate(event.target.value)} />
            </label>
            <label className="task-composer-chip">
              Label
              <input
                className="task-chip-field"
                value={suggestLabelInput}
                onChange={(event) => setSuggestLabelInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addSuggestionLabel()
                  }
                }}
                placeholder="Hinzufügen"
                style={{ width:72 }}
              />
            </label>
            {suggestLabels.map((label) => (
              <span key={label} className="task-composer-chip has-value">
                {label}
                <button
                  type="button"
                  onClick={() => setSuggestLabels((current) => current.filter((item) => item !== label))}
                  style={{ border:0, background:'transparent', color:'inherit', cursor:'pointer', padding:0, display:'flex' }}
                  aria-label={`${label} entfernen`}
                >
                  <X size={11} weight="bold" />
                </button>
              </span>
            ))}
          </div>

          <div className="task-composer-footer">
            <span />
            <div className="task-composer-actions">
              <button type="button" onClick={closeComposer}>Abbrechen</button>
              <button
                type="button"
                className="primary"
                onClick={() => createSuggestedTask()}
                disabled={creatingSuggestion || !suggestProjectId || (!suggestTitle.trim() && !suggestDescription.trim())}
              >
                {creatingSuggestion ? 'Sende...' : composerMode === 'tagro' ? (tagroPreview ? 'Vorschlag übernehmen' : 'Mit Tagro vorbereiten') : 'Manuell erstellen'}
              </button>
            </div>
          </div>
        </section>
      )}

      {hasProjects && <div className="task-table">
        {/* Column header only with rows — never above an empty/loading state. */}
        {!loading && visibleTasks.length > 0 && (
          <div className="task-head">
            <span aria-hidden />
            <span>Task</span>
            <span>Letztes Update</span>
            <span>Priorität</span>
            <span>Verantwortlich</span>
            <span>Update</span>
            <span>Quelle</span>
            <span>Fortschritt</span>
          </div>
        )}

        {loading ? (
          <div className="task-empty">Lade Aufgaben…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="task-empty">Keine Aufgaben in dieser Ansicht.</div>
        ) : sortMode !== 'group' ? (
          visibleTasks.map((task, rowIndex) => renderTaskRow(task, rowIndex))
        ) : taskCategoryGroups.map((category, sectionIndex) => {
          const GroupIcon = TASK_GROUP_ICONS[category.group.key]
          return (
            <section
              key={category.group.key}
              className="task-category-section"
              style={{
                ['--section-index' as string]: sectionIndex,
                ['--task-group-color' as string]: category.group.color,
              }}
            >
              <div className="task-category-head">
                <span className="task-category-icon">
                  <GroupIcon size={14} weight="regular" />
                </span>
                <span>{category.group.label}</span>
                <em>{category.tasks.length} {category.tasks.length === 1 ? 'Task' : 'Tasks'}</em>
              </div>
              {category.tasks.map((task, rowIndex) => renderTaskRow(task, sectionIndex * 100 + rowIndex))}
            </section>
          )
        })}
      </div>}

      </div>
      </div>

      <MobilePageDock
        onDragUp={openComposer}
        primary={{
          id: 'new-task',
          label: 'Neue Aufgabe...',
          icon: <Plus size={14} weight="bold" />,
          onClick: openComposer,
          ariaLabel: 'Neue Aufgabe',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroTasks,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
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
