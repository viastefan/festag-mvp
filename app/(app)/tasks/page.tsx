'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  Code,
  Circle,
  Cube,
  FileText,
  FunnelSimple,
  Gauge,
  Globe,
  Palette,
  Plugs,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react'

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
]

const DONE_STATES = new Set(['done', 'completed', 'delivered', 'erledigt'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'development', 'in_development'])
const DECISION_STATES = new Set(['blocked', 'waiting', 'needs_decision', 'client_decision', 'waiting_for_client', 'waiting_for_assignment'])
const REVIEW_STATES = new Set(['review', 'ready_for_review', 'in_review', 'festag_review', 'suggested', 'zur_pruefung', 'verified', 'approved', 'festag_checked'])

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
  if (normalized === 'done') return 'Erledigt mit Erklärung'
  if (raw === 'verified' || raw === 'approved' || raw === 'festag_checked') return 'Von Festag geprüft'
  if (normalized === 'review') return raw === 'suggested' ? 'Zur Prüfung vorgeschlagen' : 'Festag prüft die Umsetzung'
  if (raw === 'waiting_for_assignment') return 'Wartet auf Zuweisung'
  if (normalized === 'decision') return 'Wartet auf deine Entscheidung'
  if (normalized === 'active') return 'Developer arbeitet daran'
  return 'Tagro hat die Aufgabe geplant'
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

function taskGroupFor(task: TaskRow) {
  const haystack = `${task.title} ${task.priority ?? ''}`.toLowerCase()

  if (/datenschutz|impressum|agb|recht|legal|security|sicherheit|compliance/.test(haystack)) {
    return { label: 'Recht', icon: ShieldCheck, color: '#64748b' }
  }
  if (/performance|optimierung|hosting|wordpress|installation|setup|cache|server|deploy/.test(haystack)) {
    return { label: 'Technik', icon: Gauge, color: '#0ea5e9' }
  }
  if (/login|stripe|api|webhook|integration|google|connector|payment|billing/.test(haystack)) {
    return { label: 'Integration', icon: Plugs, color: '#8b5cf6' }
  }
  if (/responsive|theme|design|gestaltung|ui|ux|layout/.test(haystack)) {
    return { label: 'Design', icon: Palette, color: '#ec4899' }
  }
  if (/seo|landing|seite|kontakt|formular|blog|content|inhalt|leistung|über-mich|about/.test(haystack)) {
    return { label: 'Inhalt', icon: FileText, color: '#f97316' }
  }
  if (/domain|website|web|page/.test(haystack)) {
    return { label: 'Web', icon: Globe, color: '#22c55e' }
  }
  if (/code|refactor|service|sdk|schema|database|db/.test(haystack)) {
    return { label: 'Code', icon: Code, color: '#6366f1' }
  }

  return { label: 'Projekt', icon: Cube, color: 'var(--text-muted)' }
}

