'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

type TaskView = 'all' | 'open' | 'active' | 'decision' | 'review' | 'done'
type SortMode = 'newest' | 'updated' | 'priority' | 'project'
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

type VeyraPreview = {
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
]

const DONE_STATES = new Set(['done', 'completed', 'delivered', 'erledigt'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'development', 'in_development'])
const DECISION_STATES = new Set(['blocked', 'waiting', 'needs_decision', 'client_decision', 'waiting_for_client', 'waiting_for_assignment'])
const REVIEW_STATES = new Set(['review', 'ready_for_review', 'in_review', 'festag_review', 'suggested', 'zur_pruefung', 'verified', 'approved', 'festag_checked'])
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

function normalizeStatus(status?: string | null) {
  const value = (status || 'todo').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (REVIEW_STATES.has(value)) return 'review'
  if (DECISION_STATES.has(value)) return 'decision'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

function taskState(task: TaskRow) {
  return task.client_status || task.status || task.dev_status || 'submitted'
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'done') return 'Erledigt'
  if (normalized === 'review') return 'In Prüfung'
  if (normalized === 'decision') return 'Warten'
  if (normalized === 'active') return 'In Arbeit'
  return 'Offen'
}

function progressFor(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'done') return 100
  if (normalized === 'review') return 82
  if (normalized === 'decision') return 40
  if (normalized === 'active') return 55
  return 0
}

