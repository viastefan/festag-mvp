'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ChatMarkdown from '@/components/ChatMarkdown'
import AppPageHeader from '@/components/AppPageHeader'
import VoiceBriefingButton from '@/components/AudioBriefingButton'
import VoiceControls from '@/components/VoiceControls'
import { generateBriefingText } from '@/lib/briefings'
import { createClient } from '@/lib/supabase/client'
import { projectColor } from '@/components/Sidebar'
import {
  Archive,
  ArrowRight,
  ChatCircleText,
  DownloadSimple,
  Headphones,
  Lightbulb,
  MagicWand,
  PaperPlaneTilt,
  SlidersHorizontal,
  Sparkle,
  WarningCircle,
} from '@phosphor-icons/react'

type Project = { id: string; title: string; status: string; description?: string | null; color?: string | null }
type Report = { id: string; project_id: string; content: string; created_at: string; type?: string | null }
type DevSignal = { id: string; project_id: string; content: string; created_at: string; type?: string | null }
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

type ReportSection = {
  id: string
  title: string
  body: string
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'custom', label: 'Benutzerdefiniert' },
]

const FALLBACK_REPORT = `## Zusammenfassung
Für dieses Projekt wurde noch kein Statusbericht generiert. Festag nutzt Projektbriefings als Übersetzungsschicht zwischen laufender Dev-Arbeit und Client-Verständnis.

## Was wurde erledigt
- Noch kein abgeschlossener Bericht vorhanden.

## Was ist in Arbeit
- Sobald Projektfortschritt, Aufgaben oder Updates vorliegen, kann Tagro daraus einen verständlichen Bericht erzeugen.

## Blocker / Risiken
- Noch keine Risiken erfasst.

## Nächste Schritte
1. Projekt auswählen.
2. Zeitraum wählen.
3. Briefing aktualisieren.

## Entscheidungen vom Client benötigt
- Aktuell keine Entscheidung erfasst.

## Verbesserungsvorschläge von Tagro
- Sobald genug Daten vorliegen, listet Tagro hier konkrete Optimierungen für dein Projekt.

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

function parseReportBriefing(content: string): ReportSection[] {
  const source = content?.trim() || FALLBACK_REPORT
  const matches = [...source.matchAll(/^##\s+(.+)$/gm)]
  if (!matches.length) {
    return [{ id: 'zusammenfassung', title: 'Zusammenfassung', body: source }]
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? source.length
    const title = match[1].trim()
    return {
      id: title.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/(^-|-$)/g, '') || `section-${index}`,
      title,
      body: source.slice(start, end).trim() || 'Noch keine Details vorhanden.',
    }
  })
}

function fallbackSuggestions(projectName: string): TaskSuggestion[] {
  return [
    {
      id: 'scope-check',
      title: 'Scope nach Statusbericht prüfen',
      description: `Den aktuellen Scope von ${projectName} gegen Blocker, Entscheidungen und nächste Schritte prüfen.`,
      priority: 'medium',
      kind: 'workspace',
      reason: 'Projektbriefings erzeugen zuerst Vorschläge. Owner/Lead/Festag prüft, ob daraus ein echter Task wird.',
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

function ReportsPage() {
  const searchParams = useSearchParams()
  const initialProject = searchParams?.get('project')
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [devSignals, setDevSignals] = useState<DevSignal[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProject || 'all')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([])
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ zusammenfassung: true })
  const [activeSignal, setActiveSignal] = useState<'tasks' | 'updates' | 'decisions' | 'risks' | 'actions'>('tasks')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const [{ data: projectRows }, { data: reportRows }, { data: devRows }, { data: taskRows }] = await Promise.all([
        (supabase as any).from('projects').select('id,title,status,description,color').order('created_at', { ascending: false }),
        (supabase as any).from('ai_updates').select('*').eq('type', 'status_report').order('created_at', { ascending: false }).limit(80),
        (supabase as any).from('ai_updates').select('*').eq('type', 'dev_progress_update').order('created_at', { ascending: false }).limit(80),
        (supabase as any).from('tasks').select('id,project_id,title,status,priority,updated_at').order('updated_at', { ascending: false }),
      ])

      const list = (projectRows as Project[]) ?? []
      setProjects(list)
      setReports((reportRows as Report[]) ?? [])
      setDevSignals((devRows as DevSignal[]) ?? [])
      setTasks((taskRows as TaskRow[]) ?? [])
      if (!initialProject && list.length === 1) setSelectedProjectId(list[0].id)
      setLoading(false)
    })
  }, [])

  const projectStatusRows = useMemo<ProjectStatusRow[]>(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id)
      const projectDevSignals = devSignals.filter((signal) => signal.project_id === project.id).slice(0, 8)
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
  const currentDevSignals = useMemo(() => {
    if (!currentProject) return []
    return devSignals.filter((signal) => signal.project_id === currentProject.id).slice(0, 5)
  }, [currentProject, devSignals])

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
  const reportContent = currentReport?.content ?? FALLBACK_REPORT
  const currentSections = deriveReportSections(reportContent)
  const briefingSections = useMemo(() => parseReportBriefing(reportContent), [reportContent])
  const currentStatusRow = useMemo(() => {
    if (!currentProject) return null
    return projectStatusRows.find((row) => row.project.id === currentProject.id) ?? null
  }, [currentProject, projectStatusRows])

  useEffect(() => {
    const summary = briefingSections[0]?.id ?? 'zusammenfassung'
    // Default: open the Zusammenfassung, plus the two action-driving sections
    // (Entscheidungen + Verbesserungsvorschläge) so the client sees them
    // immediately without an extra click.
    const open: Record<string, boolean> = { [summary]: true }
    briefingSections.forEach(s => {
      if (/entscheidung/i.test(s.title) || /verbesserung/i.test(s.title)) {
        open[s.id] = true
      }
    })
    setOpenSections(open)
  }, [currentReport?.id, briefingSections])

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

      const prompt = `Projekt: ${project.title}\nZeitraum: ${PERIODS.find((item) => item.id === period)?.label}\nBeschreibung: ${project.description ?? 'Keine Beschreibung'}\nPhase: ${project.status}\nFortschritt: ${progress}%\nTasks: ${projectTasks.length} gesamt, ${done} erledigt, ${active} in Arbeit, ${review} in Prüfung, ${blocked} blockiert/wartend.\n\nTask-Auszug:\n${projectTasks.slice(0, 18).map((task) => `- [${task.status ?? 'todo'}] ${task.title}`).join('\n')}\n\nDeveloper-Signale aus dem Execution Board:\n${projectDevSignals.length ? projectDevSignals.map((signal) => `- ${signal.content}`).join('\n') : '- Noch keine Developer-Updates vorhanden.'}\n\nErstelle einen Festag-Statusbericht als Übersetzungsschicht zwischen Dev-Arbeit und Client-Verständnis.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 850,
          system: `Du bist Tagro, AI-Projektmanager von Festag. Erstelle einen ruhigen, verständlichen deutschen Statusbericht im podcast-tauglichen Stil — natürlich gesprochen, ohne Markdown-Geräusche.
Pflicht-Struktur, jede Section mit "## " starten, in genau dieser Reihenfolge:
## Zusammenfassung
## Was wurde erledigt
## Was ist in Arbeit
## Blocker / Risiken
## Nächste Schritte
## Entscheidungen vom Client benötigt
   — Jede Entscheidung als Bulletpoint mit einem konkreten ja/nein-fähigen Satz, damit der Client weiß was er freigeben soll.
## Verbesserungsvorschläge von Tagro
   — Konkrete Optimierungen die Tagro vorschlägt. Tasks die wir anlegen sollten, ohne Scope-Erweiterung zu erzwingen. Jeder Vorschlag als Bulletpoint, kurz und actionable.
## Mögliche neue Tasks
   — Nur Vorschläge zur Prüfung, niemals automatische Scope-Erweiterung.
## Von Tagro empfohlene Priorität
Keine Emojis. Keine Floskeln. Wenn keine Daten vorliegen, ehrlich sagen "Noch keine Signale erkannt" statt zu erfinden.`,
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
    return <div style={{ padding: 52, color: 'var(--text-muted)' }}>Projektbriefings werden geladen…</div>
  }

  return (
    <div className="reports-intelligence">
      <style>{`
        .reports-intelligence { color:var(--text); width:100%; height:100%; min-height:0; padding:30px 36px 0; display:flex; flex-direction:column; overflow:hidden; }
        .reports-static-top { flex:0 0 auto; position:relative; z-index:8; }
        .reports-scroll-body { flex:1 1 auto; min-height:0; overflow:auto; padding:0 0 96px; scrollbar-gutter:stable; overscroll-behavior:contain; }
        .reports-intelligence .app-page-header { margin-bottom:26px; }
        .reports-commandline { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:42px; }
        .reports-controls { display:flex; align-items:center; gap:8px; min-width:0; flex-wrap:wrap; }
        .reports-select, .reports-period, .reports-primary, .reports-ghost, .reports-inline-action { height:32px; border-radius:999px; border:1px solid color-mix(in srgb, var(--border) 72%, transparent); background:transparent; color:var(--text); font:inherit; font-size:12.5px; font-weight:650; padding:0 11px; }
        .reports-select { min-width:180px; border-radius:10px; background:color-mix(in srgb, var(--surface) 54%, transparent); }
        .reports-period { color:var(--text-muted); cursor:pointer; }
        .reports-period.on { background:var(--text); color:var(--bg); border-color:var(--text); }
        .reports-primary { background:var(--btn-prim); color:var(--btn-prim-text); border-color:transparent; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
        .reports-primary:disabled, .reports-ghost:disabled, .reports-inline-action:disabled { opacity:.5; cursor:default; }
        .reports-ghost, .reports-inline-action { color:var(--text-secondary); cursor:pointer; display:inline-flex; align-items:center; gap:7px; text-decoration:none; }
        .reports-inline-action--ghost { border-color:transparent; opacity:.72; }
        .reports-inline-action--ghost:hover { opacity:1; border-color:color-mix(in srgb, var(--border) 50%, transparent); }
        .reports-ghost:hover:not(:disabled), .reports-inline-action:hover:not(:disabled) { color:var(--text); background:color-mix(in srgb, var(--surface-2) 72%, transparent); }
        .reports-section-kicker { margin:0 0 12px; color:var(--text-muted); font-size:11px; font-weight:790; letter-spacing:.09em; text-transform:uppercase; }
        .project-status-stream { margin-bottom:50px; }
        .project-line-head, .project-line { display:grid; grid-template-columns:minmax(260px, 1.5fr) minmax(120px,.8fr) minmax(92px,.55fr) minmax(132px,.65fr) minmax(82px,.42fr) minmax(112px,.55fr) minmax(116px,.48fr); column-gap:22px; align-items:center; }
        .project-line-head { min-height:30px; color:var(--text-muted); font-size:10.5px; font-weight:790; letter-spacing:.08em; text-transform:uppercase; padding:0 8px; }
        .project-line { width:100%; min-height:62px; border:0; border-top:1px solid color-mix(in srgb, var(--border) 52%, transparent); background:transparent; color:inherit; font:inherit; text-align:left; padding:0 8px; cursor:pointer; }
        .project-line:last-child { border-bottom:1px solid color-mix(in srgb, var(--border) 42%, transparent); }
        .project-line:hover { background:color-mix(in srgb, var(--surface-2) 46%, transparent); }
        .project-title-cell { display:flex; align-items:center; gap:10px; min-width:0; }
        .project-dot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }
        .project-name-wrap { min-width:0; }
        .project-name-wrap strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); font-size:13.5px; font-weight:730; letter-spacing:-.015em; }
        .project-name-wrap span { display:block; color:var(--text-muted); font-size:11.5px; font-weight:620; margin-top:3px; }
        .progress-cell { display:flex; align-items:center; gap:9px; color:var(--text); font-size:12.5px; font-weight:720; }
        .progress-track { width:74px; height:2px; border-radius:999px; background:color-mix(in srgb, var(--text) 10%, transparent); overflow:hidden; }
        .progress-fill { height:100%; border-radius:inherit; background:var(--accent); }
        .soft-cell { color:var(--text-secondary); font-size:12.5px; font-weight:610; }
        .signal-count { color:var(--text); font-size:12.5px; font-weight:740; }
        .open-report { justify-self:start; height:28px; border:0; border-radius:999px; background:transparent; color:var(--text-secondary); font:inherit; font-size:11.8px; font-weight:740; padding:0; display:inline-flex; align-items:center; gap:6px; cursor:pointer; white-space:nowrap; opacity:.72; }
        .project-line:hover .open-report { opacity:1; color:var(--text); }
        .reports-operating-area { display:grid; grid-template-columns:minmax(0, 1fr) 270px; gap:64px; align-items:start; }
        .live-report-shell { min-width:0; max-width:890px; }
        .report-context { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:30px; }
        .report-meta-title { display:flex; align-items:center; gap:9px; min-width:0; color:var(--text-muted); font-size:12px; font-weight:690; }
        .report-meta-title span { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
        .report-meta-title strong { color:var(--text); font-size:14px; font-weight:730; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .report-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .report-document { max-width:780px; }
        /* ── Audio Briefing Hero — compact podcast band ──────────── */
        .audio-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          margin: 0 0 22px;
          border-radius: 14px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--surface-2) 30%, transparent));
          border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
          box-shadow: 0 14px 36px -22px rgba(15,23,42,.16);
        }
        .audio-hero-cover {
          width: 56px; height: 56px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 8px 18px -12px rgba(15,23,42,.34);
          position: relative; overflow: hidden;
        }
        .audio-hero-cover::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(120% 60% at 20% 0%, rgba(255,255,255,.16), transparent 60%);
          pointer-events: none;
        }
        .audio-hero-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .audio-hero-kicker {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10.5px; font-weight: 640; letter-spacing: .04em;
          color: var(--text-muted); text-transform: uppercase;
        }
        .audio-hero-kicker svg { color: #D97706; }
        .audio-hero-dot { opacity: .5; }
        .audio-hero-title {
          margin: 0; font-size: 14.5px;
          line-height: 1.3; letter-spacing: -.005em; font-weight: 600;
          color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .audio-hero-sub {
          margin: 0; font-size: 11.5px; color: var(--text-muted);
          line-height: 1.45;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .audio-hero-player {
          flex-shrink: 0;
          min-width: 220px;
        }
        .audio-hero-pills {
          display: flex; flex-wrap: nowrap; gap: 5px;
          overflow-x: auto; padding: 8px 0 0;
          scrollbar-width: none;
        }
        .audio-hero-pills::-webkit-scrollbar { display: none; }
        .audio-hero-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 50%, transparent);
          font: inherit; font-size: 11.5px; font-weight: 580;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap; flex-shrink: 0;
          transition: background .12s, color .12s, border-color .12s;
        }
        .audio-hero-pill:hover { color: var(--text); border-color: var(--border-strong); }
        .audio-hero-pill.on { background: var(--text); color: var(--bg); border-color: var(--text); }
        .audio-hero-pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .audio-hero-pill-label { max-width: 110px; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 880px) {
          .audio-hero { flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px; }
          .audio-hero-player { min-width: 0; }
          .audio-hero-cover { width: 48px; height: 48px; }
        }

        .briefing-priority { margin:0 0 28px; }
        .briefing-priority .reports-section-kicker { margin:0 0 12px; }
        .priority-row { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; }
        .priority-card { display:flex; flex-direction:column; gap:10px; padding:14px 16px; border:1px solid color-mix(in srgb, var(--border) 80%, transparent); border-radius:12px; background:color-mix(in srgb, var(--surface) 70%, transparent); }
        .priority-tag { display:inline-flex; align-items:center; align-self:flex-start; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border:1px solid currentColor; background:transparent; }
        .priority-tag.decision { color:#0369A1; }
        .priority-tag.risk { color:#D97706; }
        .priority-tag.next { color:#15803D; }
        .priority-title { margin:0; color:var(--text); font-size:13.5px; font-weight:600; line-height:1.4; letter-spacing:-.005em; }
        .priority-action { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:var(--text-secondary); text-decoration:none; margin-top:auto; transition:color .12s; }
        .priority-action:hover { color:var(--text); }
        @media(max-width:880px) { .priority-row { grid-template-columns:1fr; } }
        .briefing-hero { margin:0 0 26px; max-width:720px; color:var(--text-secondary); font-size:14px; line-height:1.62; }
        .briefing-hero strong { display:block; margin-bottom:7px; color:var(--text); font-size:22px; line-height:1.18; letter-spacing:-.04em; }
        .briefing-section { padding:17px 0; }
        .briefing-section + .briefing-section { border-top:1px solid color-mix(in srgb, var(--border) 24%, transparent); }
        /* Accent-borders for the most action-driving sections */
        .briefing-section--decision   { padding-left:14px; border-left:2px solid #0369A1; margin-left:-14px; }
        .briefing-section--suggestion { padding-left:14px; border-left:2px solid #D97706; margin-left:-14px; }
        .briefing-section--risk       { padding-left:14px; border-left:2px solid #c0362e; margin-left:-14px; }
        .briefing-toggle { width:100%; display:flex; align-items:center; justify-content:space-between; gap:18px; border:0; background:transparent; color:var(--text); font:inherit; padding:0; cursor:pointer; text-align:left; }
        .briefing-toggle span:first-child { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .briefing-toggle strong { color:var(--text); font-size:14px; font-weight:760; letter-spacing:-.018em; }
        .briefing-toggle small { color:var(--text-muted); font-size:11.2px; font-weight:630; line-height:1.35; }
        .briefing-toggle em { color:var(--text-muted); font-size:11px; font-style:normal; font-weight:720; opacity:.72; }
        .briefing-body { color:var(--text-secondary); font-size:14px; line-height:1.7; max-width:720px; padding-top:12px; }
        .briefing-body p { margin:0 0 12px; }
        .briefing-body ul, .briefing-body ol { padding-left:18px; margin:0 0 12px; }
        .briefing-body li { margin:3px 0; }
        .report-history { display:flex; flex-wrap:wrap; gap:7px; margin-top:38px; padding-top:18px; border-top:1px solid color-mix(in srgb, var(--border) 42%, transparent); }
        .history-chip { height:28px; border-radius:999px; border:1px solid color-mix(in srgb, var(--border) 64%, transparent); background:transparent; color:var(--text-muted); font:inherit; font-size:11.5px; font-weight:700; padding:0 10px; cursor:pointer; }
        .history-chip.on, .history-chip:hover { color:var(--text); background:color-mix(in srgb, var(--surface-2) 54%, transparent); }
        .signals-rail { position:sticky; top:26px; align-self:start; color:var(--text-secondary); }
        .signals-title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
        .signals-title h2 { margin:0; color:var(--text); font-size:13px; font-weight:760; letter-spacing:-.01em; }
        .signals-metrics { display:grid; grid-template-columns:1fr; gap:7px; margin-bottom:18px; }
        .signal-metric { height:34px; border:0; border-radius:10px; background:transparent; color:var(--text-secondary); font:inherit; font-size:12px; font-weight:710; display:flex; align-items:center; justify-content:space-between; padding:0 2px; cursor:pointer; }
        .signal-metric:hover, .signal-metric.on { color:var(--text); background:color-mix(in srgb, var(--surface-2) 44%, transparent); padding:0 10px; }
        .signal-metric strong { color:inherit; font-size:15px; }
        .signal-block { padding:16px 0; border-top:1px solid color-mix(in srgb, var(--border) 26%, transparent); }
        .signal-label { display:flex; align-items:center; gap:7px; color:var(--text-muted); font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin-bottom:12px; }
        .signal-row { display:flex; gap:9px; align-items:flex-start; color:var(--text-secondary); font-size:12.5px; line-height:1.52; padding:3px 0; }
        .suggestion-row { padding:0 0 13px; }
        .suggestion-row + .suggestion-row { padding-top:13px; border-top:1px solid color-mix(in srgb, var(--border) 20%, transparent); }
        .suggestion-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
        .suggestion-title { margin:0; font-size:13px; line-height:1.28; color:var(--text); font-weight:750; letter-spacing:-.012em; }
        .suggestion-desc { margin:6px 0 0; color:var(--text-secondary); font-size:12.2px; line-height:1.55; }
        .suggestion-pill { font-size:10px; font-weight:820; letter-spacing:.04em; padding:2px 0; white-space:nowrap; }
        .suggestion-kind { color:var(--text-muted); font-size:11px; font-weight:690; line-height:1.45; margin:9px 0 10px; }
        .suggestion-action { height:28px; border:1px solid color-mix(in srgb, var(--border) 64%, transparent); border-radius:999px; background:transparent; color:var(--text); font:inherit; font-size:11.5px; font-weight:730; padding:0 10px; cursor:pointer; }
        .suggestion-action:hover { background:color-mix(in srgb, var(--surface-2) 62%, transparent); }
        .side-action { width:100%; justify-content:flex-start; margin-top:6px; padding-left:0; border-color:transparent; }
        .architecture-note { color:var(--text-muted); font-size:12px; line-height:1.58; }
        .report-empty { padding:54px 0; color:var(--text-muted); }
        .report-empty strong { display:block; color:var(--text); font-size:15px; margin-bottom:6px; }
        @media(max-width:1180px) { .reports-operating-area { grid-template-columns:1fr; gap:34px; } .signals-rail { position:static; max-width:760px; } .project-status-stream { overflow-x:auto; padding-bottom:6px; } .project-line-head, .project-line { min-width:980px; } }
        @media(max-width:820px) { .reports-intelligence { padding:24px 20px 0; } .reports-scroll-body { padding-bottom:86px; } .reports-commandline { align-items:stretch; flex-direction:column; margin-bottom:34px; } .report-context { align-items:flex-start; flex-direction:column; } .report-document { font-size:14px; } }
        @media (max-width: 760px) {
          .reports-intelligence { padding-bottom:120px; }
          .reports-controls { flex-wrap:wrap; gap:6px; }
          .reports-select { width:100%; }
          .reports-period { flex:1; min-width:0; text-align:center; }
          .reports-ghost { width:100%; justify-content:center; min-height:40px; }
          .reports-inline-action { min-height:40px; padding:0 14px; }
          .report-actions { width:100%; gap:6px; }
          .report-actions .reports-inline-action { flex:1 1 calc(50% - 3px); justify-content:center; }
          .briefing-section { padding:14px 0; }
          .briefing-toggle strong { font-size:13.5px; }
        }
      `}</style>

      <div className="reports-static-top">
        <AppPageHeader
          variant="standard"
          title="Projektbriefing"
          meta={currentStatusRow ? (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 10px', alignItems: 'center' }}>
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{currentStatusRow.phase}</strong>
              <span style={{ color: 'var(--text-muted)', opacity: .5 }}>·</span>
              <span>{currentStatusRow.progress}% Fortschritt</span>
              <span style={{ color: 'var(--text-muted)', opacity: .5 }}>·</span>
              <span>{currentStatusRow.blockerCount === 1 ? '1 Risiko' : `${currentStatusRow.blockerCount} Risiken`}</span>
              <span style={{ color: 'var(--text-muted)', opacity: .5 }}>·</span>
              <span>{currentStatusRow.decisionCount === 1 ? '1 Entscheidung offen' : `${currentStatusRow.decisionCount} Entscheidungen offen`}</span>
            </span>
          ) : 'Tagro fasst laufende Projektarbeit als ruhiges Client-Briefing zusammen.'}
          action={(
            <button className="app-header-button app-header-button--primary" type="button" onClick={generateReport} disabled={!currentProject || generating}>
              <MagicWand size={15} weight="bold" />
              {generating ? 'Briefing wird aktualisiert…' : 'Briefing aktualisieren'}
            </button>
          )}
        />

        {/* ── Audio Briefing Hero — compact podcast band ──────────── */}
        <section className="audio-hero" aria-label="Tagro Audio Briefing">
          <div className="audio-hero-cover" style={{ background: `linear-gradient(135deg, ${currentProject?.color || '#5B647D'}, color-mix(in srgb, ${currentProject?.color || '#5B647D'} 35%, var(--bg)))` }}>
            <Headphones size={22} weight="duotone" color="rgba(255,255,255,.92)" />
          </div>
          <div className="audio-hero-body">
            <div className="audio-hero-kicker">
              <Sparkle size={11} weight="fill" />
              <span>Audio Briefing · Podcast-Style</span>
            </div>
            <h2 className="audio-hero-title" title={currentProject?.title || undefined}>
              {currentProject
                ? `Update zu ${currentProject.title}`
                : projects.length > 0
                  ? 'Update zu allen Projekten'
                  : 'Audio-Briefing wartet auf dein erstes Projekt'}
            </h2>
            <p className="audio-hero-sub">
              {currentProject
                ? `${currentStatusRow?.phase ?? '—'} · ${currentStatusRow?.progress ?? 0}% · ${currentStatusRow?.decisionCount ?? 0} Entscheidung${currentStatusRow?.decisionCount === 1 ? '' : 'en'}`
                : 'Aktuelle Lage, Risiken, Entscheidungen, nächste Schritte. Unter 2 Min.'}
            </p>
          </div>
          <div className="audio-hero-player">
            <VoiceControls
              text={generateBriefingText({
                type: 'status_report_briefing',
                projectTitle: currentProject?.title,
                report: reportContent,
                projectStatus: currentStatusRow?.phase,
                progress: currentStatusRow?.progress,
                blockerCount: currentStatusRow?.blockerCount,
                decisionCount: currentStatusRow?.decisionCount,
                nextSteps: ['Task-Vorschläge prüfen', 'offene Entscheidungen klären'],
              })}
            />
          </div>
        </section>
        {projects.length > 1 && (
          <div className="audio-hero-pills" role="tablist" aria-label="Projekt für Audio-Briefing">
            <button
              type="button"
              role="tab"
              aria-selected={selectedProjectId === 'all'}
              className={`audio-hero-pill${selectedProjectId === 'all' ? ' on' : ''}`}
              onClick={() => setSelectedProjectId('all')}
            >
              Alle Projekte
            </button>
            {projects.slice(0, 8).map(p => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selectedProjectId === p.id}
                className={`audio-hero-pill${selectedProjectId === p.id ? ' on' : ''}`}
                onClick={() => setSelectedProjectId(p.id)}
              >
                <span className="audio-hero-pill-dot" style={{ background: p.color || '#64748b' }} />
                <span className="audio-hero-pill-label">{p.title}</span>
              </button>
            ))}
          </div>
        )}

        <BriefingDeliveryCard
          projectId={selectedProjectId === 'all' ? null : selectedProjectId}
          projectTitle={selectedProjectId === 'all' ? null : (currentProject?.title ?? null)}
        />

        <section className="reports-commandline" aria-label="Statusbericht Einstellungen">
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
      </div>

      <div className="reports-scroll-body">
      <section className="project-status-stream" aria-label="Projekt Status Liste">
        <p className="reports-section-kicker">Projektlage</p>
        <div className="project-line-head" aria-hidden="true">
          <span>Projekt</span>
          <span>Fortschritt</span>
          <span>Phase</span>
          <span>Letzter Bericht</span>
          <span>Blocker</span>
          <span>Entscheidungen</span>
          <span>Aktion</span>
        </div>
        {projectStatusRows.length === 0 ? (
          <div className="report-empty">
            <strong>Noch keine Projekte</strong>
            <span>Sobald Projekte existieren, werden sie hier als Status-Zentrale angezeigt.</span>
          </div>
        ) : projectStatusRows.map((row) => {
          const color = projectColor(row.project.id, row.project.color)
          return (
            <button className="project-line" key={row.project.id} type="button" onClick={() => openProjectReport(row)}>
              <span className="project-title-cell">
                <span className="project-dot" style={{ background: color }} />
                <span className="project-name-wrap">
                  <strong>{row.project.title}</strong>
                  <span>{row.taskCount} Tasks im Workspace</span>
                </span>
              </span>
              <span className="progress-cell">
                <span className="progress-track"><span className="progress-fill" style={{ width: `${row.progress}%`, background: color }} /></span>
                {row.progress}%
              </span>
              <span className="soft-cell">{row.phase}</span>
              <span className="soft-cell">{dateLabel(row.latestReport?.created_at)}</span>
              <span className="signal-count">{row.blockerCount}</span>
              <span className="signal-count">{row.decisionCount}</span>
              <span className="open-report">Bericht öffnen <ArrowRight size={13} /></span>
            </button>
          )
        })}
      </section>

      <main className="reports-operating-area">
        <section className="live-report-shell" id="aktueller-bericht">
          <div className="report-context">
            <div className="report-meta-title">
              <span style={{ background: currentProject ? projectColor(currentProject.id, currentProject.color) : 'var(--text-muted)' }} />
              <strong>{currentProject?.title ?? 'Aktueller Bericht'}</strong>
              <small>{currentReport ? dateLabel(currentReport.created_at) : 'Noch nicht generiert'}</small>
            </div>
            <div className="report-actions">
              <VoiceBriefingButton
                type="status_report_briefing"
                label="Voice Report"
                projectTitle={currentProject?.title}
                report={reportContent}
                projectStatus={currentStatusRow?.phase}
                progress={currentStatusRow?.progress}
                blockerCount={currentStatusRow?.blockerCount}
                decisionCount={currentStatusRow?.decisionCount}
                nextSteps={['Task-Vorschläge prüfen', 'offene Entscheidungen klären']}
              />
              <button className="reports-inline-action" type="button" onClick={generateReport} disabled={!currentProject || generating}>
                <MagicWand size={14} /> Briefing aktualisieren
              </button>
              <button className="reports-inline-action" type="button" onClick={() => currentReport && exportReport(currentReport)} disabled={!currentReport}>
                <DownloadSimple size={14} /> PDF exportieren
              </button>
              <Link className="reports-inline-action reports-inline-action--ghost" href="/ai?view=chat">
                <ChatCircleText size={14} /> Mit Tagro sprechen
              </Link>
            </div>
          </div>

          <article className="report-document">
            {currentStatusRow && (
              <section className="briefing-priority" aria-label="Was wichtig ist">
                <p className="reports-section-kicker">Was wichtig ist</p>
                <div className="priority-row">
                  <article className="priority-card">
                    <span className="priority-tag decision">Entscheidung benötigt</span>
                    <p className="priority-title">
                      {currentStatusRow.decisionCount > 0
                        ? `Scope nach Statusbericht prüfen (${currentStatusRow.decisionCount} offen)`
                        : 'Keine offenen Entscheidungen'}
                    </p>
                    <Link className="priority-action" href="/tasks?status=waiting">
                      Entscheidung ansehen <ArrowRight size={12} />
                    </Link>
                  </article>
                  <article className="priority-card">
                    <span className="priority-tag risk">Risiko erkannt</span>
                    <p className="priority-title">
                      {currentStatusRow.blockerCount > 0
                        ? `Team-Handoff vor Umsetzung prüfen (${currentStatusRow.blockerCount} ${currentStatusRow.blockerCount === 1 ? 'Risiko' : 'Risiken'})`
                        : 'Keine aktiven Blocker'}
                    </p>
                    <Link className="priority-action" href={`/project/${currentProject?.id ?? ''}`}>
                      Risiko prüfen <ArrowRight size={12} />
                    </Link>
                  </article>
                  <article className="priority-card">
                    <span className="priority-tag next">Nächster Schritt</span>
                    <p className="priority-title">
                      {currentStatusRow.progress < 5
                        ? 'Workspace-Tasks öffnen und Umsetzung vorbereiten'
                        : 'Laufende Tasks in Workspace prüfen'}
                    </p>
                    <Link className="priority-action" href="/tasks">
                      Tasks öffnen <ArrowRight size={12} />
                    </Link>
                  </article>
                </div>
              </section>
            )}

            <p className="briefing-hero">
              <strong>Projektbriefing</strong>
              Ruhiger Überblick statt Daten-Flut. Was wichtig ist steht oben, Details bleiben verfügbar.
            </p>
            {briefingSections.map((section, index) => {
              const open = Boolean(openSections[section.id])
              const accent = /entscheidung/i.test(section.title) ? 'decision'
                : /verbesserung/i.test(section.title) ? 'suggestion'
                : /risiko|blocker/i.test(section.title) ? 'risk'
                : null
              const isSuggestionSection = accent === 'suggestion'
              return (
                <section className={`briefing-section${accent ? ` briefing-section--${accent}` : ''}`} key={section.id}>
                  <button
                    className="briefing-toggle"
                    type="button"
                    onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !open }))}
                    aria-expanded={open}
                  >
                    <span>
                      <strong>{section.title}</strong>
                      <small>{index === 0 ? 'Kurzfassung' : open ? 'Details sichtbar' : 'Details bei Bedarf öffnen'}</small>
                    </span>
                    <em>{open ? 'Schließen' : 'Öffnen'}</em>
                  </button>
                  {open && (
                    isSuggestionSection ? (
                      <SuggestionBullets body={section.body} projectId={currentProject?.id} />
                    ) : (
                      <div className="briefing-body">
                        <ChatMarkdown text={section.body} />
                      </div>
                    )
                  )}
                </section>
              )
            })}
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

        <aside className="signals-rail" aria-label="Tagro Einschätzung">
          <div className="signals-title">
            <h2>Tagro Einschätzung</h2>
            <SlidersHorizontal size={14} color="var(--text-muted)" />
          </div>

          <div className="signals-metrics" aria-label="Signal Übersicht">
            <button className={`signal-metric${activeSignal === 'tasks' ? ' on' : ''}`} type="button" onClick={() => setActiveSignal('tasks')}>
              <span>Task-Vorschläge</span><strong>{taskSuggestions.length}</strong>
            </button>
            <button className={`signal-metric${activeSignal === 'updates' ? ' on' : ''}`} type="button" onClick={() => setActiveSignal('updates')}>
              <span>Dev Updates</span><strong>{currentDevSignals.length}</strong>
            </button>
            <button className={`signal-metric${activeSignal === 'decisions' ? ' on' : ''}`} type="button" onClick={() => setActiveSignal('decisions')}>
              <span>Entscheidungen</span><strong>{currentSections.decisions.length}</strong>
            </button>
            <button className={`signal-metric${activeSignal === 'risks' ? ' on' : ''}`} type="button" onClick={() => setActiveSignal('risks')}>
              <span>Risiken</span><strong>{currentSections.blockers.length}</strong>
            </button>
          </div>

          {activeSignal === 'tasks' && (
          <div className="signal-block">
            <div className="signal-label"><Lightbulb size={14} /> Task-Vorschläge</div>
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
          )}

          {activeSignal === 'updates' && (
          <div className="signal-block">
            <div className="signal-label"><PaperPlaneTilt size={14} /> Dev Updates</div>
            {currentDevSignals.length === 0 ? (
              <div className="signal-row">Noch keine Developer-Updates für diesen Berichtskontext.</div>
            ) : currentDevSignals.map((item) => (
              <div className="signal-row" key={item.id}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', marginTop: 7, flex: '0 0 auto' }} />
                <span>{item.content}</span>
              </div>
            ))}
          </div>
          )}

          {activeSignal === 'decisions' && (
          <div className="signal-block">
            <div className="signal-label"><Lightbulb size={14} /> Entscheidungen</div>
            {currentSections.decisions.map((item) => <div className="signal-row" key={item}>{item}</div>)}
          </div>
          )}

          {activeSignal === 'risks' && (
          <div className="signal-block">
            <div className="signal-label"><WarningCircle size={14} /> Risiken</div>
            {currentSections.blockers.map((item) => <div className="signal-row" key={item}>{item}</div>)}
          </div>
          )}

          <button className={`signal-metric${activeSignal === 'actions' ? ' on' : ''}`} type="button" onClick={() => setActiveSignal('actions')} style={{ marginBottom: 2 }}>
            <span>Aktionen</span><strong>5</strong>
          </button>
          {activeSignal === 'actions' && (
          <div className="signal-block">
            <div className="signal-label"><MagicWand size={14} /> Aktionen</div>
            <button className="reports-ghost side-action" type="button" onClick={generateReport} disabled={!currentProject || generating}>Statusbericht generieren</button>
            <button className="reports-ghost side-action" type="button" onClick={extractTaskSuggestions} disabled={!currentReport || extracting}>Task-Vorschläge prüfen</button>
            <button className="reports-ghost side-action" type="button" onClick={() => currentReport && navigator.clipboard.writeText(currentReport.content)} disabled={!currentReport}><PaperPlaneTilt size={14} /> Mit Team teilen</button>
            <button className="reports-ghost side-action" type="button"><Archive size={14} /> Archivieren</button>
            <button className="reports-ghost side-action" type="button" onClick={() => currentReport && exportReport(currentReport)} disabled={!currentReport}><DownloadSimple size={14} /> Export vorbereiten</button>
          </div>
          )}

          <div className="signal-block">
            <div className="signal-label"><SlidersHorizontal size={14} /> Festag Architektur</div>
            <p className="architecture-note">Projektbriefings erkennen. Workspace Tasks strukturieren. Team Tasks setzen operativ um.</p>
            <Link href="/tasks" style={{ color: 'var(--text)', fontSize: 12, fontWeight: 740, textDecoration: 'none' }}>Workspace Tasks öffnen →</Link>
          </div>
        </aside>
      </main>
      </div>
    </div>
  )
}