export default function TasksPage() {
  const [view, setView] = useState<TaskView>('all')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
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

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]))
  }, [projects])
  const hasProjects = projects.length > 0

  const visibleTasks = useMemo(() => {
    const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return tasks
      .filter((task) => {
        if (view === 'all') return true
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
  }, [tasks, view, sortMode, projectById])

  const doneCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'done').length
  const reviewCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'review').length
  const decisionCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'decision').length
  const activeCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'active').length
  const openCount = tasks.filter((task) => normalizeStatus(taskState(task)) === 'open').length
  const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(task.id))

  function toggleTaskSelection(id: string) {
    setSelectedTaskIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  function explainSelectedTask() {
    const task = selectedTasks[0]
    if (!task) return
    window.dispatchEvent(new CustomEvent('open-copilot'))
    window.dispatchEvent(new CustomEvent('tagro-compose', {
      detail: {
        prompt: `Erkläre mir diese Aufgabe aus dem Workspace-Kontext und sage mir, warum Tagro sie jetzt eingeplant hat: "${task.title}".`,
      },
    }))
  }

  function suggestChangeForSelectedTask() {
    const task = selectedTasks[0]
    if (!task) return
    window.dispatchEvent(new CustomEvent('open-copilot'))
    window.dispatchEvent(new CustomEvent('tagro-compose', {
      detail: {
        prompt: `Ich möchte zu dieser Aufgabe eine Änderung oder Ergänzung vorschlagen: "${task.title}". Bitte prüfe den Projektkontext, formuliere daraus einen sauberen Vorschlag für Festag/Lead Dev und markiere, welche Entscheidung eventuell vom Client gebraucht wird.`,
      },
    }))
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

  return (
    <div className="task-os">
      <style>{`
        .task-os {
          width:100%;
          height:100%;
          min-height:0;
          color:var(--text);
          padding:20px 18px 0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
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
          padding:0 0 76px;
          scrollbar-gutter:stable;
          overscroll-behavior:contain;
        }
        .task-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 34%, transparent);
          padding:0 10px 12px;
          margin-bottom:10px;
        }
        .task-title {
          margin:0;
          font-size:14.5px;
          font-weight:500;
          letter-spacing:0;
        }
        .task-plus {
          width:28px;
          height:28px;
          border:0;
          background:transparent;
          color:var(--text-muted);
          cursor:pointer;
          border-radius:7px;
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
          padding:0 10px 12px;
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
          color:var(--text-secondary);
          font:inherit;
          font-size:11.5px;
          font-weight:400;
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
          border-radius:8px;
          background:transparent;
          color:var(--text-secondary);
          display:flex;
          align-items:center;
          gap:8px;
          font:inherit;
          font-size:12px;
          font-weight:400;
          cursor:pointer;
        }
        .task-create:hover { background:var(--surface-2); color:var(--text); }
        .task-create:disabled {
          opacity:.46;
          color:var(--text-muted);
        }
        .task-create svg { flex-shrink:0; }
        .task-tool-wrap { position:relative; }
        .task-tool {
          width:32px;
          height:32px;
          border:1px solid var(--border);
          border-radius:999px;
          background:var(--surface);
          color:var(--text-muted);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .task-tool:hover, .task-tool.on { background:var(--surface-2); color:var(--text); }
        .task-menu {
          position:absolute;
          top:38px;
          right:0;
          width:190px;
          z-index:20;
          border:1px solid var(--border);
          border-radius:12px;
          background:var(--surface);
          box-shadow:0 18px 44px rgba(0,0,0,.16);
          padding:6px;
        }
        .task-menu button {
          width:100%;
          height:30px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 9px;
          color:var(--text-secondary);
          font:inherit;
          font-size:12px;
          font-weight:650;
          cursor:pointer;
        }
        .task-menu button:hover, .task-menu button.on { background:var(--surface-2); color:var(--text); }
        .task-table {
          width:100%;
          overflow:visible;
        }
        .task-head,
        .task-row {
          display:grid;
          grid-template-columns:54px minmax(190px,1.55fr) minmax(128px,.85fr) 76px 104px 84px 58px 82px;
          align-items:center;
          gap:8px;
        }
        .task-head {
          position:sticky;
          top:0;
          z-index:5;
          min-height:36px;
          padding:0 10px;
          color:var(--text-muted);
          font-size:11.5px;
          font-weight:400;
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
          padding:0 10px;
          border-bottom:0;
          color:var(--text-secondary);
          font-size:12px;
          border-radius:8px;
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 58%, transparent);
        }
        .task-composer {
          border:1px solid var(--border);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface) 72%, transparent);
          box-shadow:0 18px 46px rgba(0,0,0,.06);
          margin:0 0 22px;
          overflow:hidden;
          animation:taskComposerIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        .task-composer-title {
          display:flex;
          flex-direction:column;
          gap:2px;
          min-width:0;
        }
        .task-composer-title strong {
          color:var(--text);
          font-size:13px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-composer-title span {
          color:var(--text-muted);
          font-size:11.5px;
          font-weight:400;
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
          border-bottom:1px solid var(--border);
        }
        .task-project-select {
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-width:0;
          height:28px;
          padding:0 10px;
          border-radius:9px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--text);
        }
        .task-project-select select,
        .task-composer-field,
        .task-chip-field {
          border:0;
          outline:0;
          background:transparent;
          color:inherit;
          font:inherit;
        }
        .task-project-select select { max-width:280px; font-size:12.5px; font-weight:650; }
        .task-composer-body { padding:16px; }
        .task-mode-tabs { display:flex; gap:8px; margin-bottom:12px; }
        .task-mode-tabs button {
          min-height:44px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12.5px;
          font-weight:400;
          cursor:pointer;
        }
        .task-mode-tabs button.on {
          background:var(--surface-2);
          color:var(--text);
        }
        .task-tagro-note {
          padding:12px 13px;
          border-radius:12px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--surface-2) 46%, transparent);
          color:var(--text-secondary);
          font-size:12.5px;
          line-height:1.55;
          margin-bottom:14px;
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
          color:var(--text-secondary);
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
          color:var(--text-secondary);
          font-size:12px;
          line-height:1.45;
          margin:0 0 12px;
        }
        .task-composer-field.title {
          width:100%;
          display:block;
          font-size:22px;
          font-weight:720;
          letter-spacing:0;
          margin:0 0 8px;
        }
        .task-composer-field.description {
          width:100%;
          min-height:86px;
          resize:vertical;
          color:var(--text-secondary);
          font-size:14px;
          line-height:1.6;
        }
        .task-chip-row {
          display:flex;
          align-items:center;
          flex-wrap:wrap;
          gap:7px;
          padding:12px 16px 14px;
          border-top:1px solid var(--border);
        }
        .task-composer-chip {
          height:28px;
          display:inline-flex;
          align-items:center;
          gap:7px;
          border:1px solid var(--border);
          border-radius:9px;
          padding:0 10px;
          background:transparent;
          color:var(--text-secondary);
          font-size:12px;
          font-weight:650;
        }
        .task-composer-chip.has-value { color:var(--text); }
        .task-composer-chip input[type="date"] { color-scheme:inherit; max-width:124px; }
        .task-composer-footer {
          min-height:46px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:8px 16px;
          border-top:1px solid var(--border);
          color:var(--text-muted);
          font-size:12px;
          font-weight:650;
        }
        .task-composer-actions { display:flex; align-items:center; gap:8px; }
        .task-composer-actions button {
          min-height:44px;
          padding:0 14px;
          border-radius:9px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12.5px;
          font-weight:700;
          cursor:pointer;
        }
        .task-composer-actions button.primary {
          background:var(--btn-prim);
          color:var(--btn-prim-text);
          border-color:transparent;
        }
        .task-composer-actions button:disabled {
          opacity:.48;
          cursor:not-allowed;
        }
        .task-row.selected {
          background:rgba(99,102,241,.13);
        }
        [data-theme="dark"] .task-row.selected {
          background:rgba(99,102,241,.20);
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
          background:color-mix(in srgb, currentColor 8%, transparent);
          color:var(--text-muted);
          border:1px solid color-mix(in srgb, currentColor 20%, transparent);
        }
        .task-name {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .task-check {
          width:16px;
          height:16px;
          border:1px solid var(--border-strong);
          border-radius:4px;
          flex-shrink:0;
          background:transparent;
          color:#fff;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .task-check.selected {
          background:#676be8;
          border-color:#676be8;
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
        .task-name-text span {
          display:block;
          margin-top:2px;
          color:var(--text-muted);
          font-size:11.5px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-health {
          display:flex;
          align-items:center;
          gap:7px;
          min-width:0;
          color:var(--text-muted);
          font-weight:400;
          font-size:12px;
        }
        .task-health.done { color:var(--green); }
        .task-health.active { color:var(--amber); }
        .task-health.decision { color:var(--amber); }
        .task-health.review { color:#6366f1; }
        .task-progress {
          display:flex;
          align-items:center;
          gap:8px;
          justify-content:flex-start;
          color:var(--text-secondary);
          font-weight:400;
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
          border-color:#6366f1;
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
          color:var(--text-secondary);
          font-size:10px;
          font-weight:800;
          flex-shrink:0;
        }
        .task-selection-bar {
          position:fixed;
          left:50%;
          bottom:28px;
          transform:translateX(-50%);
          z-index:120;
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface) 86%, transparent);
          border:1px solid var(--border);
          box-shadow:0 18px 44px rgba(0,0,0,.18);
          backdrop-filter:blur(20px) saturate(160%);
          -webkit-backdrop-filter:blur(20px) saturate(160%);
          animation:taskActionUp .16s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes taskActionUp {
          from { opacity:0; transform:translateX(-50%) translateY(8px) scale(.98); }
          to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        .task-selection-bar button,
        .task-selection-count {
          height:32px;
          border-radius:999px;
          border:1px solid var(--border);
          background:var(--surface-2);
          color:var(--text);
          font:inherit;
          font-size:12px;
          font-weight:700;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0 12px;
          white-space:nowrap;
        }
        .task-selection-bar button {
          cursor:pointer;
        }
        .task-selection-bar button:hover {
          background:var(--nav-on);
        }
        .task-selection-close {
          width:32px;
          padding:0 !important;
          color:var(--text-muted) !important;
        }
        .task-selection-sep {
          width:1px;
          height:24px;
          background:var(--border);
        }
        .task-empty {
          padding:44px 12px;
          text-align:center;
          color:var(--text-muted);
          border-bottom:1px solid color-mix(in srgb, var(--border) 24%, transparent);
          font-size:12px;
          font-weight:400;
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
          color:var(--text-secondary);
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
          color:var(--text-muted);
          font-size:11.5px;
          font-weight:400;
          padding-left:4px;
          letter-spacing:.02em;
          white-space:nowrap;
        }
        /* Tighten layout instead of forcing horizontal scroll on narrow widths.
           The grid cells already use min-width:0 internally so text truncates. */
        @media(max-width:1180px) {
          .task-head,
          .task-row {
            grid-template-columns:46px minmax(160px,1.6fr) minmax(112px,.8fr) 66px 86px 70px 46px 70px;
            gap:7px;
          }
        }
        @media(max-width:960px) {
          .task-os { padding:16px 14px 0; }
          .task-top { padding-left:4px; padding-right:4px; }
          .task-toolbar { padding-left:4px; padding-right:4px; }
          .task-head,
          .task-row {
            grid-template-columns:42px minmax(150px,1.8fr) minmax(108px,.85fr) 60px 74px 62px 42px 62px;
            gap:6px;
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
            padding-top:8px;
          }
          .task-head {
            display:none;
          }
          .task-row {
            display:grid;
            grid-template-columns:minmax(0, 1fr);
            gap:9px;
            min-height:auto;
            padding:12px 10px;
            margin-bottom:8px;
            border:1px solid color-mix(in srgb, var(--border) 72%, transparent);
            border-radius:12px;
            background:color-mix(in srgb, var(--surface) 94%, transparent);
          }
          .task-row:hover {
            background:color-mix(in srgb, var(--surface-2) 38%, var(--surface));
          }
          .task-group-cell {
            display:none;
          }
          .task-name {
            gap:8px;
          }
          .task-name-text strong {
            font-size:12.5px;
            white-space:normal;
            line-height:1.35;
          }
          .task-name-text span {
            font-size:11px;
            white-space:normal;
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
            color:var(--text-secondary);
            font-size:11.5px;
          }
          .task-health::before { content:'Letztes Update'; color:var(--text-muted); }
          .task-row > div:nth-child(4)::before { content:'Priorität'; color:var(--text-muted); }
          .task-row > div:nth-child(5)::before { content:'Verantwortlich'; color:var(--text-muted); }
          .task-row > div:nth-child(6)::before { content:'Datum'; color:var(--text-muted); }
          .task-row > div:nth-child(7)::before { content:'Quelle'; color:var(--text-muted); }
          .task-progress::before { content:'Fortschritt'; color:var(--text-muted); margin-right:auto; }
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
          <h1 className="task-title">Tasks</h1>
          <button className="task-create" type="button" aria-label="Neue Aufgabe vorschlagen" disabled={!hasProjects} onClick={openComposer}>
            <span>Aufgabe vorschlagen</span>
            <span style={{ fontSize: 19, lineHeight: 1 }}>{composerOpen ? '×' : '+'}</span>
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
        <div className="task-tools">
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
        <div className="task-empty projectless">
          <h2>Noch kein Projekt vorhanden</h2>
          <p>Tasks entstehen innerhalb eines Projekts. Lege zuerst ein Projekt an oder starte ein Briefing mit Tagro.</p>
          <div className="task-empty-actions">
            <a href="/new-project">Erstes Projekt anlegen</a>
            <a href="/ai">Projektbriefing starten</a>
          </div>
          {composerNotice ? <div className="task-notice" style={{ marginTop: 14 }}>{composerNotice}</div> : null}
        </div>
      )}

      {composerOpen && (
        <section className="task-composer" aria-label="Aufgabe vorschlagen">
          <div className="task-composer-top">
            <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
              <label className="task-project-select">
                <span
                  style={{
                    width:9,
                    height:9,
                    borderRadius:3,
                    background:projectById.get(suggestProjectId)?.color || 'var(--text-muted)',
                    flexShrink:0,
                  }}
                />
                <select value={suggestProjectId} onChange={(event) => setSuggestProjectId(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </label>
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>›</span>
              <span className="task-composer-title">
                <strong>Aufgabe oder Wunsch vorschlagen</strong>
                <span>Beschreibe, was geändert, ergänzt oder geprüft werden soll.</span>
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

            {composerMode === 'tagro' && (
              <div className="task-tagro-note">
                Tagro ordnet deinen Vorschlag dem Projektkontext zu und bereitet ihn sauber für die Umsetzung vor.
              </div>
            )}
            {composerMode === 'manual' && (
              <div className="task-tagro-note">
                Diese Aufgabe wird direkt an den Projekt-Workflow weitergeleitet und erscheint beim zuständigen Developer.
              </div>
            )}
            {composerNotice ? <div className="task-notice">{composerNotice}</div> : null}
            {tagroPreview && (
              <div className="task-preview">
                <strong>{tagroPreview.suggested_title || 'Tagro Preview'}</strong>
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
              onChange={(event) => { setSuggestTitle(event.target.value); setTagroPreview(null) }}
              placeholder="Welche Aufgabe möchtest du vorschlagen?"
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
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#6366f1' }} />
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
              Due date
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
                placeholder="Enter"
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
            <span>{composerMode === 'tagro' ? 'Empfohlen: erst strukturieren, dann als Aufgabe erstellen.' : 'Wenn kein Developer zugewiesen ist: Die Aufgabe wird erstellt und wartet auf Zuweisung.'}</span>
            <div className="task-composer-actions">
              <button type="button" onClick={closeComposer}>Abbrechen</button>
              <button
                type="button"
                className="primary"
                onClick={createSuggestedTask}
                disabled={creatingSuggestion || !suggestProjectId || (!suggestTitle.trim() && !suggestDescription.trim())}
              >
                {creatingSuggestion ? 'Sende...' : composerMode === 'tagro' ? (tagroPreview ? 'Als Aufgabe erstellen' : 'Mit Tagro vorbereiten') : 'Manuell erstellen'}
              </button>
            </div>
          </div>
        </section>
      )}

      {hasProjects && <div className="task-table">
        <div className="task-head">
          <span style={{ textAlign: 'center' }}>Gruppe</span>
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
        ) : visibleTasks.map((task) => {
          const project = task.project_id ? projectById.get(task.project_id) : null
          const normalized = normalizeStatus(taskState(task))
          const progress = typeof task.progress === 'number' ? task.progress : progressFor(taskState(task))
          const lead = task.developer_name || task.owner || task.assigned_to || 'Developer'
          const selected = selectedTaskIds.includes(task.id)
          const group = taskGroupFor(task)
          const GroupIcon = group.icon

          return (
            <div key={task.id} className={`task-row${selected ? ' selected' : ''}`}>
              <div className="task-group-cell" title={`Gruppe: ${group.label}`}>
                <span className="task-group-icon" style={{ color: group.color }}>
                  <GroupIcon size={15} weight="regular" />
                </span>
              </div>
              <div className="task-name">
                <button
                  className={`task-check${selected ? ' selected' : ''}`}
                  type="button"
                  aria-label={`${task.title} auswählen`}
                  aria-pressed={selected}
                  onClick={() => toggleTaskSelection(task.id)}
                >
                  {selected ? <CheckCircle size={12} weight="bold" /> : null}
                </button>
                <span className="task-name-text">
                  <strong>{task.title}</strong>
                  <span>{project?.title || 'Kein Projekt zugeordnet'}</span>
                </span>
              </div>

              <div className={`task-health ${normalized}`}>
                {normalized === 'done' ? <CheckCircle size={16} weight="fill" /> : <Circle size={16} weight="regular" />}
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
        })}
      </div>}

      {selectedTaskIds.length > 0 && (
        <div className="task-selection-bar" role="toolbar" aria-label="Ausgewählte Aufgaben Aktionen">
          <span className="task-selection-count">{selectedTaskIds.length} selected</span>
          <button className="task-selection-close" type="button" aria-label="Auswahl aufheben" onClick={() => setSelectedTaskIds([])}>
            <X size={13} weight="bold" />
          </button>
          <span className="task-selection-sep" />
          <button type="button" onClick={explainSelectedTask}>Tagro erklären</button>
          <button type="button" onClick={suggestChangeForSelectedTask}>Änderung vorschlagen</button>
        </div>
      )}
      </div>
    </div>
  )
}