function healthLabel(task: TaskRow) {
  if (task.latest_client_update) return task.latest_client_update
  if (task.customer_update) return task.customer_update
  const normalized = normalizeStatus(taskState(task))
  const raw = taskState(task).toLowerCase()
  if (normalized === 'done') return 'Erledigt'
  if (raw === 'verified' || raw === 'approved' || raw === 'festag_checked') return 'Von Festag geprüft'
  if (normalized === 'review') return raw === 'suggested' ? 'Zur Prüfung vorgeschlagen' : 'Festag prüft die Umsetzung'
  if (raw === 'waiting_for_assignment') return 'Wartet auf Zuweisung'
  if (normalized === 'decision') return 'Wartet auf deine Entscheidung'
  if (normalized === 'active') return 'Entwickler arbeitet daran'
  return 'Veyra hat die Aufgabe geplant'
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
  if (source === 'client_tagro') return 'Von Veyra vorbereitet'
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
  const router = useRouter()
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
  const [tagroPreview, setVeyraPreview] = useState<VeyraPreview | null>(null)
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])
  const [activeStatePopoverTaskId, setActiveStatePopoverTaskId] = useState<string | null>(null)
  const hasSeededProjectGroupsRef = useRef(false)
  const taskToolsRef = useRef<HTMLDivElement | null>(null)

  const supabase = createClient()

  async function loadTasks() {
    setLoading(true)
    const [{ data: taskData }, { data: projectData }] = await Promise.all([
      (supabase as any).from('tasks').select('*').order('created_at', { ascending: false }).limit(80),
      (supabase as any).from('projects').select('id,title,color'),
    ])
    setTasks((taskData as TaskRow[]) ?? [])
    setProjects((projectData as ProjectRow[]) ?? [])
    setSuggestProjectId((current) => current || ((projectData as ProjectRow[] | null)?.[0]?.id ?? ''))
    setLoading(false)
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
  }, [])

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

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]))
  }, [projects])
  const hasProjects = projects.length > 0

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
        const normalized = normalizeStatus(taskState(task))
        if (view === 'all') return normalized !== 'done' || isCompletedTaskStillFresh(task)
        return normalizeStatus(taskState(task)) === view
      })
      .sort((a, b) => {
        if (sortMode === 'priority') return (priorityRank[a.priority || ''] ?? 9) - (priorityRank[b.priority || ''] ?? 9)
        if (sortMode === 'project') {
          const pa = a.project_id ? projectById.get(a.project_id)?.title || '' : ''
          const pb = b.project_id ? projectById.get(b.project_id)?.title || '' : ''
          return pa.localeCompare(pb)
        }
        const field = sortMode === 'updated' ? 'updated_at' : 'created_at'
        return new Date((b as any)[field] || b.created_at || 0).getTime() - new Date((a as any)[field] || a.created_at || 0).getTime()
      })
  }, [tasks, view, sortMode, projectById, projectScope])

  const taskCategoryGroups = useMemo(() => {
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
  }, [visibleTasks])

  const scopedProject = projectScope === 'all' ? null : projects.find(p => p.id === projectScope)
  const scopeLabel = scopedProject?.title ?? 'Alle Projekte'

  const taskProjectGroups = useMemo(() => {
    const fallbackProject = { id: 'projectless', title: 'Ohne Projekt', color: '#4E5567' }
    const groupMap = new Map<string, { id: string; title: string; color?: string | null; tasks: TaskRow[] }>()
    const orderedProjects = [...projects].sort((a, b) => a.title.localeCompare(b.title, 'de'))

    for (const project of orderedProjects) {
      groupMap.set(project.id, { id: project.id, title: project.title, color: projectAccentColor(project.id, project.color), tasks: [] })
    }

    for (const task of visibleTasks) {
      const project = task.project_id ? projectById.get(task.project_id) : null
      const id = project?.id || fallbackProject.id
      if (!groupMap.has(id)) {
        groupMap.set(id, {
          id,
          title: project?.title || fallbackProject.title,
          color: projectAccentColor(id, project?.color || fallbackProject.color),
          tasks: [],
        })
      }
      groupMap.get(id)?.tasks.push(task)
    }

    return Array.from(groupMap.values()).filter((group) => group.tasks.length > 0)
  }, [projects, projectById, visibleTasks])

  useEffect(() => {
    setExpandedProjectIds((current) => {
      const validIds = new Set(taskProjectGroups.map((group) => group.id))
      if (taskProjectGroups.length === 0) {
        hasSeededProjectGroupsRef.current = false
        return current.length ? [] : current
      }
      if (!hasSeededProjectGroupsRef.current && taskProjectGroups.length === 1) {
        hasSeededProjectGroupsRef.current = true
        return [taskProjectGroups[0].id]
      }
      const next = new Set(current.filter((id) => validIds.has(id)))
      const changed = next.size !== current.length
      return changed ? Array.from(next) : current
    })
  }, [taskProjectGroups])

  const doneCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'done').length
  const reviewCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'review').length
  const decisionCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'decision').length
  const activeCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'active').length
  const openCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'open').length

  function openTaskDetail(task: TaskRow) {
    router.push(task.project_id ? `/projects/${task.project_id}/tasks/${task.id}` : `/tasks/${task.id}`)
  }

  function closeStatePopover() {
    setActiveStatePopoverTaskId(null)
  }

  function openStatePopover(taskId: string) {
    setActiveStatePopoverTaskId(taskId)
  }

  function toggleProjectGroup(projectId: string) {
    setExpandedProjectIds((current) => (
      taskProjectGroups.length === 1
        ? [projectId]
        : (
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
        )
    ))
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
    setVeyraPreview(null)
  }

  function closeComposer() {
    setComposerOpen(false)
    resetComposer()
  }

  function renderTaskRow(task: TaskRow, rowIndex: number) {
    const normalized = normalizeStatus(taskState(task))
    const isDone = normalized === 'done'
    const progress = typeof task.progress === 'number' ? task.progress : progressFor(taskState(task))
    const lead = task.developer_name || task.owner || task.assigned_to || 'Entwickler'
    const group = getTaskGroup(task)
    const GroupIcon = TASK_GROUP_ICONS[group.key]

    return (
      <div
        key={task.id}
        className={`task-row task-row-flat${activeStatePopoverTaskId === task.id ? ' state-open' : ''}`}
        role="button"
        tabIndex={0}
        style={{ ['--row-index' as string]: rowIndex, ['--task-group-color' as string]: group.color }}
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
                  openStatePopover(task.id)
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
                onClick={(event) => event.stopPropagation()}
              >
                <strong>So funktioniert Erledigt</strong>
                <span>Veyra oder der Developer haken Aufgaben ab. Erledigte Aufgaben bleiben 24h sichtbar und verschwinden dann nur aus Standardansichten. Eigene Aufgaben kannst du löschen.</span>
              </span>
            ) : null}
          </span>
          <span className="task-name-text">
            <strong>{task.title}</strong>
          </span>
        </div>

        <div className={`task-health ${normalized}`}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {healthLabel(task)}
          </span>
        </div>

        <div>{priorityLabel(task.priority)}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span className="task-lead-avatar">{lead.charAt(0).toUpperCase()}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead}</span>
        </div>

        <div>{dateLabel(task.updated_at || task.created_at)}</div>
        <div>{sourceLabel(task.source)}</div>

        <div className="task-progress" title={statusLabel(taskState(task))}>
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

  async function createSuggestedTask() {
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
          description,
          priority: suggestPriority === 'none' ? null : suggestPriority,
          dueDate: suggestDueDate || null,
          labels: suggestLabels,
          proposal: tagroPreview,
          confirmCreate: composerMode === 'manual' || Boolean(tagroPreview),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) {
        setComposerNotice(result.error === 'project_id_required'
          ? 'Du brauchst zuerst ein Projekt, bevor du Aufgaben oder Wünsche hinzufügen kannst.'
          : 'Der Vorschlag konnte gerade nicht verarbeitet werden.')
        return
      }

      if (composerMode === 'tagro' && !tagroPreview && result.proposal) {
        setVeyraPreview(result.proposal)
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

  return (
    <div className="task-os">
      <style>{`
        .task-os {
          --task-soft-text:#4E5567;
          --task-header-text: color-mix(in srgb, #4E5567 62%, transparent);
          width:100%;
          height:100%;
          min-height:0;
          color:var(--text);
          padding:20px 0 0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          /* Figma-style breathing room across every text inside the page */
          letter-spacing: .012em;
        }
        .task-os strong { letter-spacing: .012em; }
        [data-theme="dark"] .task-os,
        [data-theme="classic-dark"] .task-os,
        [data-theme="read"] .task-os {
          --task-soft-text:var(--text-secondary);
        }
        .task-static-top {
          flex:0 0 auto;
          position:relative;
          z-index:8;
        }
        .task-scroll-body {
          flex:1 1 auto;
          min-height:0;
          overflow-y:auto;
          overflow-x:hidden;
          padding:0 18px 76px;
          overscroll-behavior:contain;
        }
        .task-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 18px 12px;
          margin-bottom:0;
        }
        .task-top-left {
          display:flex; align-items:center; gap:12px; min-width:0;
        }
        .task-title {
          margin:0;
          font-size:14.5px;
          font-weight:500;
          letter-spacing:0;
        }

        /* Project scope dropdown — mirrors the dashboard's
           dc-scope pattern so users know the gesture. */
        .task-scope { position:relative; }
        .task-scope-trigger {
          display:inline-flex; align-items:center; gap:7px;
          max-width:240px;
          height:28px; padding:0 11px 0 12px;
          border-radius:32px;
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background:color-mix(in srgb, var(--surface-2) 30%, transparent);
          color:var(--text); font:inherit; font-size:12px;
          font-weight:500; letter-spacing:.012em;
          cursor:pointer; transition:background .12s, border-color .12s;
        }
        .task-scope-trigger:hover {
          background:color-mix(in srgb, var(--surface-2) 65%, transparent);
          border-color:var(--border);
        }
        .task-scope-trigger span {
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-trigger svg { color:var(--text-muted); flex-shrink:0; }

        .task-scope-backdrop {
          position:fixed; inset:0; z-index:14;
          background:transparent; border:0; padding:0; cursor:default;
        }
        .task-scope-menu {
          position:absolute; top:calc(100% + 6px); left:0; z-index:15;
          min-width:260px; max-width:320px;
          max-height:340px; overflow-y:auto;
          padding:6px;
          background:var(--card);
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius:8px;
          box-shadow:0 1px 2px rgba(15,23,42,.06), 0 20px 50px rgba(15,23,42,.14);
          display:flex; flex-direction:column; gap:2px;
          animation:scopeIn .14s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .task-scope-menu,
        [data-theme="classic-dark"] .task-scope-menu {
          background:color-mix(in srgb, var(--card) 95%, #fff 5%);
          box-shadow:0 1px 2px rgba(0,0,0,.4), 0 24px 60px rgba(0,0,0,.45);
        }
        @keyframes scopeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

        .task-scope-opt {
          display:grid; grid-template-columns:8px 1fr auto;
          gap:10px; align-items:center;
          width:100%; padding:10px 12px;
          border:0; background:transparent;
          border-radius:8px !important;
          color:var(--text); font:inherit; font-size:12.5px;
          font-weight:500; letter-spacing:.012em;
          cursor:pointer; text-align:left;
          transition:background .1s;
        }
        .task-scope-opt:hover {
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
        }
        .task-scope-opt.on {
          background:color-mix(in srgb, var(--surface-2) 75%, transparent);
        }
        .task-scope-dot {
          width:8px; height:8px; border-radius:50%;
          background:var(--text-muted);
        }
        .task-scope-main {
          min-width:0; display:flex; flex-direction:column; gap:1px;
        }
        .task-scope-main strong {
          font-size:12.5px; font-weight:500;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-main small {
          font-size:10.5px; color:var(--text-muted);
          font-weight:500; letter-spacing:.012em;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-divider {
          display:none;
        }
        .task-plus {
          width:28px;
          height:28px;
          border:0;
          background:transparent;
          color:var(--task-soft-text);
          cursor:pointer;
          border-radius:999px;
          font:inherit;
          font-size:20px;
          line-height:1;
        }
        .task-plus:hover { background:var(--surface-2); color:var(--text); }
        .task-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:14px 18px 12px;
        }
        .task-filters {
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
          overflow:visible;
          flex-wrap:wrap;
        }
        .task-filter {
          height:27px;
          padding:0 9px;
          border:1px solid var(--border);
          border-radius:999px;
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          white-space:nowrap;
          cursor:pointer;
          letter-spacing:.02em;
        }
        .task-filter.on {
          background:var(--surface-2);
          color:var(--text);
          border-color:var(--border);
        }
        .task-tools {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
        }
        .task-create {
          height:30px;
          padding:0 9px 0 12px;
          border:1px solid transparent;
          border-radius:32px;
          background:transparent;
          color:var(--task-soft-text);
          display:flex;
          align-items:center;
          gap:8px;
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-create:hover { background:var(--surface-2); color:var(--text); }
        .task-create:focus,
        .task-create:focus-visible,
        .task-create:active {
          outline:none !important;
          box-shadow:none !important;
          border-color:transparent !important;
        }
        .task-create-plus {
          width:14px;
          height:14px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          color:currentColor;
          font-size:15px;
          line-height:1;
          transform:translateY(-.5px);
        }
        .task-create:disabled {
          opacity:.46;
          color:var(--task-soft-text);
        }
        .task-create svg { flex-shrink:0; }
        .task-tool-wrap { position:relative; }
        .task-tool {
          width:34px;
          height:34px;
          border:0;
          border-radius:999px;
          background:#fff;
          color:var(--task-soft-text);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
          transition:background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .task-tool:focus,
        .task-tool:focus-visible,
        .task-tool:active {
          outline:none !important;
          border:0 !important;
          background:#fff;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07) !important;
          transform:none;
        }
        .task-tool:hover, .task-tool.on {
          background:#fff;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .task-tool,
        [data-theme="classic-dark"] .task-tool {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
        }
        [data-theme="dark"] .task-tool:hover,
        [data-theme="dark"] .task-tool.on,
        [data-theme="dark"] .task-tool:focus,
        [data-theme="dark"] .task-tool:focus-visible,
        [data-theme="dark"] .task-tool:active,
        [data-theme="classic-dark"] .task-tool:hover,
        [data-theme="classic-dark"] .task-tool.on,
        [data-theme="classic-dark"] .task-tool:focus,
        [data-theme="classic-dark"] .task-tool:focus-visible,
        [data-theme="classic-dark"] .task-tool:active {
          background:color-mix(in srgb, var(--surface) 88%, #fff 12%);
          box-shadow:0 1px 2px rgba(0,0,0,.32), 0 3px 9px rgba(0,0,0,.2) !important;
        }
        .task-menu {
          position:absolute;
          top:38px;
          right:0;
          width:190px;
          z-index:20;
          border:0;
          border-radius:8px !important;
          background:var(--surface);
          box-shadow:0 18px 44px rgba(0,0,0,.16);
          padding:6px;
        }
        .task-menu button {
          width:100%;
          height:30px;
          border-radius:8px !important;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 9px;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-menu button:focus,
        .task-menu button:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-menu button:hover, .task-menu button.on { background:var(--surface-2); color:var(--text); }
        .task-table {
          width:100%;
          max-width:100%;
          margin-left:0;
          margin-right:0;
          padding-right:14px;
          box-sizing:border-box;
          overflow:visible;
        }
        .task-head,
        .task-row {
          display:grid;
          grid-template-columns:42px minmax(185px,1.7fr) minmax(132px,.95fr) minmax(62px,.42fr) minmax(96px,.58fr) minmax(74px,.48fr) minmax(64px,.42fr) minmax(68px,.42fr);
          align-items:center;
          gap:8px;
          margin:0;
          padding:0 12px 0 0;
          box-sizing:border-box;
        }
        .task-head {
          position:sticky;
          top:0;
          z-index:5;
          min-height:36px;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          border-bottom:0;
          background:var(--surface);
          letter-spacing:.02em;
        }
        .task-head > *,
        .task-row > * {
          min-width:0;
        }
        .task-row {
          min-height:50px;
          border-bottom:0;
          color:var(--task-soft-text);
          font-size:12px;
          border-radius:8px !important;
          cursor:pointer;
          overflow:visible;
          position:relative;
          background:transparent;
          transition:background .12s ease;
        }
        .task-row.state-open {
          z-index:80;
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          border-radius:8px !important;
        }
        .task-category-section {
          margin:10px 0 16px;
          animation:taskGroupIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--section-index, 0) * 34ms);
        }
        .task-category-head {
          min-height:34px;
          display:grid;
          grid-template-columns:42px minmax(0,1fr) auto;
          align-items:center;
          gap:8px;
          padding:0 12px 0 0;
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-category-icon {
          width:24px;
          height:24px;
          border-radius:8px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          justify-self:center;
          background:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 15%, transparent);
          color:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 78%, var(--text));
        }
        .task-category-head em {
          font-style:normal;
          color:color-mix(in srgb, var(--task-soft-text) 82%, transparent);
        }
        .task-project-section {
          margin:5px 0 8px;
          animation:taskGroupIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--section-index, 0) * 34ms);
        }
        @keyframes taskGroupIn {
          from { opacity:0; transform:translateY(7px); }
          to { opacity:1; transform:none; }
        }
        .task-project-row {
          width:100%;
          min-height:40px;
          display:grid;
          grid-template-columns:42px minmax(185px,1.7fr) minmax(132px,.95fr) minmax(62px,.42fr) minmax(96px,.58fr) minmax(74px,.48fr) minmax(64px,.42fr) minmax(68px,.42fr);
          align-items:center;
          gap:8px;
          margin:0;
          padding:0 12px 0 0;
          box-sizing:border-box;
          border:0;
          border-radius:8px !important;
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          text-align:left;
          cursor:pointer;
        }
        .task-project-row:focus,
        .task-project-row:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-project-row:active {
          background:transparent;
        }
        .task-project-row:hover {
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--text);
        }
        .task-project-section.open .task-project-row {
          background:transparent;
        }
        .task-project-dot {
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px solid var(--project-color, var(--task-soft-text));
          background:transparent;
          justify-self:center;
        }
        .task-project-title {
          display:flex;
          align-items:center;
          gap:9px;
          min-width:0;
          grid-column:2 / 4;
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
        }
        .task-project-title span {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-project-count {
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
        }
        .task-project-meta {
          grid-column:6 / 8;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          text-align:right;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-project-chevron {
          grid-column:8;
          justify-self:center;
          color:var(--task-soft-text);
          transform:rotate(90deg);
          transition:transform .2s cubic-bezier(.16,1,.3,1), color .12s ease;
        }
        .task-project-section:not(.open) .task-project-chevron {
          transform:rotate(0deg);
        }
        .task-project-tasks {
          display:grid;
          grid-template-rows:0fr;
          overflow:hidden;
          transition:grid-template-rows .28s cubic-bezier(.16,1,.3,1);
        }
        .task-project-section.open .task-project-tasks {
          grid-template-rows:1fr;
          overflow:visible;
        }
        .task-project-tasks-inner {
          min-height:0;
          overflow:visible;
          padding-top:6px;
        }
        .task-project-section.open .task-row,
        .task-row-flat {
          animation:taskRowSlideIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--row-index, 0) * 24ms);
        }
        /* Flat rows live directly inside .task-table (no project section
           wrapper), so they don't inherit the slide-in default rules. */
        .task-row-flat { cursor:pointer; }
        @keyframes taskRowSlideIn {
          from { opacity:0; transform:translateY(-5px); }
          to { opacity:1; transform:none; }
        }
        .task-composer {
          border:0;
          border-radius:12px;
          background:color-mix(in srgb, var(--surface) 72%, transparent);
          box-shadow:0 18px 46px rgba(0,0,0,.06);
          margin:0 0 22px;
          overflow:hidden;
          animation:taskComposerIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        .task-composer-title {
          display:flex;
          align-items:baseline;
          flex-wrap:wrap;
          gap:6px;
          min-width:0;
        }
        .task-composer-title strong {
          color:var(--text);
          font-size:13px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-composer-title span {
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
        }
        [data-theme="dark"] .task-composer {
          background:color-mix(in srgb, var(--surface) 82%, transparent);
          box-shadow:0 18px 46px rgba(0,0,0,.22);
        }
        @keyframes taskComposerIn {
          from { opacity:0; transform:translateY(-6px); }
          to { opacity:1; transform:none; }
        }
        .task-composer-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:13px 16px 10px;
          border-bottom:0;
        }
        .task-project-select {
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-width:0;
          height:28px;
          padding:0 10px;
          border-radius:8px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--text);
        }
        .task-project-ring {
          position:relative;
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px solid var(--project-ring, var(--task-soft-text));
          background:transparent;
          flex-shrink:0;
          display:inline-flex;
        }
        .task-project-ring input {
          position:absolute;
          inset:-7px;
          width:26px;
          height:26px;
          opacity:0;
          padding:0;
          border:0;
        }
        .task-project-select select,
        .task-composer-field,
        .task-chip-field {
          border:0;
          outline:0;
          background:transparent;
          color:inherit;
          font:inherit;
          font-weight:500;
        }
        .task-project-select select { max-width:280px; font-size:12.5px; font-weight:500; }
        .task-composer-body { padding:13px 16px 12px; }
        .task-mode-tabs { display:flex; gap:7px; margin-bottom:10px; }
        .task-mode-tabs button {
          min-height:32px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-mode-tabs button.on {
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--text);
        }
        .task-tagro-note {
          padding:8px 11px;
          border-radius:8px;
          border:0;
          background:color-mix(in srgb, var(--surface-2) 34%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.45;
          margin-bottom:12px;
        }
        .task-preview {
          display:grid;
          gap:10px;
          padding:12px 13px;
          border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface-2) 38%, transparent);
          margin:0 0 14px;
        }
        .task-preview strong {
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
        }
        .task-preview p,
        .task-preview li {
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.5;
          margin:0;
        }
        .task-preview ul {
          display:grid;
          gap:4px;
          padding-left:16px;
          margin:0;
        }
        .task-notice {
          padding:10px 12px;
          border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));
          border-radius:10px;
          background:color-mix(in srgb, var(--amber-bg) 72%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.45;
          margin:0 0 12px;
        }
        .task-composer-field.title {
          width:100%;
          display:block;
          font-size:18px;
          font-weight:500;
          letter-spacing:0;
          margin:0 0 7px;
        }
        .task-composer-field.description {
          width:100%;
          min-height:72px;
          resize:vertical;
          color:var(--task-soft-text);
          font-size:13px;
          line-height:1.55;
          font-weight:500;
        }
        .task-composer-field::placeholder,
        .task-chip-field::placeholder {
          color:var(--task-soft-text);
          opacity:1;
        }
        .task-chip-row {
          display:flex;
          align-items:center;
          flex-wrap:wrap;
          gap:7px;
          padding:10px 16px 11px;
          border-top:0;
        }
        .task-composer-chip {
          height:26px;
          display:inline-flex;
          align-items:center;
          gap:7px;
          border:1px solid var(--border);
          border-radius:8px;
          padding:0 10px;
          background:transparent;
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
        }
        .task-composer-chip.has-value { color:var(--text); }
        .task-composer-chip input[type="date"] { color-scheme:inherit; max-width:124px; }
        .task-composer-footer {
          min-height:42px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:8px 16px;
          border-top:0;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
        }
        .task-composer-actions { display:flex; align-items:center; gap:8px; }
        .task-composer-actions button {
          min-height:34px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-composer-actions button.primary {
          background:color-mix(in srgb, var(--surface-2) 74%, transparent);
          color:var(--text);
          border-color:var(--border);
        }
        .task-composer-actions button:disabled {
          opacity:.48;
          cursor:not-allowed;
        }
        .task-group-cell {
          display:flex;
          align-items:center;
          justify-content:center;
          min-width:0;
        }
        .task-group-icon {
          width:24px;
          height:24px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:color-mix(in srgb, var(--task-group-color, var(--surface-2)) 13%, transparent);
          color:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 72%, var(--task-soft-text));
          border:0;
        }
        .task-name {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .task-state-wrap {
          position:relative;
          flex:0 0 auto;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          z-index:3;
        }
        .task-state-mark {
          width:16px;
          height:16px;
          border-radius:50%;
          border:1px solid color-mix(in srgb, var(--task-soft-text) 30%, var(--border));
          color:var(--btn-prim-text);
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          background:transparent;
          padding:0;
          transition:border-color .12s ease, background .12s ease;
        }
        .task-state-wrap:hover .task-state-mark,
        .task-state-wrap.is-open .task-state-mark {
          border-color:color-mix(in srgb, var(--task-soft-text) 64%, var(--border));
        }
        .task-state-mark:focus,
        .task-state-mark:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-state-mark.done {
          border-color:var(--btn-prim);
          background:var(--btn-prim);
        }
        .task-state-popover {
          position:absolute;
          left:calc(100% + 10px);
          top:50%;
          width:min(300px, calc(100vw - 48px));
          max-width:calc(100vw - 48px);
          max-height:260px;
          transform:translateY(-50%) scale(.985);
          opacity:0;
          visibility:hidden;
          pointer-events:none;
          z-index:90;
          padding:12px 14px;
          border-radius:12px;
          border:1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background:color-mix(in srgb, var(--card) 98%, var(--surface-2) 2%);
          box-shadow:var(--shadow-sm), 0 0 0 1px color-mix(in srgb, var(--accent-primary, #6a738c) 5%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.5;
          letter-spacing:0;
          white-space:normal;
          overflow:auto;
          transition:opacity .14s ease, visibility .14s ease, transform .14s ease;
        }
        .task-state-popover::before {
          content:"";
          position:absolute;
          left:-5px;
          top:50%;
          width:9px;
          height:9px;
          transform:translateY(-50%) rotate(45deg);
          background:inherit;
          border-left:1px solid color-mix(in srgb, var(--border) 82%, transparent);
          border-bottom:1px solid color-mix(in srgb, var(--border) 82%, transparent);
        }
        [data-theme="dark"] .task-state-popover,
        [data-theme="classic-dark"] .task-state-popover {
          background:color-mix(in srgb, var(--surface-2) 84%, var(--card) 16%);
          border-color:color-mix(in srgb, var(--border-strong) 58%, transparent);
          box-shadow:0 14px 34px rgba(0,0,0,.26), 0 1px 0 rgba(255,255,255,.04) inset;
        }
        .task-state-popover strong {
          display:block;
          margin-bottom:5px;
          color:var(--text);
          font-size:12px;
          line-height:1.35;
          font-weight:500;
        }
        .task-state-popover.is-open {
          opacity:1;
          visibility:visible;
          transform:translateY(-50%);
          pointer-events:auto;
        }
        .task-state-popover span {
          display:block;
        }
        .task-name-text {
          min-width:0;
        }
        .task-name-text strong {
          display:block;
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-health {
          display:flex;
          align-items:center;
          gap:0;
          min-width:0;
          color:var(--task-soft-text);
          font-weight:500;
          font-size:12px;
        }
        .task-health.done { color:var(--green); }
        .task-health.active { color:var(--amber); }
        .task-health.decision { color:var(--amber); }
        .task-health.review { color:#6a738c; }
        .task-progress {
          display:flex;
          align-items:center;
          gap:8px;
          justify-content:flex-start;
          color:var(--task-soft-text);
          font-weight:500;
          font-size:12px;
        }
        .task-progress-dot {
          width:11px;
          height:11px;
          border-radius:50%;
          border:2px dotted var(--amber);
        }
        .task-health.review ~ .task-progress .task-progress-dot,
        .task-progress-dot.review {
          border-color:#6a738c;
        }
        .task-health.decision ~ .task-progress .task-progress-dot,
        .task-progress-dot.decision {
          border-color:var(--amber);
        }
        .task-progress-dot.done {
          border-style:solid;
          border-color:var(--green);
          background:var(--green);
        }
        .task-lead-avatar {
          width:22px;
          height:22px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--task-soft-text);
          font-size:10px;
          font-weight:600;
          flex-shrink:0;
        }
        .task-empty {
          padding:44px 12px;
          text-align:center;
          color:var(--task-soft-text);
          border-bottom:1px solid color-mix(in srgb, var(--border) 24%, transparent);
          font-size:12px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-empty.projectless {
          max-width:430px;
          margin:44px auto;
          padding:28px 24px;
          border:1px solid color-mix(in srgb, var(--border) 72%, transparent);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface) 88%, transparent);
        }
        .task-empty.projectless h2 {
          margin:0 0 8px;
          color:var(--text);
          font-size:18px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-empty.projectless p {
          margin:0;
          color:var(--task-soft-text);
          font-size:13px;
          line-height:1.5;
        }
        .task-empty-actions {
          display:flex;
          justify-content:center;
          gap:8px;
          flex-wrap:wrap;
          margin-top:18px;
        }
        .task-empty-actions a {
          min-height:44px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0 14px;
          border:1px solid var(--border);
          border-radius:10px;
          color:var(--text);
          text-decoration:none;
          background:var(--surface-2);
          font-size:12.5px;
          font-weight:500;
        }
        .task-count-summary {
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          padding-left:4px;
          letter-spacing:.02em;
          white-space:nowrap;
        }
        /* Tighten layout instead of forcing horizontal scroll on narrow widths.
           The grid cells already use min-width:0 internally so text truncates. */
        @media(max-width:1180px) {
          .task-head,
          .task-row {
            grid-template-columns:36px minmax(160px,1.6fr) minmax(112px,.8fr) 66px 86px 70px 46px 70px;
            gap:7px;
          }
          .task-project-row {
            grid-template-columns:36px minmax(160px,1.6fr) minmax(112px,.8fr) 66px 86px 70px 46px 70px;
            gap:7px;
          }
        }
        @media(max-width:960px) {
          .task-os { padding:16px 14px 0; }
          .task-top { padding-left:4px; padding-right:4px; }
          .task-toolbar { padding-left:4px; padding-right:4px; }
          .task-head,
          .task-row {
            grid-template-columns:32px minmax(150px,1.8fr) minmax(108px,.85fr) 60px 74px 62px 42px 62px;
            gap:6px;
          }
          .task-project-row {
            grid-template-columns:32px minmax(150px,1.8fr) minmax(108px,.85fr) 60px 74px 62px 42px 62px;
          }
          .task-project-meta {
            display:none;
          }
          .task-head { font-size:10.5px; }
          .task-row { font-size:11.5px; }
          .task-count-summary { flex-basis:100%; padding-left:0; }
        }
        @media(max-width:760px) {
          .task-os { padding:12px 10px 0; overflow:hidden; }
          .task-scroll-body { padding-bottom:calc(110px + var(--safe-bottom)); }
          .task-top {
            min-height:auto;
            align-items:center;
            padding:0 2px 10px;
            margin-bottom:10px;
          }
          .task-toolbar {
            flex-direction:column;
            align-items:stretch;
            gap:10px;
            padding:0 2px 12px;
          }
          .task-filters {
            display:grid;
            grid-template-columns:repeat(2, minmax(0, 1fr));
            gap:6px;
            width:100%;
          }
          .task-filter {
            width:100%;
            justify-content:center;
            height:29px;
            padding:0 8px;
            font-size:11px;
          }
          .task-count-summary {
            grid-column:1 / -1;
            white-space:normal;
            line-height:1.35;
            padding:2px 2px 0;
          }
          .task-tools {
            width:100%;
            justify-content:space-between;
            gap:7px;
          }
          .task-create {
            min-height:44px;
            padding:0 10px;
            font-size:11.5px;
            gap:5px;
          }
          .task-tool {
            width:30px;
            height:30px;
          }
          .task-table {
            width:100%;
            margin-left:0;
            margin-right:0;
            padding-top:8px;
          }
          .task-head {
            display:none;
          }
          .task-project-section {
            margin:7px 0 9px;
          }
          .task-project-row {
            grid-template-columns:24px minmax(0,1fr) 22px;
            min-height:38px;
            padding:0 10px;
          }
          .task-project-title,
          .task-project-chevron {
            grid-column:auto;
          }
          .task-project-dot {
            justify-self:start;
          }
          .task-project-title {
            font-size:12.5px;
          }
          .task-project-count {
            margin-left:auto;
          }
          .task-row {
            display:grid;
            grid-template-columns:minmax(0, 1fr);
            gap:9px;
            min-height:auto;
            padding:12px 10px;
            margin-bottom:8px;
            border:0;
            border-radius:8px !important;
            background:color-mix(in srgb, var(--surface) 94%, transparent);
          }
          .task-row:hover {
            background:color-mix(in srgb, var(--surface-2) 38%, var(--surface));
            border-radius:8px !important;
          }
          .task-group-cell {
            display:none;
          }
          .task-name {
            gap:8px;
          }
          .task-state-mark {
            width:17px;
            height:17px;
          }
          .task-state-popover {
            position:fixed;
            left:12px !important;
            right:12px;
            top:auto !important;
            bottom:calc(12px + var(--safe-bottom));
            width:auto !important;
            max-width:none;
            max-height:min(260px, calc(100vh - 24px - var(--safe-bottom)));
            transform:translateY(8px) scale(.985);
          }
          .task-state-popover::before {
            display:none;
          }
          .task-state-popover.is-open {
            transform:none;
          }
          .task-name-text strong {
            font-size:12.5px;
            white-space:normal;
            line-height:1.35;
          }
          .task-health,
          .task-progress,
          .task-row > div:nth-child(4),
          .task-row > div:nth-child(5),
          .task-row > div:nth-child(6),
          .task-row > div:nth-child(7) {
            min-width:0;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            color:var(--task-soft-text);
            font-size:11.5px;
          }
          .task-health::before { content:'Letztes Update'; color:var(--task-soft-text); }
          .task-row > div:nth-child(4)::before { content:'Priorität'; color:var(--task-soft-text); }
          .task-row > div:nth-child(5)::before { content:'Verantwortlich'; color:var(--task-soft-text); }
          .task-row > div:nth-child(6)::before { content:'Datum'; color:var(--task-soft-text); }
          .task-row > div:nth-child(7)::before { content:'Quelle'; color:var(--task-soft-text); }
          .task-progress::before { content:'Fortschritt'; color:var(--task-soft-text); margin-right:auto; }
          .task-empty {
            padding:34px 10px;
            font-size:11.5px;
            border-bottom:0;
          }
          .task-composer {
            position:fixed;
            inset:0;
            z-index:240;
            margin:0;
            border-radius:12px 12px 0 0;
            border-left:0;
            border-right:0;
            border-bottom:0;
            display:flex;
            flex-direction:column;
            background:var(--surface);
          }
          .task-composer-body {
            flex:1;
            min-height:0;
            overflow:auto;
            padding:16px 14px;
          }
          .task-chip-row {
            flex-shrink:0;
            overflow-x:auto;
            flex-wrap:nowrap;
            padding:10px 14px;
          }
          .task-composer-footer {
            position:sticky;
            bottom:0;
            padding:10px 14px calc(10px + var(--safe-bottom));
            background:var(--surface);
          }
          .task-composer-top,
          .task-composer-footer { align-items:flex-start; flex-direction:column; }
          .task-composer-actions,
          .task-composer-actions button { width:100%; }
          .task-project-select select { max-width:210px; }
          .task-mode-tabs {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .task-empty.projectless {
            margin:28px 0;
            padding:22px 18px;
          }
          .task-empty-actions a {
            width:100%;
          }
        }
      `}</style>

      <div className="task-static-top">
        <div className="task-top">
          <div className="task-top-left">
            <h1 className="task-title">Tasks</h1>
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
            description="Aufgaben entstehen innerhalb eines Projekts. Lege zuerst ein Projekt an oder starte ein Briefing mit Veyra."
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
                <strong>Aufgabe oder Wunsch vorschlagen</strong>
                <span>Kurz beschreiben, Veyra ordnet ein.</span>
              </span>
            </div>
            <button className="task-plus" type="button" aria-label="Vorschlag schließen" onClick={closeComposer}>
              <X size={15} weight="bold" />
            </button>
          </div>

          <div className="task-composer-body">
            <div className="task-mode-tabs" role="tablist" aria-label="Vorschlagmodus">
              <button type="button" className={composerMode === 'tagro' ? 'on' : ''} onClick={() => { setComposerMode('tagro'); setVeyraPreview(null); setComposerNotice('') }}>
                Mit Veyra prüfen
              </button>
              <button type="button" className={composerMode === 'manual' ? 'on' : ''} onClick={() => { setComposerMode('manual'); setVeyraPreview(null); setComposerNotice('') }}>
                Manuell
              </button>
            </div>

            {composerMode === 'tagro' && (
              <div className="task-tagro-note">
                Veyra prüft Kontext und Übergabe.
              </div>
            )}
            {composerMode === 'manual' && (
              <div className="task-tagro-note">
                Direkt an den Projekt-Workflow.
              </div>
            )}
            {composerNotice ? <div className="task-notice">{composerNotice}</div> : null}
            {tagroPreview && (
              <div className="task-preview">
                <strong>{tagroPreview.suggested_title || 'Veyra Preview'}</strong>
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
              </div>
            )}

            <input
              className="task-composer-field title"
              value={suggestTitle}
              onChange={(event) => { setSuggestTitle(event.target.value); setVeyraPreview(null) }}
              placeholder="Aufgabe kurz benennen…"
              autoFocus
            />
            <textarea
              className="task-composer-field description"
              value={suggestDescription}
              onChange={(event) => { setSuggestDescription(event.target.value); setVeyraPreview(null) }}
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
            <span>{composerMode === 'tagro' ? 'Veyra prüft Kontext und Übergabe.' : 'Wartet ggf. auf Zuweisung.'}</span>
            <div className="task-composer-actions">
              <button type="button" onClick={closeComposer}>Abbrechen</button>
              <button
                type="button"
                className="primary"
                onClick={createSuggestedTask}
                disabled={creatingSuggestion || !suggestProjectId || (!suggestTitle.trim() && !suggestDescription.trim())}
              >
                {creatingSuggestion ? 'Sende...' : composerMode === 'tagro' ? (tagroPreview ? 'Als Aufgabe erstellen' : 'Mit Veyra vorbereiten') : 'Manuell erstellen'}
              </button>
            </div>
          </div>
        </section>
      )}

      {hasProjects && <div className="task-table">
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

        {loading ? (
          <div className="task-empty">Lade Aufgaben…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="task-empty">Keine Aufgaben in dieser Ansicht.</div>
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
  )
}