function BriefingDeliveryCard({ projectId, projectTitle }: { projectId: string | null; projectTitle: string | null }) {
  const supabase = useMemo(() => createClient(), [])
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'biweekly' | 'off'>('off')
  const [format, setFormat] = useState<'email' | 'audio' | 'both'>('email')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)
  const [nextRun, setNextRun] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase
        .from('briefing_subscriptions')
        .select('cadence,format,last_sent_at,next_run_at')
        .eq('user_id', session.user.id)
        .eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000') // sentinel
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setCadence((data as any).cadence)
        setFormat((data as any).format)
        setLastSent((data as any).last_sent_at)
        setNextRun((data as any).next_run_at)
      } else {
        // Fallback: workspace-level subscription (no project) if no project-specific exists
        const { data: ws } = await supabase
          .from('briefing_subscriptions')
          .select('cadence,format,last_sent_at,next_run_at')
          .eq('user_id', session.user.id)
          .is('project_id', null)
          .maybeSingle()
        if (!cancelled && ws) {
          setCadence((ws as any).cadence)
          setFormat((ws as any).format)
          setLastSent((ws as any).last_sent_at)
          setNextRun((ws as any).next_run_at)
        }
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase, projectId])

  async function save(nextCadence: typeof cadence, nextFormat: typeof format) {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/briefings/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, cadence: nextCadence, format: nextFormat }),
      })
      const json = await res.json()
      if (json?.subscription) {
        setNextRun(json.subscription.next_run_at)
        setSaved(true)
        setTimeout(() => setSaved(false), 1800)
      }
    } catch {}
    setSaving(false)
  }

  const nextLabel = nextRun
    ? new Date(nextRun).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'
  const lastLabel = lastSent
    ? new Date(lastSent).toLocaleString('de-DE', { day: '2-digit', month: 'short' })
    : 'noch nie zugestellt'

  return (
    <section className="delivery-card" aria-label="Briefing-Zustellung">
      <style>{`
        .delivery-card {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
          gap: 22px;
          padding: 18px 22px;
          margin: 0 0 28px;
          border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
          border-radius: 14px;
          background: color-mix(in srgb, var(--surface) 50%, transparent);
        }
        .delivery-card-head { display: flex; flex-direction: column; gap: 6px; }
        .delivery-card-kicker {
          font-size: 11px; font-weight: 660; letter-spacing: .04em;
          color: var(--text-muted); text-transform: uppercase;
        }
        .delivery-card-title {
          margin: 0; font-size: 17px; font-weight: 600; color: var(--text);
          letter-spacing: -.005em; line-height: 1.25;
        }
        .delivery-card-sub {
          margin: 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.55;
        }
        .delivery-card-meta {
          margin-top: 8px;
          display: flex; gap: 14px; flex-wrap: wrap;
          font-size: 11.5px; color: var(--text-muted);
        }
        .delivery-card-meta strong { color: var(--text-secondary); font-weight: 600; }
        .delivery-controls { display: flex; flex-direction: column; gap: 10px; }
        .delivery-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .delivery-row-label {
          font-size: 11.5px; font-weight: 600; letter-spacing: .01em;
          color: var(--text-muted); min-width: 76px;
        }
        .delivery-chip {
          padding: 5px 11px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          font: inherit; font-size: 12px; font-weight: 580;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background .12s, color .12s, border-color .12s;
        }
        .delivery-chip:hover { color: var(--text); border-color: var(--border-strong); }
        .delivery-chip.on {
          background: var(--text); color: var(--bg); border-color: var(--text);
        }
        .delivery-saved {
          font-size: 11.5px; font-weight: 600; color: #15803D;
          opacity: 0; transition: opacity .15s;
        }
        .delivery-saved.on { opacity: 1; }
        @media (max-width: 760px) {
          .delivery-card { grid-template-columns: 1fr; padding: 16px; }
        }
      `}</style>

      <div className="delivery-card-head">
        <span className="delivery-card-kicker">Briefing-Zustellung</span>
        <h3 className="delivery-card-title">
          {cadence === 'off'
            ? 'Lass Tagro dir das Briefing automatisch zustellen'
            : `Tagro liefert ${projectTitle ? `"${projectTitle}"` : 'deine Workspace-Briefings'} ${cadence === 'daily' ? 'täglich' : cadence === 'weekly' ? 'wöchentlich' : 'alle zwei Wochen'}`}
        </h3>
        <p className="delivery-card-sub">
          Aus dem Bericht wird ein Voice Report und/oder eine ruhige E-Mail. Wenn nichts Neues anliegt, schickt Tagro auch nichts.
        </p>
        <div className="delivery-card-meta">
          <span><strong>Nächste Zustellung:</strong> {cadence === 'off' ? 'inaktiv' : nextLabel}</span>
          <span><strong>Letzte Zustellung:</strong> {lastLabel}</span>
        </div>
      </div>

      <div className="delivery-controls">
        <div className="delivery-row">
          <span className="delivery-row-label">Rhythmus</span>
          {([
            { id: 'off',      label: 'Aus' },
            { id: 'daily',    label: 'Täglich' },
            { id: 'weekly',   label: 'Wöchentlich' },
            { id: 'biweekly', label: '2-wöchentlich' },
          ] as const).map(o => (
            <button
              key={o.id}
              type="button"
              className={`delivery-chip${cadence === o.id ? ' on' : ''}`}
              onClick={() => { setCadence(o.id); save(o.id, format) }}
              disabled={saving || loading}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="delivery-row">
          <span className="delivery-row-label">Format</span>
          {([
            { id: 'email', label: 'E-Mail' },
            { id: 'audio', label: 'Voice' },
            { id: 'both',  label: 'Beides' },
          ] as const).map(o => (
            <button
              key={o.id}
              type="button"
              className={`delivery-chip${format === o.id ? ' on' : ''}`}
              onClick={() => { setFormat(o.id); save(cadence, o.id) }}
              disabled={saving || loading || cadence === 'off'}
            >
              {o.label}
            </button>
          ))}
          <span className={`delivery-saved${saved ? ' on' : ''}`}>Gespeichert</span>
        </div>
        <div className="delivery-row" style={{ paddingTop: 6, borderTop: '1px solid color-mix(in srgb, var(--border) 35%, transparent)' }}>
          <span className="delivery-row-label">Test</span>
          <button
            type="button"
            className="delivery-chip"
            disabled={sending}
            onClick={async () => {
              setSending(true); setSendResult(null)
              try {
                const res = await fetch('/api/briefings/send-now', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId }),
                })
                const json = await res.json()
                if (json?.ok) setSendResult(`Gesendet an ${(json.sent_to as string[]).join(', ')}${json.audio_attached ? ' · mit Audio' : ''}`)
                else setSendResult(json?.error || 'fehlgeschlagen')
              } catch { setSendResult('fehlgeschlagen') } finally { setSending(false) }
            }}
          >
            {sending ? 'Sende…' : 'Jetzt zustellen'}
          </button>
          {sendResult && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sendResult}</span>}
        </div>
      </div>
    </section>
  )
}

