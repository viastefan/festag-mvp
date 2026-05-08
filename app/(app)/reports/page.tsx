'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { createClient } from '@/lib/supabase/client'
import { projectColor } from '@/components/Sidebar'
import {
  Archive,
  ArrowRight,
  ChatCircleText,
  CheckCircle,
  DownloadSimple,
  FunnelSimple,
  Lightbulb,
  MagicWand,
  PaperPlaneTilt,
  SlidersHorizontal,
  WarningCircle,
} from '@phosphor-icons/react'

type Project = { id: string; title: string; status: string; description?: string | null; color?: string | null }
type Report = { id: string; project_id: string; content: string; created_at: string; type?: string | null }
type Period = 'today' | 'week' | 'month' | 'custom'
type SuggestionKind = 'workspace' | 'team'
type TaskStatus = 'open' | 'active' | 'waiting' | 'review' | 'checked' | 'done' | 'suggested' | 'blocked'
type TaskRow = {
  id: string
  project_id: string
  title: string
  status?: string | null
  priority?: string | null
  updated_at?: string | null
}
type TaskSuggestion = {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  kind: SuggestionKind
  reason: string
}

type ProjectStatusRow = {
  project: Project
  progress: number
  phase: string
  latestReport: Report | null
  blockerCount: number
  decisionCount: number
  taskCount: number
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'custom', label: 'Benutzerdefiniert' },
]

const FALLBACK_REPORT = `## Zusammenfassung
Für dieses Projekt wurde noch kein Statusbericht generiert. Festag nutzt Statusberichte als Übersetzungsschicht zwischen laufender Dev-Arbeit und Client-Verständnis.

## Was wurde erledigt
- Noch kein abgeschlossener Bericht vorhanden.

## Was ist in Arbeit
- Sobald Projektfortschritt, Aufgaben oder Updates vorliegen, kann Tagro daraus einen verständlichen Bericht erzeugen.

## Blocker / Risiken
- Noch keine Risiken erfasst.

## Nächste Schritte
1. Projekt auswählen.
2. Zeitraum wählen.
3. Statusbericht generieren.

## Entscheidungen vom Client benötigt
- Aktuell keine Entscheidung erfasst.

## Mögliche neue Tasks
- Task-Vorschläge entstehen erst nach Berichtsanalyse.

## Von Tagro empfohlene Priorität
Mittel`

function priorityLabel(priority: TaskSuggestion['priority']) {
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'low') return 'Niedrig'
  return 'Mittel'
}

function priorityColor(priority: TaskSuggestion['priority']) {
  if (priority === 'critical') return '#ef4444'
  if (priority === 'high') return '#f97316'
  if (priority === 'low') return '#22c55e'
  return '#f59e0b'
}

