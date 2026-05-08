'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { createClient } from '@/lib/supabase/client'
import { projectColor } from '@/components/Sidebar'
import {
  Archive,
  CaretDown,
  ChatCircleText,
  CheckCircle,
  DotsThree,
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
type TaskSuggestion = {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  kind: SuggestionKind
  reason: string
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'custom', label: 'Benutzerdefiniert' },
]

const FALLBACK_REPORT = `## Zusammenfassung
Tagro hat den aktuellen Projektstand zusammengefasst und in eine clientfreundliche Lageübersicht übersetzt.

## Was wurde erledigt
- Erste Projektstruktur wurde angelegt.
- Aktuelle Tasks wurden für die Auswertung berücksichtigt.

## Was ist in Arbeit
- Die nächsten Umsetzungsschritte werden vorbereitet.
- Offene Punkte werden nach Projektkontext priorisiert.

## Blocker / Risiken
- Keine kritischen Blocker erkannt.

## Nächste Schritte
1. Nächsten Umsetzungsschritt bestätigen.
2. Offene Rückfragen prüfen.
3. Task-Vorschläge bei Bedarf zur Prüfung einreichen.

## Entscheidungen vom Client benötigt
- Aktuell keine zwingende Entscheidung erforderlich.

## Mögliche neue Tasks
- Inhalte finalisieren
- Technische Prüfung vorbereiten

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

function dateLabel(value?: string | null) {
  if (!value) return 'Neu'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function deriveReportSections(content: string) {
  const blocker = /blocker|risiko|abhängig|wartet|fehlt|kritisch/i.test(content)
  const decision = /entscheidung|freigabe|bestätig|client|kunde|auswahl/i.test(content)
  return {
    blockers: blocker
      ? ['Tagro hat mögliche Abhängigkeiten oder Risiken im Bericht erkannt.']
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
      description: `Tagro schlägt vor, den aktuellen Scope von ${projectName} gegen die nächsten Schritte zu prüfen.`,
      priority: 'medium',
      kind: 'workspace',
      reason: 'Statusberichte erzeugen erst Vorschläge. Festag/Lead prüft, ob daraus ein echter Workspace-Task wird.',
    },
    {
      id: 'handoff-prepare',
      title: 'Team-Handoff vorbereiten',
      description: 'Falls ein Team beteiligt ist, kann Tagro daraus technische Teilaufgaben ableiten.',
      priority: 'high',
      kind: 'team',
      reason: 'Workspace-Task kann später in operative Team-Tasks zerlegt werden.',
    },
  ]
}

export default function ReportsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([])
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const [{ data: projectRows }, { data: reportRows }] = await Promise.all([
        (supabase as any).from('projects').select('id,title,status,description,color').order('created_at', { ascending: false }),
        (supabase as any).from('ai_updates').select('*').eq('type', 'status_report').order('created_at', { ascending: false }).limit(80),
      ])

      const list = (projectRows as Project[]) ?? []
      setProjects(list)
      setReports((reportRows as Report[]) ?? [])
      if (list.length === 1) setSelectedProjectId(list[0].id)
      setLoading(false)
    })
  }, [])

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') return null
    return projects.find((project) => project.id === selectedProjectId) ?? null
  }, [projects, selectedProjectId])

  const visibleReports = useMemo(() => {
    if (selectedProjectId === 'all') return reports
    return reports.filter((report) => report.project_id === selectedProjectId)
  }, [reports, selectedProjectId])

  useEffect(() => {
    if (!visibleReports.length) {
      setSelectedReportId(null)
      return
    }
    if (!selectedReportId || !visibleReports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(visibleReports[0].id)
    }
  }, [visibleReports, selectedReportId])

  const currentReport = visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0] ?? null
  const currentProject = selectedProject ?? projects.find((project) => project.id === currentReport?.project_id) ?? projects[0] ?? null
  const currentSections = deriveReportSections(currentReport?.content ?? FALLBACK_REPORT)

  useEffect(() => {
    if (currentProject) setTaskSuggestions(fallbackSuggestions(currentProject.title))
  }, [currentProject?.id])

  async function generateReport() {
    const project = currentProject
    if (!project) return
    setGenerating(true)
    try {
      const { data: taskRows } = await (supabase as any).from('tasks').select('*').eq('project_id', project.id)
      const tasks = (taskRows as any[]) ?? []
      const done = tasks.filter((task) => ['done', 'completed', 'delivered'].includes(String(task.status).toLowerCase())).length
      const active = tasks.filter((task) => ['doing', 'active', 'in_progress'].includes(String(task.status).toLowerCase())).length
      const review = tasks.filter((task) => ['review', 'ready_for_review', 'suggested'].includes(String(task.status).toLowerCase())).length
      const blocked = tasks.filter((task) => ['blocked', 'waiting', 'needs_decision'].includes(String(task.status).toLowerCase())).length
      const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

      const prompt = `Projekt: ${project.title}\nZeitraum: ${PERIODS.find((item) => item.id === period)?.label}\nBeschreibung: ${project.description ?? 'Keine Beschreibung'}\nPhase: ${project.status}\nFortschritt: ${progress}%\nTasks: ${tasks.length} gesamt, ${done} erledigt, ${active} in Arbeit, ${review} in Prüfung, ${blocked} blockiert/wartend.\n\nTask-Auszug:\n${tasks.slice(0, 18).map((task) => `- [${task.status ?? 'todo'}] ${task.title}`).join('\n')}\n\nErstelle einen Festag-Statusbericht als Übersetzungsschicht zwischen Dev-Arbeit und Client-Verständnis.`

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
      const tasks = (data.tasks as any[] | undefined) ?? []
      if (tasks.length) {
        setTaskSuggestions(tasks.map((task, index) => ({
          id: `${report.id}-${index}`,
          title: task.title ?? 'Neuer Task-Vorschlag',
          description: task.description ?? 'Tagro hat diesen möglichen Task aus dem Statusbericht erkannt.',
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
        .reports-hero h1 { margin:0; font-size:24px; line-height:1.06; letter-spacing:-.03em; font-weight:720; }
        .reports-hero p { margin:7px 0 0; color:var(--text-secondary); font-size:13px; line-height:1.45; }
        .reports-controlbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border:1px solid var(--border); border-radius:16px; background:var(--surface); margin-bottom:14px; }
        .reports-controls { display:flex; align-items:center; gap:8px; min-width:0; flex-wrap:wrap; }
        .reports-select, .reports-period, .reports-primary, .reports-ghost { height:32px; border-radius:10px; border:1px solid var(--border); background:var(--card); color:var(--text); font:inherit; font-size:12.5px; font-weight:650; padding:0 10px; }
        .reports-period { color:var(--text-secondary); cursor:pointer; }
        .reports-period.on { background:var(--text); color:var(--bg); border-color:var(--text); }
        .reports-primary { background:var(--btn-prim); color:var(--btn-prim-text); border-color:transparent; cursor:pointer; display:flex; align-items:center; gap:7px; }
        .reports-primary:disabled { opacity:.65; cursor:default; }
        .reports-ghost { color:var(--text-secondary); background:transparent; cursor:pointer; display:flex; align-items:center; gap:7px; }
        .reports-grid { display:grid; grid-template-columns:240px minmax(0, 1fr) 300px; gap:14px; align-items:start; }
        .reports-panel { border:1px solid var(--border); border-radius:18px; background:var(--surface); overflow:hidden; }
        .reports-panel-head { min-height:42px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 70%, transparent); }
        .reports-panel-head h2 { margin:0; font-size:12.5px; font-weight:720; letter-spacing:.01em; }
        .report-list { padding:6px; display:flex; flex-direction:column; gap:4px; }
        .report-list-row { border:0; width:100%; text-align:left; border-radius:12px; background:transparent; color:var(--text-secondary); padding:10px; cursor:pointer; font:inherit; display:flex; gap:9px; }
        .report-list-row:hover, .report-list-row.on { background:var(--surface-2); color:var(--text); }
        .report-list-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .report-list-row strong { display:block; font-size:12.5px; line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .report-list-row span { display:block; font-size:10.5px; color:var(--text-muted); margin-top:3px; }
        .report-main { min-height:620px; }
        .report-body { padding:24px 28px 34px; font-size:14px; line-height:1.75; color:var(--text-secondary); }
        .report-body h1, .report-body h2, .report-body h3 { color:var(--text); letter-spacing:-.02em; }
        .report-body h2 { font-size:17px; margin:24px 0 8px; }
        .report-body p { margin:0 0 12px; }
        .report-body ul, .report-body ol { padding-left:20px; }
        .report-meta { display:flex; align-items:center; gap:8px; min-width:0; }
        .report-actions { display:flex; align-items:center; gap:6px; position:relative; }
        .report-action-menu { position:absolute; top:34px; right:0; z-index:30; width:210px; padding:6px; border:1px solid var(--border); border-radius:13px; background:var(--surface); box-shadow:0 18px 44px rgba(0,0,0,.16); }
        .report-action-menu button { width:100%; height:31px; border:0; border-radius:9px; background:transparent; color:var(--text-secondary); font:inherit; font-size:12px; font-weight:650; display:flex; align-items:center; gap:8px; padding:0 9px; cursor:pointer; }
        .report-action-menu button:hover { background:var(--surface-2); color:var(--text); }
        .insight-list { padding:10px; display:flex; flex-direction:column; gap:10px; }
        .insight-block { border:1px solid var(--border); border-radius:14px; background:var(--card); padding:12px; }
        .insight-label { display:flex; align-items:center; gap:7px; color:var(--text-muted); font-size:11px; font-weight:760; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; }
        .insight-row { display:flex; gap:9px; align-items:flex-start; color:var(--text-secondary); font-size:12.5px; line-height:1.45; padding:5px 0; }
        .suggestion-row { border:1px solid var(--border); border-radius:13px; padding:11px; background:var(--surface); display:flex; flex-direction:column; gap:8px; }
        .suggestion-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
        .suggestion-title { margin:0; font-size:12.8px; line-height:1.3; color:var(--text); font-weight:720; }
        .suggestion-desc { margin:4px 0 0; color:var(--text-secondary); font-size:11.8px; line-height:1.45; }
        .suggestion-pill { font-size:9.5px; font-weight:800; letter-spacing:.05em; padding:3px 6px; border-radius:999px; background:var(--surface-2); white-space:nowrap; }
        .suggestion-kind { color:var(--text-muted); font-size:11px; font-weight:680; }
        .suggestion-action { height:28px; border-radius:8px; border:1px solid var(--border); background:var(--card); color:var(--text); font:inherit; font-size:11.5px; font-weight:700; cursor:pointer; }
        .suggestion-action:hover { background:var(--surface-2); }
        .report-empty { padding:72px 22px; text-align:center; color:var(--text-muted); }
        .report-empty strong { display:block; color:var(--text); font-size:15px; margin-bottom:5px; }
        @media(max-width:1180px) { .reports-grid { grid-template-columns:210px minmax(0, 1fr); } .reports-side { grid-column:1 / -1; } }
        @media(max-width:820px) { .reports-hero, .reports-controlbar { align-items:stretch; flex-direction:column; } .reports-grid { grid-template-columns:1fr; } .reports-panel { border-radius:14px; } .report-body { padding:20px; } }
      `}</style>

      <header className="reports-hero">
        <div>
          <h1>Statusberichte</h1>
          <p>Verstehe jederzeit, was in deinen Projekten passiert.</p>
        </div>
        <button className="reports-primary" type="button" onClick={generateReport} disabled={!currentProject || generating}>
          <MagicWand size={15} weight="bold" />
          {generating ? 'Tagro generiert…' : 'Statusbericht generieren'}
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
          {extracting ? 'Tagro erkennt…' : 'Task-Vorschläge erkennen'}
        </button>
      </section>

      <main className="reports-grid">
        <aside className="reports-panel">
          <div className="reports-panel-head">
            <h2>Bisherige Berichte</h2>
            <FunnelSimple size={14} color="var(--text-muted)" />
          </div>
          <div className="report-list">
            {visibleReports.length === 0 ? (
              <div className="report-empty" style={{ padding: 28 }}>
                <strong>Noch keine Berichte</strong>
                <span>Generiere den ersten Tagro-Status.</span>
              </div>
            ) : visibleReports.map((report, index) => {
              const project = projects.find((item) => item.id === report.project_id)
              const color = projectColor(report.project_id, project?.color)
              return (
                <button
                  key={report.id}
                  className={`report-list-row${report.id === currentReport?.id ? ' on' : ''}`}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                >
                  <span className="report-list-dot" style={{ background: color }} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{project?.title ?? 'Projekt'}</strong>
                    <span>{dateLabel(report.created_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="reports-panel report-main">
          <div className="reports-panel-head">
            <div className="report-meta">
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: currentProject ? projectColor(currentProject.id, currentProject.color) : 'var(--text-muted)' }} />
              <h2>{currentProject?.title ?? 'Aktueller Bericht'}</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{currentReport ? dateLabel(currentReport.created_at) : 'Noch nicht generiert'}</span>
            </div>
            <div className="report-actions">
              <button className="reports-ghost" type="button" onClick={generateReport} disabled={!currentProject || generating} title="Neu generieren">
                <MagicWand size={14} /> Neu generieren
              </button>
              <button className="reports-ghost" type="button" onClick={() => currentReport && exportReport(currentReport)} disabled={!currentReport} title="PDF Export vorbereiten">
                <DownloadSimple size={14} /> PDF
              </button>
              <button className="reports-ghost" type="button" onClick={() => currentReport && navigator.clipboard.writeText(currentReport.content)} disabled={!currentReport}>
                <PaperPlaneTilt size={14} /> Teilen
              </button>
              <button className="reports-ghost" type="button" aria-label="Weitere Aktionen" onClick={() => setActionMenuId(actionMenuId ? null : (currentReport?.id ?? 'new'))}>
                <DotsThree size={16} weight="bold" />
              </button>
              {actionMenuId && (
                <div className="report-action-menu">
                  <button type="button" onClick={extractTaskSuggestions}><Lightbulb size={14} />Task-Vorschläge anzeigen</button>
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-copilot'))}><ChatCircleText size={14} />Entscheidung markieren</button>
                  <button type="button"><Archive size={14} />Archivieren</button>
                </div>
              )}
            </div>
          </div>
          <article className="report-body">
            {currentReport ? <ChatMarkdown text={currentReport.content} /> : <ChatMarkdown text={FALLBACK_REPORT} />}
          </article>
        </section>

        <aside className="reports-panel reports-side">
          <div className="reports-panel-head">
            <h2>Tagro Erkenntnisse</h2>
            <SlidersHorizontal size={14} color="var(--text-muted)" />
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
                    <div className="suggestion-kind">{task.kind === 'team' ? 'Team-Execution möglich' : 'Workspace-Task Vorschlag'}</div>
                    <button className="suggestion-action" type="button" onClick={() => suggestTask(task)} disabled={savingSuggestionId === task.id}>
                      {savingSuggestionId === task.id ? 'Wird vorgeschlagen…' : 'Als Task vorschlagen'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="insight-block">
              <div className="insight-label"><WarningCircle size={14} /> Blocker / Risiken</div>
              {currentSections.blockers.map((item) => <div className="insight-row" key={item}><CaretDown size={12} style={{ marginTop: 2 }} />{item}</div>)}
            </div>

            <div className="insight-block">
              <div className="insight-label"><CheckCircle size={14} /> Offene Entscheidungen</div>
              {currentSections.decisions.map((item) => <div className="insight-row" key={item}><CaretDown size={12} style={{ marginTop: 2 }} />{item}</div>)}
            </div>

            <div className="insight-block">
              <div className="insight-label"><MagicWand size={14} /> Festag Logik</div>
              <div className="insight-row">Statusberichte erkennen. Workspace Tasks strukturieren. Team Tasks setzen operativ um.</div>
              <Link href="/tasks" style={{ color: 'var(--text)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Workspace Tasks öffnen →</Link>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