function SuggestionBullets({ body, projectId }: { body: string; projectId: string | undefined }) {
  const supabase = useMemo(() => createClient(), [])
  // Parse bullets ("- foo", "* foo", "1. foo"); skip empty or pure prose lines.
  const bullets = useMemo(() => {
    return body
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^([-*]|[0-9]+\.)\s+/.test(line))
      .map(line => line.replace(/^([-*]|[0-9]+\.)\s+/, '').trim())
      .filter(line => line.length > 0)
  }, [body])
  const [promoted, setPromoted] = useState<Record<number, 'idle' | 'saving' | 'done' | 'error'>>({})

  async function promoteToTask(index: number, title: string) {
    if (!projectId || promoted[index] === 'saving' || promoted[index] === 'done') return
    setPromoted(prev => ({ ...prev, [index]: 'saving' }))
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: title.slice(0, 240),
        status: 'suggested',
        priority: 'medium',
        description: `Aus Tagro-Briefing übernommen. Quelle: Verbesserungsvorschläge von Tagro.\n\nVorschlag: ${title}`,
      })
      if (error) throw error
      setPromoted(prev => ({ ...prev, [index]: 'done' }))
    } catch {
      setPromoted(prev => ({ ...prev, [index]: 'error' }))
    }
  }

  if (bullets.length === 0) {
    return <div className="briefing-body"><ChatMarkdown text={body} /></div>
  }

  return (
    <div className="suggestion-bullets">
      <style>{`
        .suggestion-bullets { display: flex; flex-direction: column; gap: 8px; padding: 4px 0 8px; }
        .suggestion-bullet {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 12px;
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--surface) 50%, transparent);
        }
        .suggestion-bullet-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #D97706; flex-shrink: 0; margin-top: 7px;
        }
        .suggestion-bullet-text {
          flex: 1; font-size: 13.5px; line-height: 1.5;
          color: var(--text); min-width: 0;
        }
        .suggestion-bullet-action {
          height: 28px;
          padding: 0 11px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-family: inherit; font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.01em;
          color: var(--text);
          cursor: pointer;
          white-space: nowrap;
          transition: background .12s, border-color .12s, color .12s, opacity .12s;
          flex-shrink: 0;
        }
        .suggestion-bullet-action:hover:not(:disabled) { background: var(--surface-2); border-color: var(--border-strong); }
        .suggestion-bullet-action:disabled { opacity: .55; cursor: default; }
        .suggestion-bullet-action.done { background: #15803D; color: #fff; border-color: #15803D; }
      `}</style>
      {bullets.map((bullet, i) => {
        const state = promoted[i] ?? 'idle'
        return (
          <div key={i} className="suggestion-bullet">
            <span className="suggestion-bullet-dot" />
            <span className="suggestion-bullet-text">{bullet}</span>
            <button
              type="button"
              className={`suggestion-bullet-action${state === 'done' ? ' done' : ''}`}
              disabled={!projectId || state === 'saving' || state === 'done'}
              onClick={() => promoteToTask(i, bullet)}
            >
              {state === 'saving' ? 'Lege an…'
                : state === 'done' ? '✓ Als Task angelegt'
                : state === 'error' ? 'Nochmal versuchen'
                : 'Als Task erstellen'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function ReportsPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 52, color: 'var(--text-muted)' }}>Projektbriefings werden geladen…</div>}>
      <ReportsPage />
    </Suspense>
  )
}