function dateLabel(value?: string | null, fallback = 'Noch kein Bericht') {
  if (!value) return fallback
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function projectPhaseLabel(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase()
  if (['planning', 'intake', 'new'].includes(normalized)) return 'Planung'
  if (['active', 'in_progress', 'doing'].includes(normalized)) return 'In Umsetzung'
  if (['review', 'testing'].includes(normalized)) return 'Prüfung'
  if (['delivery', 'ready'].includes(normalized)) return 'Übergabe'
  if (['done', 'completed'].includes(normalized)) return 'Erledigt'
  return 'Intake'
}

function normalizeTaskStatus(status?: string | null): TaskStatus {
  const normalized = String(status ?? '').toLowerCase()
  if (['done', 'completed', 'delivered'].includes(normalized)) return 'done'
  if (['checked', 'verified', 'festag_checked'].includes(normalized)) return 'checked'
  if (['review', 'ready_for_review', 'in_review'].includes(normalized)) return 'review'
  if (['waiting', 'needs_decision', 'decision_required'].includes(normalized)) return 'waiting'
  if (['blocked', 'risk'].includes(normalized)) return 'blocked'
  if (['doing', 'active', 'in_progress'].includes(normalized)) return 'active'
  if (['suggested', 'proposed'].includes(normalized)) return 'suggested'
  return 'open'
}

function deriveReportSections(content: string) {
  const blocker = /blocker|risiko|abhängig|wartet|fehlt|kritisch/i.test(content)
  const decision = /entscheidung|freigabe|bestätig|client|kunde|auswahl/i.test(content)
  return {
    blockers: blocker
      ? ['Mögliche Abhängigkeiten oder Risiken wurden im Bericht erkannt.']
      : ['Keine kritischen Blocker im aktuellen Bericht erkannt.'],
    decisions: decision
      ? ['Eine Client-Entscheidung oder Freigabe könnte erforderlich sein.']
      : ['Aktuell keine zwingende Entscheidung vom Client erforderlich.'],
  }
}

function fallbackSuggestions(projectName: string): TaskSuggestion[] {
  return [
    {
      id: 'scope-check',
      title: 'Scope nach Statusbericht prüfen',
      description: `Den aktuellen Scope von ${projectName} gegen Blocker, Entscheidungen und nächste Schritte prüfen.`,
      priority: 'medium',
      kind: 'workspace',
      reason: 'Statusberichte erzeugen zuerst Vorschläge. Owner/Lead/Festag prüft, ob daraus ein echter Task wird.',
    },
    {
      id: 'handoff-prepare',
      title: 'Team-Handoff vorbereiten',
      description: 'Falls operative Umsetzung nötig ist, kann Tagro daraus technische Team-Tasks ableiten.',
      priority: 'high',
      kind: 'team',
      reason: 'Workspace Tasks strukturieren. Team Tasks setzen operativ um.',
    },
  ]
}

export default function ReportsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([])
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const [{ data: projectRows }, { data: reportRows }, { data: taskRows }] = await Promise.all([
        (supabase as any).from('projects').select('id,title,status,description,color').order('created_at', { ascending: false }),
        (supabase as any).from('ai_updates').select('*').eq('type', 'status_report').order('created_at', { ascending: false }).limit(80),
        (supabase as any).from('tasks').select('id,project_id,title,status,priority,updated_at').order('updated_at', { ascending: false }),
      ])

      const list = (projectRows as Project[]) ?? []
      setProjects(list)
      setReports((reportRows as Report[]) ?? [])
      setTasks((taskRows as TaskRow[]) ?? [])
      if (list.length === 1) setSelectedProjectId(list[0].id)
      setLoading(false)
    })
  }, [])

  const projectStatusRows = useMemo<ProjectStatusRow[]>(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id)
      const projectReports = reports.filter((report) => report.project_id === project.id)
      const latestReport = projectReports[0] ?? null
      const doneCount = projectTasks.filter((task) => ['done', 'checked'].includes(normalizeTaskStatus(task.status))).length
      const progress = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0
      const blockerCount = projectTasks.filter((task) => ['blocked', 'waiting'].includes(normalizeTaskStatus(task.status))).length + (/blocker|risiko|wartet|kritisch/i.test(latestReport?.content ?? '') ? 1 : 0)
      const decisionCount = projectTasks.filter((task) => normalizeTaskStatus(task.status) === 'waiting').length + (/entscheidung|freigabe|bestätig|kunde|client/i.test(latestReport?.content ?? '') ? 1 : 0)

      return {
        project,
        progress,
        phase: projectPhaseLabel(project.status),
        latestReport,
        blockerCount,
        decisionCount,
        taskCount: projectTasks.length,
      }
    })
  }, [projects, reports, tasks])

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') return projectStatusRows[0]?.project ?? null
    return projects.find((project) => project.id === selectedProjectId) ?? null
  }, [projects, projectStatusRows, selectedProjectId])

  const currentProject = selectedProject ?? projects[0] ?? null
  const currentReports = useMemo(() => {
    if (!currentProject) return []
    return reports.filter((report) => report.project_id === currentProject.id)
  }, [currentProject, reports])

  useEffect(() => {
    if (!currentReports.length) {
      setSelectedReportId(null)
      return
    }
    if (!selectedReportId || !currentReports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(currentReports[0].id)
    }
  }, [currentReports, selectedReportId])

  const currentReport = currentReports.find((report) => report.id === selectedReportId) ?? currentReports[0] ?? null
  const currentSections = deriveReportSections(currentReport?.content ?? FALLBACK_REPORT)

  useEffect(() => {
    if (currentProject) setTaskSuggestions(fallbackSuggestions(currentProject.title))
  }, [currentProject?.id])

  function openProjectReport(row: ProjectStatusRow) {
    setSelectedProjectId(row.project.id)
    setSelectedReportId(row.latestReport?.id ?? null)
    window.requestAnimationFrame(() => document.getElementById('aktueller-bericht')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  async function generateReport() {
    const project = currentProject
    if (!project) return
    setGenerating(true)
    try {
      const projectTasks = tasks.filter((task) => task.project_id === project.id)
      const done = projectTasks.filter((task) => normalizeTaskStatus(task.status) === 'done').length
      const active = projectTasks.filter((task) => normalizeTaskStatus(task.status) === 'active').length
      const review = projectTasks.filter((task) => normalizeTaskStatus(task.status) === 'review').length
      const blocked = projectTasks.filter((task) => ['blocked', 'waiting'].includes(normalizeTaskStatus(task.status))).length
      const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0

      const prompt = `Projekt: ${project.title}\nZeitraum: ${PERIODS.find((item) => item.id === period)?.label}\nBeschreibung: ${project.description ?? 'Keine Beschreibung'}\nPhase: ${project.status}\nFortschritt: ${progress}%\nTasks: ${projectTasks.length} gesamt, ${done} erledigt, ${active} in Arbeit, ${review} in Prüfung, ${blocked} blockiert/wartend.\n\nTask-Auszug:\n${projectTasks.slice(0, 18).map((task) => `- [${task.status ?? 'todo'}] ${task.title}`).join('\n')}\n\nErstelle einen Festag-Statusbericht als Übersetzungsschicht zwischen Dev-Arbeit und Client-Verständnis.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 850,
          system: `Du bist Tagro, AI-Projektmanager von Festag. Erstelle einen ruhigen, verständlichen deutschen Statusbericht. Nicht technisch überladen. Struktur exakt: Zusammenfassung, Was wurde erledigt, Was ist in Arbeit, Blocker / Risiken, Nächste Schritte, Entscheidungen vom Client benötigt, Mögliche neue Tasks, Von Tagro empfohlene Priorität. Mögliche Tasks nur als Vorschläge formulieren, keine automatische Scope-Erweiterung. Keine Emojis.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const content = data.content?.[0]?.text || FALLBACK_REPORT
      const { data: inserted, error } = await (supabase as any)
        .from('ai_updates')
        .insert({ project_id: project.id, content, type: 'status_report' })
        .select()
        .single()
      if (error) throw error
      if (inserted) {
        setReports((current) => [inserted as Report, ...current])
        setSelectedReportId((inserted as Report).id)
      }
      setTaskSuggestions(fallbackSuggestions(project.title))
    } catch (error: any) {
      alert(error?.message ?? 'Tagro konnte den Bericht nicht generieren.')
    } finally {
      setGenerating(false)
    }
  }

  async function extractTaskSuggestions() {
    const report = currentReport
    if (!report) return
    setExtracting(true)
    try {
      const res = await fetch('/api/ai/report-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, projectId: report.project_id, content: report.content, autoInsert: false }),
      })
      const data = await res.json()
      const nextTasks = (data.tasks as any[] | undefined) ?? []
      if (nextTasks.length) {
        setTaskSuggestions(nextTasks.map((task, index) => ({
          id: `${report.id}-${index}`,
          title: task.title ?? 'Neuer Task-Vorschlag',
          description: task.description ?? 'Dieser mögliche Task wurde aus dem Statusbericht erkannt.',
          priority: task.priority ?? 'medium',
          kind: 'workspace',
          reason: 'Aus Statusbericht erkannt. Wird nur als Vorschlag zur Prüfung eingereicht.',
        })))
      } else {
        setTaskSuggestions(fallbackSuggestions(currentProject?.title ?? 'dieses Projekt'))
      }
    } catch {
      setTaskSuggestions(fallbackSuggestions(currentProject?.title ?? 'dieses Projekt'))
    } finally {
      setExtracting(false)
    }
  }

  async function suggestTask(task: TaskSuggestion) {
    const projectId = currentReport?.project_id ?? currentProject?.id
    if (!projectId) return
    setSavingSuggestionId(task.id)
    try {
      await (supabase as any).from('tasks').insert({
        project_id: projectId,
        title: task.title,
        description: `${task.description}\n\nQuelle: Statusbericht / Tagro Vorschlag\nKontext: ${task.reason}`,
        status: 'suggested',
        priority: task.priority,
        source: task.kind === 'team' ? 'status_report_team_suggestion' : 'status_report_workspace_suggestion',
      })
      setTaskSuggestions((current) => current.filter((item) => item.id !== task.id))
    } finally {
      setSavingSuggestionId(null)
    }
  }

  function exportReport(report: Report) {
    const project = projects.find((item) => item.id === report.project_id)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>${project?.title ?? 'Statusbericht'} — Festag</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:760px;margin:52px auto;padding:0 28px;color:#171717;line-height:1.72}h1{font-size:24px;margin:12px 0 4px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#777;text-transform:uppercase}pre{white-space:pre-wrap;font:inherit}</style></head><body><div class="eyebrow">Festag Statusbericht</div><h1>${project?.title ?? 'Projekt'}</h1><p>${dateLabel(report.created_at)}</p><pre>${report.content.replace(/</g, '&lt;')}</pre></body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 350)
  }

  if (loading) {
    return <div style={{ padding: 52, color: 'var(--text-muted)' }}>Statusberichte werden geladen…</div>
  }

  return (
    <div className="reports-os">
      <style>{`
        .reports-os { color:var(--text); width:100%; min-height:100%; }
        .reports-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:0 0 22px; }
        .reports-hero h1 { margin:0; font-size:25px; line-height:1.05; letter-spacing:-.035em; font-weight:740; }
        .reports-hero p { margin:7px 0 0; color:var(--text-secondary); font-size:13px; line-height:1.45; }
        .reports-controlbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border:1px solid var(--border); border-radius:16px; background:var(--surface); margin-bottom:14px; }
        .reports-controls { display:flex; align-items:center; gap:8px; min-width:0; flex-wrap:wrap; }
        .reports-select, .reports-period, .reports-primary, .reports-ghost { height:32px; border-radius:10px; border:1px solid var(--border); background:var(--card); color:var(--text); font:inherit; font-size:12.5px; font-weight:650; padding:0 10px; }
        .reports-period { color:var(--text-secondary); cursor:pointer; }
        .reports-period.on { background:var(--text); color:var(--bg); border-color:var(--text); }
        .reports-primary { background:var(--btn-prim); color:var(--btn-prim-text); border-color:transparent; cursor:pointer; display:flex; align-items:center; gap:7px; }
        .reports-primary:disabled, .reports-ghost:disabled { opacity:.55; cursor:default; }
        .reports-ghost { color:var(--text-secondary); background:transparent; cursor:pointer; display:flex; align-items:center; gap:7px; }
        .reports-ghost:hover:not(:disabled) { background:var(--surface-2); color:var(--text); }
        .reports-panel { border:1px solid var(--border); border-radius:18px; background:var(--surface); overflow:hidden; }
        .reports-panel-head { min-height:42px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 66%, transparent); }
        .reports-panel-head h2 { margin:0; font-size:12.5px; font-weight:740; letter-spacing:.01em; }
        .project-status-panel { margin-bottom:14px; }
        .project-status-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .project-status-table th { height:36px; color:var(--text-muted); font-size:11px; font-weight:760; text-transform:uppercase; letter-spacing:.055em; text-align:left; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent); }
        .project-status-table td { height:58px; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 45%, transparent); font-size:12.5px; color:var(--text-secondary); vertical-align:middle; }
        .project-status-table tr:last-child td { border-bottom:0; }
        .project-status-table tbody tr { cursor:pointer; }
        .project-status-table tbody tr:hover { background:var(--surface-2); }
        .project-title-cell { display:flex; align-items:center; gap:9px; min-width:0; color:var(--text); font-weight:720; }
        .project-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
        .project-name-wrap { min-width:0; }
        .project-name-wrap strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .project-name-wrap span { display:block; color:var(--text-muted); font-size:11px; font-weight:620; margin-top:2px; }
        .progress-cell { display:flex; align-items:center; gap:8px; color:var(--text); font-weight:700; }
        .progress-track { width:84px; height:5px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
        .progress-fill { height:100%; border-radius:inherit; background:var(--accent); }
        .count-pill { min-width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border-radius:999px; background:var(--surface-2); color:var(--text); font-size:11.5px; font-weight:760; }
        .open-report { height:28px; border:1px solid var(--border); border-radius:9px; background:var(--card); color:var(--text); font:inherit; font-size:11.5px; font-weight:740; padding:0 9px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; white-space:nowrap; }
        .open-report:hover { background:var(--text); color:var(--bg); }
        .reports-detail-grid { display:grid; grid-template-columns:minmax(0, 1fr) 320px; gap:14px; align-items:start; }
        .report-main { min-height:620px; }
        .report-meta { display:flex; align-items:center; gap:8px; min-width:0; }
        .report-meta-title { display:flex; align-items:center; gap:8px; min-width:0; }
        .report-meta-title span { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
        .report-meta-title strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .report-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
        .report-body { padding:24px 28px 30px; font-size:14px; line-height:1.76; color:var(--text-secondary); }
        .report-body h1, .report-body h2, .report-body h3 { color:var(--text); letter-spacing:-.02em; }
        .report-body h2 { font-size:17px; margin:24px 0 8px; }
        .report-body p { margin:0 0 12px; }
        .report-body ul, .report-body ol { padding-left:20px; }
        .report-history { padding:0 14px 14px; display:flex; flex-wrap:wrap; gap:7px; }
        .history-chip { height:28px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--text-secondary); font:inherit; font-size:11.5px; font-weight:700; padding:0 10px; cursor:pointer; }
        .history-chip.on, .history-chip:hover { background:var(--surface-2); color:var(--text); }
        .insight-list { padding:10px; display:flex; flex-direction:column; gap:10px; }
        .insight-block { border:1px solid var(--border); border-radius:14px; background:var(--card); padding:12px; }
        .insight-label { display:flex; align-items:center; gap:7px; color:var(--text-muted); font-size:11px; font-weight:760; letter-spacing:.055em; text-transform:uppercase; margin-bottom:8px; }
        .insight-row { display:flex; gap:9px; align-items:flex-start; color:var(--text-secondary); font-size:12.5px; line-height:1.45; padding:5px 0; }
        .suggestion-row { border:1px solid var(--border); border-radius:13px; padding:11px; background:var(--surface); display:flex; flex-direction:column; gap:8px; }
        .suggestion-row + .suggestion-row { margin-top:8px; }
        .suggestion-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
        .suggestion-title { margin:0; font-size:12.8px; line-height:1.3; color:var(--text); font-weight:720; }
        .suggestion-desc { margin:4px 0 0; color:var(--text-secondary); font-size:11.8px; line-height:1.45; }
        .suggestion-pill { font-size:9.5px; font-weight:800; letter-spacing:.05em; padding:3px 6px; border-radius:999px; background:var(--surface-2); white-space:nowrap; }
        .suggestion-kind { color:var(--text-muted); font-size:11px; font-weight:680; }
        .suggestion-action { height:28px; border-radius:8px; border:1px solid var(--border); background:var(--card); color:var(--text); font:inherit; font-size:11.5px; font-weight:700; cursor:pointer; }
        .suggestion-action:hover { background:var(--surface-2); }
        .side-action { width:100%; justify-content:flex-start; margin-top:7px; }
        .report-empty { padding:72px 22px; text-align:center; color:var(--text-muted); }
        .report-empty strong { display:block; color:var(--text); font-size:15px; margin-bottom:5px; }
        @media(max-width:1180px) { .reports-detail-grid { grid-template-columns:1fr; } .project-status-table { min-width:860px; } .project-status-scroll { overflow-x:auto; } }
        @media(max-width:820px) { .reports-hero, .reports-controlbar { align-items:stretch; flex-direction:column; } .reports-panel { border-radius:14px; } .report-body { padding:20px; } .project-status-panel { overflow:hidden; } }
      `}</style>

      <header className="reports-hero">
        <div>
          <h1>Statusberichte</h1>
          <p>Verstehe jederzeit, was in deinen Projekten passiert.</p>
        </div>
        <button className="reports-primary" type="button" onClick={generateReport} disabled={!currentProject || generating}>
          <MagicWand size={15} weight="bold" />
          {generating ? 'Bericht wird generiert…' : 'Statusbericht generieren'}
        </button>
      </header>

      <section className="reports-controlbar" aria-label="Statusbericht Einstellungen">
        <div className="reports-controls">
          <select className="reports-select" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} aria-label="Projekt auswählen">
            <option value="all">Alle Projekte</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
          {PERIODS.map((item) => (
            <button key={item.id} className={`reports-period${period === item.id ? ' on' : ''}`} type="button" onClick={() => setPeriod(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <button className="reports-ghost" type="button" onClick={extractTaskSuggestions} disabled={!currentReport || extracting}>
          <Lightbulb size={15} />
          {extracting ? 'Vorschläge werden erkannt…' : 'Task-Vorschläge prüfen'}
        </button>
      </section>

      <section className="reports-panel project-status-panel" aria-label="Projekt Status Liste">
        <div className="reports-panel-head">
          <h2>Projekt-Status</h2>
          <SlidersHorizontal size={14} color="var(--text-muted)" />
        </div>
        <div className="project-status-scroll">
          <table className="project-status-table">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Projekt</th>
                <th>Fortschritt</th>
                <th>Phase</th>
                <th>Letzter Bericht</th>
                <th>Blocker</th>
                <th>Entscheidungen</th>
                <th style={{ width: 132 }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {projectStatusRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="report-empty" style={{ padding: 36 }}>
                      <strong>Noch keine Projekte</strong>
                      <span>Sobald Projekte existieren, werden sie hier als Status-Zentrale angezeigt.</span>
                    </div>
                  </td>
                </tr>
              ) : projectStatusRows.map((row) => {
                const color = projectColor(row.project.id, row.project.color)
                return (
                  <tr key={row.project.id} onClick={() => openProjectReport(row)}>
                    <td>
                      <div className="project-title-cell">
                        <span className="project-dot" style={{ background: color }} />
                        <div className="project-name-wrap">
                          <strong>{row.project.title}</strong>
                          <span>{row.taskCount} Tasks im Workspace</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${row.progress}%`, background: color }} /></div>
                        {row.progress}%
                      </div>
                    </td>
                    <td>{row.phase}</td>
                    <td>{dateLabel(row.latestReport?.created_at)}</td>
                    <td><span className="count-pill">{row.blockerCount}</span></td>
                    <td><span className="count-pill">{row.decisionCount}</span></td>
                    <td>
                      <button className="open-report" type="button" onClick={(event) => { event.stopPropagation(); openProjectReport(row) }}>
                        Bericht öffnen <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <main className="reports-detail-grid">
        <section className="reports-panel report-main" id="aktueller-bericht">
          <div className="reports-panel-head">
            <div className="report-meta-title">
              <span style={{ background: currentProject ? projectColor(currentProject.id, currentProject.color) : 'var(--text-muted)' }} />
              <strong>{currentProject?.title ?? 'Aktueller Bericht'}</strong>
              <small style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{currentReport ? dateLabel(currentReport.created_at) : 'Noch nicht generiert'}</small>
            </div>
            <div className="report-actions">
              <button className="reports-ghost" type="button" onClick={generateReport} disabled={!currentProject || generating}>
                <MagicWand size={14} /> Neu generieren
              </button>
              <button className="reports-ghost" type="button" onClick={() => currentReport && exportReport(currentReport)} disabled={!currentReport}>
                <DownloadSimple size={14} /> PDF vorbereiten
              </button>
              <Link className="reports-ghost" href="/ai?view=chat" style={{ textDecoration: 'none' }}>
                <ChatCircleText size={14} /> Mit Tagro sprechen
              </Link>
            </div>
          </div>
          <article className="report-body">
            <ChatMarkdown text={currentReport?.content ?? FALLBACK_REPORT} />
          </article>
          {currentReports.length > 1 && (
            <div className="report-history" aria-label="Berichtshistorie">
              {currentReports.slice(0, 8).map((report) => (
                <button key={report.id} className={`history-chip${report.id === currentReport?.id ? ' on' : ''}`} type="button" onClick={() => setSelectedReportId(report.id)}>
                  {dateLabel(report.created_at)}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="reports-panel reports-side">
          <div className="reports-panel-head">
            <h2>Aus Bericht erkannt</h2>
            <FunnelSimple size={14} color="var(--text-muted)" />
          </div>
          <div className="insight-list">
            <div className="insight-block">
              <div className="insight-label"><Lightbulb size={14} /> Task-Vorschläge</div>
              {taskSuggestions.map((task) => {
                const color = priorityColor(task.priority)
                return (
                  <div className="suggestion-row" key={task.id}>
                    <div className="suggestion-top">
                      <div>
                        <p className="suggestion-title">{task.title}</p>
                        <p className="suggestion-desc">{task.description}</p>
                      </div>
                      <span className="suggestion-pill" style={{ color }}>{priorityLabel(task.priority)}</span>
                    </div>
                    <div className="suggestion-kind">{task.kind === 'team' ? 'Team-Execution möglich' : 'Workspace-Task Vorschlag'} · Status danach: Zur Prüfung</div>
                    <button className="suggestion-action" type="button" onClick={() => suggestTask(task)} disabled={savingSuggestionId === task.id}>
                      {savingSuggestionId === task.id ? 'Wird vorgeschlagen…' : 'Als Task vorschlagen'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="insight-block">
              <div className="insight-label"><CheckCircle size={14} /> Offene Entscheidungen</div>
              {currentSections.decisions.map((item) => <div className="insight-row" key={item}>{item}</div>)}
            </div>

            <div className="insight-block">
              <div className="insight-label"><WarningCircle size={14} /> Risiken</div>
              {currentSections.blockers.map((item) => <div className="insight-row" key={item}>{item}</div>)}
            </div>

            <div className="insight-block">
              <div className="insight-label"><MagicWand size={14} /> Aktionen</div>
              <button className="reports-ghost side-action" type="button" onClick={generateReport} disabled={!currentProject || generating}>Statusbericht generieren</button>
              <button className="reports-ghost side-action" type="button" onClick={extractTaskSuggestions} disabled={!currentReport || extracting}>Task-Vorschläge prüfen</button>
              <button className="reports-ghost side-action" type="button" onClick={() => currentReport && navigator.clipboard.writeText(currentReport.content)} disabled={!currentReport}><PaperPlaneTilt size={14} /> Mit Team teilen</button>
              <button className="reports-ghost side-action" type="button"><Archive size={14} /> Archivieren</button>
              <button className="reports-ghost side-action" type="button" onClick={() => currentReport && exportReport(currentReport)} disabled={!currentReport}><DownloadSimple size={14} /> Export vorbereiten</button>
            </div>

            <div className="insight-block">
              <div className="insight-label"><SlidersHorizontal size={14} /> Festag Architektur</div>
              <div className="insight-row">Statusberichte erkennen. Workspace Tasks strukturieren. Team Tasks setzen operativ um.</div>
              <Link href="/tasks" style={{ color: 'var(--text)', fontSize: 12, fontWeight: 740, textDecoration: 'none' }}>Workspace Tasks öffnen →</Link>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
