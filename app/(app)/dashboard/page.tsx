'use client'

/**
 * Client Dashboard — Festag „Statusabfrage".
 *
 * Designziel (verbindlich): ein ruhiger Notizblock, kein Cockpit.
 *   • Links steht der Statusblock — ein Notion-artiges Notizfeld. Es ist
 *     leer, bis der Client rechts auf „Status abrufen" tippt; dann
 *     schreibt Tagro den aktuellen Stand Wort für Wort hinein.
 *   • Rechts sitzt eine Linear-artige Box: Puls, der eine Button
 *     „Status abrufen", „Bericht anhören" — plus Entscheidungen & Risiken.
 *   • Kein „Heute im Fokus", keine KPI-Leiste, kein „Aktives Projekt".
 *   • Aeonik Medium (500) durchgehend, 1.2% letter-spacing, keine
 *     Trennlinien zwischen Sektionen, keine schwarzen Buttons.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ObserverWelcomeModal from '@/components/ObserverWelcomeModal'
import WelcomeTour from '@/components/WelcomeTour'
import TagroLogo from '@/components/TagroLogo'
import { speechVoiceId, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { ArrowClockwise, ArrowRight, CaretDown, Check, FileText, Pause, Play, Plus, SlidersHorizontal, Stop } from '@phosphor-icons/react'

// 20 thin bars that form Tagro's speech waveform.
const WAVE_BARS = Array.from({ length: 20 }, (_, i) => i)

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Day-stable greeting — same wording within a calendar day. */
function pickGreeting(hour: number, first: string): string {
  const partOfDay = hour < 12 ? 'Morgen' : hour < 18 ? 'Tag' : 'Abend'
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Chef'
  const variants = first
    ? [`Guten ${partOfDay}, ${name}.`, `Hallo ${name}.`, `Schön, dass du da bist, ${name}.`, `${partOfDay}, ${name}.`]
    : [`Guten ${partOfDay}, Chef.`, `Hallo Chef.`, `Schön, dass du da bist.`, `${partOfDay}, Chef.`]
  const today = new Date()
  const seed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 50 + today.getDate()
  return variants[seed % variants.length]
}

type PulseTone = 'green' | 'amber' | 'red'
type Pulse = { tone: PulseTone; label: string }

function buildPulse(args: { blockers: number; decisions: number }): Pulse {
  const { blockers, decisions } = args
  if (blockers > 0) return { tone: 'red', label: blockers === 1 ? 'Ein Risiko erkannt' : `${blockers} Risiken erkannt` }
  if (decisions > 0) return { tone: 'amber', label: decisions === 1 ? 'Eine Entscheidung offen' : `${decisions} Entscheidungen offen` }
  return { tone: 'green', label: 'Heute ist nichts dringend' }
}

type Project = { id: string; title: string; status: string; created_at: string; color: string | null }
type Task    = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }

type NoteReport = {
  summary: string
  currentWork: string[]
  nextSteps: string[]
  blockers: string[]
  createdAt?: string
}

type BriefingLogEntry = {
  id: string
  kind: 'report' | 'transcript'
  title: string
  scope: string
  createdAt: string
  body: string
}

function normalizeReport(raw: any): NoteReport {
  const arr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [])
  return {
    summary: String(raw?.summary ?? raw?.content ?? '').trim(),
    currentWork: arr(raw?.current_work_json),
    nextSteps: arr(raw?.next_steps_json),
    blockers: arr(raw?.blockers_json),
    createdAt: raw?.created_at,
  }
}

function formatVoiceLabel(voice: SpeechSynthesisVoice) {
  const language = voice.lang.toLowerCase().startsWith('de') ? 'Deutsch' : voice.lang
  return `${voice.name.replace(/\s*\(.*?\)\s*/g, '')} · ${language}`
}

const PHASE: Record<string, string> = {
  intake: 'Intake', planning: 'Planung', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])

  const [projects, setProjects] = useState<Project[]>([])
  const [main, setMain] = useState<Project | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(true)

  // Notepad state
  const [noteReport, setNoteReport] = useState<NoteReport | null>(null)
  const [noteRevealed, setNoteRevealed] = useState('')
  const [noteWriting, setNoteWriting] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [briefingSettingsOpen, setBriefingSettingsOpen] = useState(false)
  const [taskState, setTaskState] = useState<Record<string, 'idle' | 'busy' | 'done'>>({})
  const [allTasksBusy, setAllTasksBusy] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const writeToken = useRef(0)

  // ── Load projects + tasks ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (!data.session) { window.location.href = '/login'; return }

        const uid = data.session.user.id
        const { data: p } = await supabase
          .from('profiles').select('first_name,full_name').eq('id', uid).maybeSingle()
        if (cancelled) return
        if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

        const { data: projs } = await supabase
          .from('projects').select('id,title,status,created_at,color')
          .order('created_at', { ascending: false })
        if (cancelled) return

        if (projs?.length) {
          setProjects(projs as Project[])
          const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
          const m = [...(projs as any[])].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0]
          setMain(m)
          const ids = (projs as any[]).map((pr) => pr.id).filter(Boolean)
          const { data: at } = ids.length
            ? await supabase.from('tasks').select('id,title,status,priority,project_id,updated_at').in('project_id', ids)
            : { data: [] }
          if (cancelled) return
          setAllTasks((at as Task[]) ?? [])
        }
      } catch (error) {
        console.error('Dashboard failed to load', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  // ── Load the latest status note (no animation on first paint) ───
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/client/status-now', { method: 'GET' })
        const d = await res.json().catch(() => ({}))
        if (cancelled || !d?.report) return
        const r = normalizeReport(d.report)
        if (!r.summary) return
        setNoteReport(r)
        setNoteRevealed(r.summary)
        addBriefingLogEntry({
          id: `report-latest-${r.createdAt ?? 'initial'}`,
          kind: 'report',
          title: 'Statusbericht – Heute',
          scope: 'Gesamtbericht für alle Projekte',
          body: r.summary,
          createdAt: r.createdAt,
        })
      } catch { /* notepad simply stays empty */ }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────
  const greeting = useMemo(() => pickGreeting(new Date().getHours(), firstName), [firstName])
  const projectTitle = (id: string) => projects.find((p) => p.id === id)?.title ?? null

  const decisionTasks = allTasks.filter((t) => t.status === 'waiting')
  const riskTasks = allTasks.filter((t) => t.status === 'blocked')
  const phaseLabel = main ? (PHASE[main.status] ?? 'Intake') : null

  const activeProjectCount = projects.filter((p) => {
    const s = (p.status || '').toLowerCase()
    return s === 'active' || s === 'testing' || s === 'planning'
  }).length
  const openTaskCount = allTasks.filter((t) => t.status !== 'done').length
  const doneTaskCount = allTasks.filter((t) => t.status === 'done').length
  const overview = [
    { label: 'Projekte', value: projects.length },
    { label: 'Aktiv', value: activeProjectCount },
    { label: 'Offene Aufgaben', value: openTaskCount },
    { label: 'Erledigt', value: doneTaskCount },
  ]

  const pulse = useMemo(
    () => buildPulse({ blockers: riskTasks.length, decisions: decisionTasks.length }),
    [riskTasks.length, decisionTasks.length],
  )

  // ── Scope: overall report vs single-project report ──────────────
  // Drives the briefing card header label, audio text and duration
  // estimate. Defaults to 'overall' — explicit clarity per spec, the
  // user must never wonder if they're hearing one project or all.
  const [scope, setScope] = useState<'overall' | string>('overall')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [briefingLog, setBriefingLog] = useState<BriefingLogEntry[]>([])
  const [activeLogId, setActiveLogId] = useState<string | null>(null)

  // Reset to overall if the picked project disappears.
  useEffect(() => {
    if (scope === 'overall') return
    if (!projects.find(p => p.id === scope)) setScope('overall')
  }, [projects, scope])

  const activeProjects = useMemo(() => projects.filter(p => {
    const s = (p.status || '').toLowerCase()
    return s !== 'done' && s !== 'archived'
  }), [projects])

  const selectedProject = scope === 'overall' ? null : projects.find(p => p.id === scope) ?? null
  const isOverall = scope === 'overall'
  const scopeLabel = isOverall ? 'Gesamtbericht' : selectedProject?.title ?? 'Projektbericht'

  // ── Audio text — the note when present, a calm fallback otherwise ─
  function buildProjectBriefing(p: typeof projects[number]) {
    const phase = PHASE[p.status] ?? 'Intake'
    const projTasks = allTasks.filter(t => t.project_id === p.id)
    const risks = projTasks.filter(t => t.status === 'blocked').length
    const decisions = projTasks.filter(t => t.status === 'waiting').length
    const open = projTasks.filter(t => t.status !== 'done').length
    return (
      `Statusbericht: ${p.title}. ` +
      `Aktuell in Phase ${phase}. ${open} offene Aufgabe${open === 1 ? '' : 'n'}. ` +
      `${risks > 0 ? `${risks} Risiken brauchen Aufmerksamkeit. ` : 'Keine akuten Risiken sichtbar. '}` +
      `${decisions > 0 ? `${decisions} Entscheidung${decisions === 1 ? '' : 'en'} warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
    )
  }

  function buildOverallBriefing() {
    if (activeProjects.length === 0) return 'Noch kein aktives Projekt. Sobald jemand am Projekt arbeitet, fasse ich den Stand hier ruhig zusammen.'
    const lead = `Gesamtbericht. Du hast ${activeProjects.length} aktive Projekt${activeProjects.length === 1 ? '' : 'e'}. `
    const open = allTasks.filter(t => t.status !== 'done').length
    const risks = riskTasks.length
    const decisions = decisionTasks.length
    return (
      lead +
      `${open} offene Aufgaben insgesamt. ` +
      `${risks > 0 ? `${risks} Risiken brauchen Aufmerksamkeit. ` : 'Keine akuten Risiken über alle Projekte. '}` +
      `${decisions > 0 ? `${decisions} Entscheidungen warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
    )
  }

  const fallbackBriefing = isOverall
    ? buildOverallBriefing()
    : selectedProject ? buildProjectBriefing(selectedProject) : buildOverallBriefing()
  const audioText = noteReport?.summary?.trim() && isOverall
    ? noteReport.summary
    : fallbackBriefing

  const activeLog = useMemo(
    () => briefingLog.find((entry) => entry.id === activeLogId) ?? briefingLog[0] ?? null,
    [activeLogId, briefingLog],
  )

  function addBriefingLogEntry(entry: Omit<BriefingLogEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
    const id = entry.id ?? `${entry.kind}-${scope}-${Date.now()}`
    const next: BriefingLogEntry = {
      id,
      kind: entry.kind,
      title: entry.title,
      scope: entry.scope,
      body: entry.body,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    }
    setBriefingLog((items) => [next, ...items.filter((item) => item.id !== id)].slice(0, 24))
    setActiveLogId(id)
  }

  function addTranscriptToLog() {
    const body = audioText.trim()
    if (!body) return
    addBriefingLogEntry({
      id: `transcript-${scope}`,
      kind: 'transcript',
      title: isOverall ? 'Transkript – Gesamtbericht' : `Transkript – ${scopeLabel}`,
      scope: scopeLabel,
      body,
    })
    setShowTranscript(true)
  }

  // German average ≈ 150 wpm → ~2.5 words per second.
  const briefingDurationLabel = useMemo(() => {
    const words = audioText.trim().split(/\s+/).filter(Boolean).length
    const seconds = Math.max(20, Math.round((words / 150) * 60))
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')} min`
  }, [audioText])

  const {
    supported: speechSupported,
    state: speechState,
    voices,
    selectedVoice,
    preferences,
    play: playBriefing,
    pause: pauseBriefing,
    stop: stopBriefing,
    updatePreferences,
  } = useSpeechSynthesis(audioText)
  const selectedVoiceId = selectedVoice ? speechVoiceId(selectedVoice) : ''
  const voiceChoices = useMemo(() => {
    const german = voices.filter((v) => v.lang.toLowerCase().startsWith('de'))
    return (german.length ? german : voices).slice(0, 12)
  }, [voices])
  const isBriefingPlaying = speechState === 'playing'
  const isBriefingActive = speechState === 'playing' || speechState === 'paused'
  const listenLabel = isBriefingPlaying ? 'Pausieren' : speechState === 'paused' ? 'Weiterhören' : 'Bericht anhören'
  const handleBriefingToggle = () => { if (isBriefingPlaying) pauseBriefing(); else playBriefing() }

  // Tagro is "active" while writing the note or reading it aloud — the
  // orb spins and the speech waveform dances during that time.
  const tagroActive = isBriefingPlaying || noteWriting || statusBusy

  // ── Turn a line of Tagro's reading into a real task ─────────────
  async function createTaskFromText(key: string, text: string) {
    if (!main || (taskState[key] ?? 'idle') !== 'idle') return
    setTaskState((s) => ({ ...s, [key]: 'busy' }))
    try {
      const res = await fetch('/api/client/tasks/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: main.id, title: text.slice(0, 200) }),
      })
      const d = await res.json().catch(() => ({}))
      setTaskState((s) => ({ ...s, [key]: d?.ok ? 'done' : 'idle' }))
    } catch {
      setTaskState((s) => ({ ...s, [key]: 'idle' }))
    }
  }

  async function createAllTasks() {
    if (!main || !noteReport || allTasksBusy) return
    const steps = noteReport.nextSteps
    setAllTasksBusy(true)
    setBulkProgress(0)
    // Filed one after another — the rows check off in a calm cascade.
    for (let i = 0; i < steps.length; i++) {
      await createTaskFromText(`next-${i}`, steps[i])
      setBulkProgress(i + 1)
      if (i < steps.length - 1) await new Promise((r) => setTimeout(r, 200))
    }
    setAllTasksBusy(false)
  }

  // Renders one calm section of Tagro's structured reading.
  const renderSection = (label: string, items: string[], prefix: string, blocker = false) => {
    if (!items.length) return null
    return (
      <div className="dc-sec" key={prefix}>
        <p className="dc-sec-label">{label}</p>
        {items.slice(0, 6).map((it, i) => {
          const k = `${prefix}-${i}`
          const st = taskState[k] ?? 'idle'
          const done = st === 'done'
          return (
            <div className={`dc-sec-item${blocker ? ' blocker' : ''}${done ? ' done' : ''}`} key={k}>
              <span className="dc-sec-mark" aria-hidden>
                {done ? (
                  <svg className="dc-check" viewBox="0 0 16 16" fill="none">
                    <path d="M3.4 8.6l3 3 6.2-7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="dot" />
                )}
              </span>
              <span className="dc-sec-text">{it}</span>
              {done ? (
                <span className="dc-task-done">Aufgabe angelegt</span>
              ) : (
                <button
                  type="button"
                  className={`dc-task-btn ${st}`}
                  onClick={() => createTaskFromText(k, it)}
                  disabled={st !== 'idle' || !main}
                  title={main ? 'Als Aufgabe anlegen' : 'Kein Projekt verknüpft'}
                >
                  {st === 'busy'
                    ? <span className="dc-task-spin" aria-hidden />
                    : <><Plus size={11} weight="bold" /> Aufgabe</>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const allNextDone =
    (noteReport?.nextSteps.length ?? 0) > 0 &&
    (noteReport?.nextSteps ?? []).every((_, i) => (taskState[`next-${i}`] ?? 'idle') === 'done')

  // ── Notepad writing animation ───────────────────────────────────
  async function streamNote(text: string) {
    const token = ++writeToken.current
    setNoteWriting(true)
    setNoteRevealed('')
    const words = text.split(/(\s+)/)
    let acc = ''
    for (const word of words) {
      if (writeToken.current !== token) return
      acc += word
      setNoteRevealed(acc)
      await new Promise((r) => setTimeout(r, word.trim() ? 24 : 10))
    }
    if (writeToken.current === token) setNoteWriting(false)
  }

  async function refreshStatus() {
    if (statusBusy) return
    setStatusBusy(true)
    try {
      // Honour the scope dropdown: 'overall' → no projectId, single → that project.
      const scopedBody = isOverall ? {} : { projectId: scope }
      const res = await fetch('/api/client/status-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scopedBody),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.report) {
        const r = normalizeReport(d.report)
        setNoteReport(r)
        setTaskState({})
        addBriefingLogEntry({
          kind: 'report',
          title: isOverall ? 'Statusbericht – Heute' : `Statusbericht – ${scopeLabel}`,
          scope: isOverall ? 'Gesamtbericht für alle Projekte' : scopeLabel,
          body: r.summary || fallbackBriefing,
          createdAt: r.createdAt,
        })
        if (r.summary) await streamNote(r.summary)
      }
    } finally {
      setStatusBusy(false)
    }
  }

  const noteStamp = noteReport?.createdAt
    ? new Date(noteReport.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="page-content dashboard-os dash-calm">
      <style>{`
        @keyframes dcFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes dcBlink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
        @keyframes dcSpin { to { transform:rotate(360deg); } }
        @keyframes dcWave { 0%,100% { transform:scaleY(.22); } 50% { transform:scaleY(1); } }
        @keyframes dcCheckDraw { to { stroke-dashoffset:0; } }
        @keyframes dcPop { 0% { transform:scale(.55); opacity:0; } 62% { transform:scale(1.14); } 100% { transform:scale(1); opacity:1; } }
        @keyframes dcTaskFlash { 0% { background:color-mix(in srgb, var(--surface-2) 80%, transparent); } 100% { background:transparent; } }
        @keyframes dcRowIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

        .dash-calm {
          min-height:100%;
          background:transparent;
          color:var(--text);
          padding: 0 clamp(20px, 2.4vw, 32px) 64px;
          --dc-muted: #5A6478;
          --dc-soft: #4E5567;
          --dc-slate: #5B647D;
        }
        [data-theme="dark"] .dash-calm,
        [data-theme="classic-dark"] .dash-calm {
          --dc-muted: #8D98A6;
          --dc-soft: #B7BDC8;
        }
        .dash-calm * { font-weight:500 !important; letter-spacing:.012em; }

        /* ── Greeting full-width, then a calm two-column body ────── */
        .dc-wrap { max-width: 1320px; }
        .dc-body {
          margin-top: 20px;
          display:grid;
          grid-template-columns: minmax(0,1fr) 360px;
          column-gap: 44px;
          align-items:start;
        }

        /* ── Header ───────────────────────────────────────────────── */
        .dc-head { padding:26px 0 0; animation:dcFade .3s cubic-bezier(.16,1,.3,1) both; }
        .dc-greeting {
          margin:0;
          color:var(--text);
          font-size:clamp(19px, 1.55vw, 21px);
          line-height:1.22;
          letter-spacing:-.016em;
        }
        .dc-greeting-sub {
          margin:8px 0 0;
          max-width:420px;
          color:var(--dc-soft);
          font-size:12.5px;
          line-height:1.5;
        }

        /* ── Notepad ──────────────────────────────────────────────── */
        /* The status note is NOT a card — it sits on the page like a
           written notebook page. Clean, calm, no frame. */
        .dc-note {
          grid-column:1; grid-row:1;
          min-width:0; min-height:150px;
          animation:dcFade .3s .04s cubic-bezier(.16,1,.3,1) both;
        }
        .dc-note-head {
          display:flex; align-items:baseline; justify-content:space-between;
          gap:12px; margin-bottom:16px;
        }
        .dc-note-label {
          color:var(--dc-muted);
          font-size:11.5px;
        }
        .dc-note-stamp { color:var(--dc-muted); font-size:11.5px; }
        .dc-note-text {
          margin:0;
          max-width:760px;
          color:var(--text);
          font-size:15.5px;
          line-height:1.74;
          white-space:pre-wrap;
        }
        .dc-caret {
          display:inline-block;
          width:2px; height:1.05em;
          margin-left:1.5px;
          vertical-align:-2px;
          background:var(--text);
          animation:dcBlink 1s steps(1) infinite;
        }
        .dc-note-empty {
          margin:0;
          max-width:560px;
          color:var(--dc-muted);
          font-size:14px;
          line-height:1.6;
        }
        .dc-note-empty-cue {
          margin-top:18px;
          display:inline-flex; align-items:center; gap:7px;
          color:var(--dc-muted);
          font-size:12px;
        }
        /* ── Note sections — Tagro's structured reading ───────────── */
        .dc-note-sections {
          margin-top:24px;
          display:flex; flex-direction:column; gap:22px;
          animation:dcFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        .dc-sec-label { margin:0 0 6px; color:var(--dc-muted); font-size:11.5px; }
        .dc-sec-item {
          display:flex; align-items:flex-start; gap:9px;
          padding:6px 8px; margin:0 -8px;
          border-radius:8px; min-height:32px;
          color:var(--dc-soft); font-size:13.5px; line-height:1.5;
          transition:background .14s ease;
        }
        .dc-sec-item:hover { background:color-mix(in srgb, var(--surface-2) 38%, transparent); }
        .dc-sec-item.done { animation:dcTaskFlash 1.5s cubic-bezier(.16,1,.3,1); }
        .dc-sec-mark {
          width:13px; height:13px; margin-top:3px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
        }
        .dc-sec-mark .dot {
          width:5px; height:5px; border-radius:999px;
          background:var(--dc-muted);
        }
        .dc-sec-item.blocker .dc-sec-mark .dot { background:#ef4444; }
        .dc-check { width:13px; height:13px; color:var(--text); animation:dcPop .28s ease both; }
        .dc-check path {
          stroke-dasharray:17; stroke-dashoffset:17;
          animation:dcCheckDraw .42s .05s cubic-bezier(.16,1,.3,1) forwards;
        }
        .dc-sec-text { flex:1; min-width:0; transition:color .35s ease; }
        .dc-sec-item.done .dc-sec-text { color:var(--dc-muted); }
        .dc-task-done {
          flex-shrink:0; display:inline-flex; align-items:center; height:24px;
          color:var(--dc-muted); font-size:11px;
          animation:dcPop .32s .06s ease both;
        }
        .dc-task-btn {
          flex-shrink:0;
          display:inline-flex; align-items:center; justify-content:center; gap:5px;
          height:24px; min-width:82px; padding:0 9px;
          border:0; border-radius:6px;
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--dc-muted);
          font:inherit; font-size:11px; cursor:pointer;
          opacity:0; transform:translateX(4px);
          transition:opacity .15s ease, transform .15s ease, background .12s ease, color .12s ease;
        }
        .dc-sec-item:hover .dc-task-btn,
        .dc-task-btn.busy { opacity:1; transform:none; }
        .dc-task-btn:hover { background:color-mix(in srgb, var(--surface-2) 96%, transparent); color:var(--text); }
        .dc-task-btn:active { transform:scale(.94); }
        .dc-task-btn:disabled { cursor:default; }
        .dc-task-spin {
          width:11px; height:11px; border-radius:999px;
          border:2px solid color-mix(in srgb, var(--dc-muted) 30%, transparent);
          border-top-color:var(--dc-soft);
          animation:dcSpin .7s linear infinite;
        }
        .dc-note-actions { margin-top:20px; display:flex; gap:8px; flex-wrap:wrap; }
        .dc-note-action {
          display:inline-flex; align-items:center; gap:7px;
          height:34px; padding:0 14px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius:8px; background:transparent;
          color:var(--dc-soft); font:inherit; font-size:12px; cursor:pointer;
          transition:background .14s ease, color .14s ease, border-color .14s ease, transform .1s ease;
        }
        .dc-note-action:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); color:var(--text); }
        .dc-note-action:active { transform:scale(.98); }
        .dc-note-action:disabled { cursor:default; }
        .dc-note-action.done {
          border-color:transparent;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
          color:var(--dc-soft);
        }
        .dc-note-action.done svg { animation:dcPop .3s ease both; }

        /* ── Tagro voice — orb + speech waveform ──────────────────── */
        .dc-voice {
          display:flex; align-items:center; gap:13px;
          height:32px; margin-bottom:16px;
        }
        .dc-wave { display:flex; align-items:center; gap:3px; height:22px; flex:1; }
        .dc-wave-bar {
          flex:1; max-width:4px; height:100%;
          border-radius:2px;
          background:var(--dc-muted);
          opacity:.4;
          transform:scaleY(.2);
          transform-origin:center;
          transition:transform .3s ease, opacity .3s ease;
        }
        .dc-voice.playing .dc-wave-bar {
          opacity:.85;
          animation:dcWave .85s ease-in-out infinite;
        }

        /* ── Right column: action card + decisions/risks ─────────── */
        .dc-side {
          grid-column:2; grid-row:1;
          display:flex; flex-direction:column;
          animation:dcFade .3s .06s cubic-bezier(.16,1,.3,1) both;
        }
        /* The right column is frameless too — no floating box, just a
           calm stack that mirrors the notebook on the left. */
        .dc-card { position:relative; }
        .dc-pulse {
          display:inline-flex; align-items:center; gap:7px;
          height:24px; padding:0 10px;
          margin-bottom:13px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 52%, transparent);
          color:var(--dc-soft);
          font-size:11.5px;
        }
        .dc-pulse-dot {
          width:7px; height:7px; border-radius:999px;
          background:currentColor; flex-shrink:0;
        }
        /* Calm = no colour. Colour only appears when something needs you. */
        .dc-pulse.tone-green .dc-pulse-dot { color:var(--dc-muted); }
        .dc-pulse.tone-amber .dc-pulse-dot { color:#f59e0b; }
        .dc-pulse.tone-red   .dc-pulse-dot { color:#ef4444; }

        .dc-primary {
          appearance:none; border:0; width:100%;
          height:42px; padding:0 16px;
          display:inline-flex; align-items:center; justify-content:center; gap:9px;
          border-radius:10px;
          background:#383C44;
          color:#fff;
          font:inherit; font-size:13px;
          cursor:pointer;
          transition:background .14s ease, opacity .14s ease;
        }
        .dc-primary:hover { background:#2c2f36; }
        .dc-primary:disabled { opacity:.5; cursor:default; }
        .dc-primary .spin { animation:dcSpin .9s linear infinite; }
        [data-theme="dark"] .dc-primary,
        [data-theme="classic-dark"] .dc-primary { background:#3f444e; }
        [data-theme="dark"] .dc-primary:hover,
        [data-theme="classic-dark"] .dc-primary:hover { background:#4a505b; }

        .dc-audio { margin-top:8px; display:flex; gap:7px; }
        .dc-audio-play {
          appearance:none; flex:1;
          height:38px; padding:0 12px;
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          border-radius:9px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          background:transparent;
          color:var(--text);
          font:inherit; font-size:12.5px;
          cursor:pointer;
          transition:background .13s ease, border-color .13s ease;
        }
        .dc-audio-play:hover {
          background:color-mix(in srgb, var(--surface-2) 50%, transparent);
          border-color:var(--border);
        }
        .dc-audio-play:disabled { opacity:.45; cursor:default; }
        .dc-audio-stop, .dc-audio-cfg {
          appearance:none;
          width:38px; height:38px;
          display:inline-flex; align-items:center; justify-content:center;
          border-radius:9px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          background:transparent;
          color:var(--dc-soft);
          cursor:pointer;
          transition:background .13s ease, color .13s ease;
        }
        .dc-audio-stop:hover, .dc-audio-cfg:hover {
          background:color-mix(in srgb, var(--surface-2) 50%, transparent);
          color:var(--text);
        }
        .dc-audio-cfg.open { background:color-mix(in srgb, var(--surface-2) 60%, transparent); color:var(--text); }

        .dc-settings {
          position:absolute; z-index:6;
          top:calc(100% + 8px); right:0;
          width:100%;
          padding:8px;
          border-radius:12px;
          background:var(--surface);
          box-shadow:0 1px 2px rgba(15,23,42,.07), 0 20px 50px rgba(15,23,42,.16);
        }
        [data-theme="dark"] .dc-settings,
        [data-theme="classic-dark"] .dc-settings {
          background:color-mix(in srgb, var(--surface) 95%, #fff 5%);
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 20px 50px rgba(0,0,0,.3);
        }
        .dc-setting-row {
          display:grid; grid-template-columns:62px minmax(0,1fr);
          gap:9px; align-items:center; padding:5px;
        }
        .dc-setting-label {
          color:var(--dc-muted); font-size:10px;
          letter-spacing:.11em; text-transform:uppercase;
        }
        .dc-setting-select {
          width:100%; height:32px;
          border:0; border-radius:8px; padding:0 9px;
          background:color-mix(in srgb, var(--surface-2) 58%, transparent);
          color:var(--text); font:inherit; font-size:11.5px;
          outline:none;
        }

        /* ── New Briefing Card — premium, executive-feel ──────────── */
        .dc-brief {
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          border-radius: 22px;
          background: color-mix(in srgb, var(--card) 92%, var(--surface) 8%);
          padding: 22px 22px 20px;
          display: flex; flex-direction: column; gap: 18px;
          box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 4%, transparent),
                      0 18px 48px -28px color-mix(in srgb, var(--text) 24%, transparent);
        }
        [data-theme="dark"] .dc-brief,
        [data-theme="classic-dark"] .dc-brief {
          background: color-mix(in srgb, var(--card) 96%, #fff 2%);
          box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 24px 60px -28px rgba(0,0,0,.5);
        }

        .dc-brief-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 14px;
        }
        .dc-brief-headline { min-width: 0; flex: 1; }
        .dc-brief-eyebrow {
          margin: 0; font-size: 10.5px; font-weight: 500 !important;
          letter-spacing: .14em !important; text-transform: uppercase;
          color: var(--dc-muted);
        }
        .dc-brief-title {
          margin: 5px 0 4px; font-size: 17px; line-height: 1.25;
          font-weight: 500 !important; letter-spacing: -.005em !important;
          color: var(--text);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dc-brief-sub {
          margin: 0; font-size: 11.5px; font-weight: 500 !important;
          color: var(--dc-muted); letter-spacing: .015em !important;
        }

        /* Scope dropdown */
        .dc-scope { position: relative; flex-shrink: 0; }
        .dc-scope-trigger {
          display: inline-flex; align-items: center; gap: 7px;
          max-width: 170px;
          height: 30px; padding: 0 11px 0 12px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          background: color-mix(in srgb, var(--surface-2) 35%, transparent);
          color: var(--text); font: inherit; font-size: 11.5px;
          font-weight: 500 !important; letter-spacing: .015em !important;
          cursor: pointer; transition: background .12s, border-color .12s;
        }
        .dc-scope-trigger:hover {
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
          border-color: var(--border);
        }
        .dc-scope-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dc-scope-trigger svg { color: var(--dc-muted); flex-shrink: 0; }

        .dc-scope-backdrop {
          position: fixed; inset: 0; z-index: 14;
          background: transparent; border: 0; padding: 0; cursor: default;
        }
        .dc-scope-menu {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 15;
          min-width: 240px; max-width: 280px;
          padding: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 20px 50px rgba(15,23,42,.14);
          display: flex; flex-direction: column; gap: 2px;
          animation: dcFade .14s ease both;
        }
        [data-theme="dark"] .dc-scope-menu,
        [data-theme="classic-dark"] .dc-scope-menu {
          background: color-mix(in srgb, var(--surface) 95%, #fff 5%);
          box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 24px 60px rgba(0,0,0,.4);
        }
        .dc-scope-opt {
          display: grid; grid-template-columns: 8px 1fr auto;
          gap: 9px; align-items: center;
          width: 100%; padding: 8px 10px;
          border: 0; background: transparent; border-radius: 8px;
          color: var(--text); font: inherit; font-size: 12.5px;
          font-weight: 500 !important; letter-spacing: .015em !important;
          cursor: pointer; text-align: left;
          transition: background .1s;
        }
        .dc-scope-opt:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .dc-scope-opt.on { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .dc-scope-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--dc-muted);
        }
        .dc-scope-opt-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .dc-scope-opt-main strong {
          font-size: 12.5px; font-weight: 500 !important;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dc-scope-opt-main small {
          font-size: 10.5px; color: var(--dc-muted);
          font-weight: 500 !important; letter-spacing: .015em !important;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dc-scope-divider {
          height: 1px;
          background: color-mix(in srgb, var(--border) 60%, transparent);
          margin: 4px 6px;
        }

        /* Tagro bubble — breathing ring + outer pulses */
        .dc-orb-stage {
          position: relative;
          width: 100%; aspect-ratio: 1.7 / 1; max-height: 180px;
          display: flex; align-items: center; justify-content: center;
        }
        .dc-orb-bubble {
          position: relative; z-index: 3;
          width: 76px; height: 76px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--card);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, #fff 20%, transparent),
            0 8px 28px -10px color-mix(in srgb, var(--text) 30%, transparent);
        }
        [data-theme="dark"] .dc-orb-bubble,
        [data-theme="classic-dark"] .dc-orb-bubble {
          background: color-mix(in srgb, var(--card) 92%, #fff 8%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.06),
            0 10px 38px -14px rgba(0,0,0,.6);
        }
        .dc-orb-ring {
          position: absolute; left: 50%; top: 50%;
          width: 112px; height: 112px;
          margin: -56px 0 0 -56px;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
          z-index: 2;
          animation: dcOrbBreathe 4.6s ease-in-out infinite;
        }
        .dc-orb-stage.speaking .dc-orb-ring {
          border-color: color-mix(in srgb, var(--dc-slate, #5B647D) 45%, var(--border));
          animation-duration: 2.4s;
        }
        .dc-orb-stage.loading .dc-orb-ring {
          border-style: dashed;
          animation: dcOrbSpin 8s linear infinite;
        }
        .dc-orb-pulse {
          position: absolute; left: 50%; top: 50%;
          width: 76px; height: 76px;
          margin: -38px 0 0 -38px;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--dc-slate, #5B647D) 30%, transparent);
          opacity: 0;
          z-index: 1;
        }
        .dc-orb-stage.speaking .dc-orb-pulse-1 {
          animation: dcOrbPulse 3.4s ease-out infinite;
        }
        .dc-orb-stage.speaking .dc-orb-pulse-2 {
          animation: dcOrbPulse 3.4s ease-out 1.7s infinite;
        }
        @keyframes dcOrbBreathe {
          0%,100% { transform: scale(1); opacity: .85; }
          50%     { transform: scale(1.04); opacity: 1; }
        }
        @keyframes dcOrbSpin { to { transform: rotate(360deg); } }
        @keyframes dcOrbPulse {
          0%   { transform: scale(1);    opacity: .55; }
          70%  { transform: scale(2.1);  opacity: 0; }
          100% { transform: scale(2.3);  opacity: 0; }
        }

        /* Minimalist voice line — no equaliser bars */
        .dc-voice-line {
          width: 100%; height: 14px;
          stroke: color-mix(in srgb, var(--dc-muted) 60%, transparent);
          stroke-width: 1.4; fill: none;
          stroke-linecap: round; stroke-linejoin: round;
          opacity: .55;
          transition: opacity .3s ease, stroke .3s ease;
        }
        .dc-voice-line.on {
          stroke: color-mix(in srgb, var(--dc-slate, #5B647D) 60%, var(--text));
          opacity: 1;
          animation: dcLineDrift 5s ease-in-out infinite;
        }
        @keyframes dcLineDrift {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(-3px); }
        }

        .dc-brief-meta {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px;
        }
        .dc-brief-pulse {
          display: inline-flex; align-items: center; gap: 6px;
          height: 24px; padding: 0 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--dc-soft);
          font-size: 11px; font-weight: 500 !important; letter-spacing: .015em !important;
        }
        .dc-brief-pulse-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: currentColor; flex-shrink: 0;
        }
        .dc-brief-pulse.tone-green  { color: #22a06b; }
        .dc-brief-pulse.tone-amber  { color: #d4882b; }
        .dc-brief-pulse.tone-red    { color: #d44b4b; }
        .dc-brief-pulse.tone-green .dc-brief-pulse-dot { animation: dcOrbBreathe 1.8s ease-in-out infinite; }
        .dc-brief-duration {
          font-size: 11.5px; color: var(--dc-muted);
          font-weight: 500 !important; letter-spacing: .015em !important;
          font-variant-numeric: tabular-nums;
        }

        .dc-brief-body {
          margin: 0; font-size: 13px; line-height: 1.6;
          color: var(--dc-soft);
          font-weight: 500 !important; letter-spacing: .015em !important;
        }

        .dc-brief-actions { display: flex; flex-direction: column; gap: 8px; }
        .dc-brief-primary {
          appearance: none; border: 0;
          width: 100%; height: 44px; padding: 0 18px;
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          border-radius: 12px;
          background: var(--btn-prim); color: var(--btn-prim-text);
          font: inherit; font-size: 13.5px;
          font-weight: 500 !important; letter-spacing: .015em !important;
          cursor: pointer;
          transition: opacity .14s, transform .14s;
        }
        .dc-brief-primary:hover:not(:disabled) { opacity: .92; }
        .dc-brief-primary:active:not(:disabled) { transform: scale(.985); }
        .dc-brief-primary:disabled { opacity: .45; cursor: default; }
        .dc-brief-primary .spin { animation: dcSpin 1s linear infinite; }

        .dc-brief-secondary-row {
          display: flex; align-items: center; gap: 6px;
        }
        .dc-brief-secondary {
          flex: 1;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 36px; padding: 0 12px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: transparent;
          color: var(--dc-soft);
          font: inherit; font-size: 12px;
          font-weight: 500 !important; letter-spacing: .015em !important;
          cursor: pointer;
          transition: background .12s, color .12s, border-color .12s;
        }
        .dc-brief-secondary:hover {
          background: color-mix(in srgb, var(--surface-2) 45%, transparent);
          color: var(--text);
          border-color: var(--border);
        }
        .dc-brief-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: transparent;
          color: var(--dc-soft);
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .12s, color .12s, border-color .12s;
        }
        .dc-brief-icon:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--text);
        }
        .dc-brief-icon.on {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text);
        }
        .dc-brief-icon:disabled { opacity: .45; cursor: default; }
        .dc-brief-icon .spin { animation: dcSpin 1s linear infinite; }

        .dc-brief-transcript {
          margin-top: 4px; padding: 14px 16px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--surface-2) 45%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .dc-brief-transcript-label {
          margin: 0 0 6px; font-size: 10.5px; font-weight: 500 !important;
          letter-spacing: .14em !important; text-transform: uppercase;
          color: var(--dc-muted);
        }
        .dc-brief-transcript-text {
          margin: 0; font-size: 13px; line-height: 1.65;
          color: var(--text);
          font-weight: 500 !important; letter-spacing: .015em !important;
        }

        .dc-brief-settings {
          margin-top: 4px; padding: 10px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }

        @media (max-width: 920px) {
          .dc-brief { padding: 18px 16px 18px; }
          .dc-brief-head { flex-direction: column; align-items: stretch; }
          .dc-scope-trigger { max-width: none; width: 100%; justify-content: space-between; }
          .dc-scope-menu { left: 0; right: 0; min-width: 0; }
          .dc-orb-stage { aspect-ratio: 2 / 1; max-height: 140px; }
          .dc-orb-bubble { width: 64px; height: 64px; }
          .dc-orb-ring { width: 96px; height: 96px; margin: -48px 0 0 -48px; }
          .dc-orb-pulse { width: 64px; height: 64px; margin: -32px 0 0 -32px; }
        }

        /* ── Overview: 4 calm stats under the action box ──────────── */
        .dc-overview { margin-top:22px; }
        .dc-overview .dc-block-label { display:block; margin-bottom:11px; }
        .dc-stats {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px 14px;
        }
        .dc-stat-value { color:var(--text); font-size:19px; line-height:1.1; }
        .dc-stat-label { margin-top:5px; color:var(--dc-muted); font-size:11px; }

        /* ── Blocks: decisions + risks ────────────────────────────── */
        .dc-blocks { margin-top:22px; }
        .dc-block { padding:14px 4px 4px; }
        .dc-block-head {
          display:flex; align-items:baseline; justify-content:space-between;
          gap:10px; margin-bottom:8px;
        }
        .dc-block-label {
          color:var(--dc-muted); font-size:11.5px;
        }
        .dc-block-count { color:var(--dc-muted); font-size:11.5px; }
        .dc-block-empty {
          margin:0; padding:2px 6px 6px;
          color:var(--dc-muted); font-size:12.5px; line-height:1.5;
        }
        .dc-block-list { display:flex; flex-direction:column; }
        .dc-block-row {
          display:grid;
          grid-template-columns:6px minmax(0,1fr) 14px;
          gap:9px; align-items:center;
          padding:8px 6px;
          border-radius:9px;
          text-decoration:none; color:inherit;
          transition:background .12s ease;
        }
        .dc-block-row:hover { background:color-mix(in srgb, var(--surface-2) 58%, transparent); }
        .dc-block-row:hover .dc-block-go { opacity:1; transform:none; }
        .dc-row-dot { width:6px; height:6px; border-radius:999px; flex-shrink:0; }
        .dc-row-dot.warn { background:#f59e0b; }
        .dc-row-dot.risk { background:#ef4444; }
        .dc-row-main { min-width:0; }
        .dc-row-title {
          color:var(--text); font-size:13px; line-height:1.35;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .dc-row-sub {
          color:var(--dc-muted); font-size:11px; line-height:1.3;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .dc-block-go { color:var(--dc-muted); opacity:0; transform:translateX(-2px); transition:opacity .12s ease, transform .12s ease; }
        .dc-block-more {
          display:inline-flex; align-items:center; gap:5px;
          margin:5px 6px 0;
          color:var(--dc-muted); font-size:11.5px;
          text-decoration:none;
        }
        .dc-block-more:hover { color:var(--text); }

        .dc-foot {
          display:flex; flex-wrap:wrap; gap:6px;
          margin:16px 4px 0;
        }
        .dc-foot-link {
          display:inline-flex; align-items:center; gap:6px;
          height:30px; padding:0 11px;
          border-radius:8px;
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--dc-soft);
          font-size:11.5px; text-decoration:none;
          transition:background .12s ease, color .12s ease;
        }
        .dc-foot-link:hover { background:color-mix(in srgb, var(--surface-2) 80%, transparent); color:var(--text); }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width:920px) {
          .dc-body { display:flex; flex-direction:column; margin-top:16px; }
          .dc-side { display:contents; }
          .dc-card { order:1; }
          .dc-note { order:2; min-height:auto; margin-top:24px; }
          .dc-blocks { order:3; margin-top:22px; }
        }
        @media (max-width:760px) {
          .dash-calm { padding:0 14px 88px; }
          .dc-head { padding-top:20px; }
        }
        @media (max-width:600px) {
          .dash-calm { padding:0 16px 92px; }
          .dc-greeting { font-size:20px; }
          .dc-greeting-sub { font-size:12.5px; }
          .dc-note-text { font-size:15px; line-height:1.7; }
          .dc-card { padding:14px; }
        }
      `}</style>

      <div className="dc-wrap">

        <header className="dc-head">
          <div>
            <h1 className="dc-greeting">{greeting}</h1>
            <p className="dc-greeting-sub">
              Status, Berichte und Audio-Briefings in einem festen Arbeitsfenster.
            </p>
          </div>
          <span className={`dc-head-pulse tone-${pulse.tone}`}>
            <span />
            {pulse.label}
          </span>
        </header>

        <div className="dc-body">

        <aside className="dc-log-panel" aria-label="Briefing-Historie">
          <div className="dc-left-summary">
            <section className="dc-summary-block" aria-label="Überblick">
              <span className="dc-block-label">Überblick</span>
              <div className="dc-stats">
                {overview.map((s) => (
                  <div className="dc-stat" key={s.label}>
                    <div className="dc-stat-value">{s.value}</div>
                    <div className="dc-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="dc-summary-block" aria-label="Entscheidungen">
              <div className="dc-block-head">
                <span className="dc-block-label">Entscheidungen</span>
                {decisionTasks.length > 0 && <span className="dc-block-count">{decisionTasks.length}</span>}
              </div>
              {decisionTasks.length === 0 ? (
                <p className="dc-block-empty">Nichts wartet auf deine Freigabe.</p>
              ) : (
                <div className="dc-mini-list">
                  {decisionTasks.slice(0, 2).map((t) => (
                    <Link key={t.id} href={t.project_id ? `/project/${t.project_id}` : '/tasks'} className="dc-mini-row">
                      <span className="dc-row-dot warn" aria-hidden />
                      <span>{t.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="dc-summary-block" aria-label="Risiken">
              <div className="dc-block-head">
                <span className="dc-block-label">Risiken</span>
                {riskTasks.length > 0 && <span className="dc-block-count">{riskTasks.length}</span>}
              </div>
              {riskTasks.length === 0 ? (
                <p className="dc-block-empty">Keine Verzögerung sichtbar.</p>
              ) : (
                <div className="dc-mini-list">
                  {riskTasks.slice(0, 2).map((t) => (
                    <Link key={t.id} href={t.project_id ? `/project/${t.project_id}` : '/tasks'} className="dc-mini-row">
                      <span className="dc-row-dot risk" aria-hidden />
                      <span>{t.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="dc-log-head">
            <span>Berichte & Transkripte</span>
            <small>{briefingLog.length || 'Noch leer'}</small>
          </div>
          <div className="dc-log-list">
            {briefingLog.length === 0 ? (
              <div className="dc-log-empty">
                <FileText size={17} />
                <p>Noch kein schriftlicher Bericht.</p>
                <span>Statusberichte und Transkripte erscheinen hier als ruhige Historie.</span>
              </div>
            ) : briefingLog.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={`dc-log-entry${activeLog?.id === entry.id ? ' active' : ''}`}
                onClick={() => setActiveLogId(entry.id)}
              >
                <span className={`dc-log-kind ${entry.kind}`}>{entry.kind === 'transcript' ? 'Transkript' : 'Statusbericht'}</span>
                <strong>{entry.title}</strong>
                <small>{entry.scope} · {new Date(entry.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</small>
                <p>{entry.body}</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="dc-focus" aria-label="Berichtsanzeige">
          {activeLog ? (
            <article className="dc-focus-doc">
              <div className="dc-focus-kicker">{activeLog.kind === 'transcript' ? 'Transkript' : 'Statusbericht'}</div>
              <h2>{activeLog.title}</h2>
              <p className="dc-focus-meta">{activeLog.scope} · {new Date(activeLog.createdAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} Uhr</p>
              <p className="dc-focus-text">
                {activeLog.kind === 'report' && noteWriting && activeLog.id === activeLogId ? noteRevealed : activeLog.body}
                {noteWriting && activeLog.kind === 'report' && <span className="dc-caret" aria-hidden />}
              </p>
              {!noteWriting && activeLog.kind === 'report' && noteReport &&
                (noteReport.currentWork.length + noteReport.blockers.length + noteReport.nextSteps.length) > 0 && (
                <>
                  <div className="dc-note-sections">
                    {renderSection('Aktuell in Arbeit', noteReport.currentWork, 'work')}
                    {renderSection('Blocker', noteReport.blockers, 'blocker', true)}
                    {renderSection('Nächste Schritte', noteReport.nextSteps, 'next')}
                  </div>
                  {noteReport.nextSteps.length > 0 && main && (
                    <div className="dc-note-actions">
                      <button
                        type="button"
                        className={`dc-note-action${allNextDone ? ' done' : ''}`}
                        onClick={createAllTasks}
                        disabled={allTasksBusy || allNextDone}
                      >
                        {allTasksBusy ? (
                          <>
                            <span className="dc-task-spin" aria-hidden />
                            Tagro legt an… {bulkProgress}/{noteReport.nextSteps.length}
                          </>
                        ) : allNextDone ? (
                          <>
                            <Check size={13} weight="bold" />
                            Alle als Aufgaben angelegt
                          </>
                        ) : (
                          <>
                            <Plus size={12} weight="bold" />
                            Nächste Schritte als Aufgaben anlegen
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ) : (
            <section className="dc-focus-empty">
              <TagroLogo size={30} thinking={tagroActive} />
              <h2>Wähle links einen Bericht.</h2>
              <p>
                Oder starte rechts ein Voice Briefing. Das Transkript wird links als Eintrag abgelegt und hier lesbar geöffnet.
              </p>
            </section>
          )}
        </main>

        <aside className="dc-side">
          {/* Premium briefing card — scope-aware, ChatGPT-calm */}
          <section className="dc-brief" aria-label="Tagro Voice Briefing">
            <header className="dc-brief-head">
              <div className="dc-brief-headline">
                <p className="dc-brief-eyebrow">Tagro Voice Briefing</p>
                <h2 className="dc-brief-title">
                  {isOverall
                    ? 'Gesamtbericht für alle Projekte'
                    : `Statusbericht: ${selectedProject?.title ?? '—'}`}
                </h2>
                <p className="dc-brief-sub">
                  {noteStamp
                    ? <>Letzte Aktualisierung · heute, {noteStamp} Uhr</>
                    : 'Noch kein Bericht abgerufen.'}
                </p>
              </div>

              {/* Scope dropdown */}
              <div className="dc-scope">
                <button
                  type="button"
                  className="dc-scope-trigger"
                  onClick={() => setScopeOpen(o => !o)}
                  aria-expanded={scopeOpen}
                  aria-haspopup="listbox"
                >
                  <span>{isOverall ? 'Gesamtbericht' : selectedProject?.title ?? 'Projekt wählen'}</span>
                  <CaretDown size={11} weight="bold" />
                </button>
                {scopeOpen && (
                  <>
                    <button type="button" className="dc-scope-backdrop" aria-hidden onClick={() => setScopeOpen(false)} />
                    <div className="dc-scope-menu" role="listbox">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isOverall}
                        className={`dc-scope-opt${isOverall ? ' on' : ''}`}
                        onClick={() => { setScope('overall'); setScopeOpen(false); setShowTranscript(false) }}
                      >
                        <span className="dc-scope-dot" />
                        <span className="dc-scope-opt-main">
                          <strong>Gesamtbericht</strong>
                          <small>Alle aktiven Projekte zusammengefasst</small>
                        </span>
                        {isOverall && <Check size={12} weight="bold" />}
                      </button>
                      {activeProjects.length > 0 && <div className="dc-scope-divider" />}
                      {activeProjects.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={scope === p.id}
                          className={`dc-scope-opt${scope === p.id ? ' on' : ''}`}
                          onClick={() => { setScope(p.id); setScopeOpen(false); setShowTranscript(false) }}
                        >
                          <span className="dc-scope-dot" style={{ background: (p as any).color || 'var(--dc-muted)' }} />
                          <span className="dc-scope-opt-main">
                            <strong>{p.title}</strong>
                            <small>{PHASE[p.status] ?? 'Intake'}</small>
                          </span>
                          {scope === p.id && <Check size={12} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </header>

            {/* Tagro bubble — breathing ring + soft outer pulses */}
            <div className={`dc-orb-stage${tagroActive ? ' speaking' : ''}${statusBusy ? ' loading' : ''}`}>
              <span className="dc-orb-pulse dc-orb-pulse-1" aria-hidden />
              <span className="dc-orb-pulse dc-orb-pulse-2" aria-hidden />
              <span className="dc-orb-ring" aria-hidden />
              <span className="dc-orb-bubble" aria-hidden>
                <TagroLogo size={28} thinking={tagroActive} />
              </span>
            </div>

            {/* Minimalist voice line — soft rounded segments, not an equaliser */}
            <svg className={`dc-voice-line${tagroActive ? ' on' : ''}`} viewBox="0 0 240 14" preserveAspectRatio="none" aria-hidden>
              <path d="M0 7 L70 7 Q78 7 82 4 Q86 1 90 4 Q94 7 102 7 L150 7 Q158 7 162 10 Q166 13 170 10 Q174 7 182 7 L240 7" />
            </svg>

            {/* Status + duration row */}
            <div className="dc-brief-meta">
              <span className={`dc-brief-pulse tone-${
                statusBusy ? 'amber' : isBriefingPlaying ? 'green' : speechState === 'paused' ? 'amber' : pulse.tone
              }`}>
                <span className="dc-brief-pulse-dot" aria-hidden />
                <span>
                  {statusBusy
                    ? 'Wird generiert'
                    : isBriefingPlaying
                      ? 'Wird abgespielt'
                      : speechState === 'paused'
                        ? 'Pausiert'
                        : audioText.trim() ? 'Bereit zum Anhören' : pulse.label}
                </span>
              </span>
              <span className="dc-brief-duration">{briefingDurationLabel}</span>
            </div>

            <p className="dc-brief-body">
              {isOverall
                ? 'Tagro fasst alle aktiven Projekte in einem ruhigen Audio-Briefing zusammen.'
                : 'Tagro erklärt den aktuellen Fortschritt, offene Punkte und nächste Schritte für dieses Projekt.'}
            </p>

            {/* Primary + secondary action stack */}
            <div className="dc-brief-actions">
              <button
                type="button"
                className="dc-brief-primary"
                onClick={audioText.trim() ? handleBriefingToggle : refreshStatus}
                disabled={statusBusy || (!speechSupported && audioText.trim().length > 0)}
              >
                {statusBusy ? (
                  <><ArrowClockwise size={15} className="spin" /> Tagro generiert…</>
                ) : isBriefingPlaying ? (
                  <><Pause size={15} weight="fill" /> Pausieren</>
                ) : speechState === 'paused' ? (
                  <><Play size={15} weight="fill" /> Weiterhören</>
                ) : (
                  <><Play size={15} weight="fill" /> Bericht anhören</>
                )}
              </button>

              <div className="dc-brief-secondary-row">
                <button
                  type="button"
                  className="dc-brief-secondary"
                  onClick={addTranscriptToLog}
                >
                  <FileText size={13} />
                  {showTranscript ? 'Transkript links aktualisieren' : 'Transkript anzeigen'}
                </button>
                {isBriefingActive && (
                  <button type="button" className="dc-brief-icon" onClick={stopBriefing} title="Stopp" aria-label="Stopp">
                    <Stop size={12} weight="fill" />
                  </button>
                )}
                <button
                  type="button"
                  className={`dc-brief-icon${briefingSettingsOpen ? ' on' : ''}`}
                  onClick={() => setBriefingSettingsOpen(o => !o)}
                  title="Stimme und Tempo"
                  aria-label="Stimme und Tempo"
                  aria-expanded={briefingSettingsOpen}
                >
                  <SlidersHorizontal size={13} />
                </button>
                <button
                  type="button"
                  className="dc-brief-icon"
                  onClick={refreshStatus}
                  disabled={statusBusy}
                  title="Neu generieren"
                  aria-label="Neu generieren"
                >
                  <ArrowClockwise size={13} className={statusBusy ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {briefingSettingsOpen && (
              <div className="dc-brief-settings" role="dialog" aria-label="Audioeinstellungen">
                <label className="dc-setting-row">
                  <span className="dc-setting-label">Tempo</span>
                  <select
                    className="dc-setting-select"
                    value={preferences.rate}
                    onChange={(e) => updatePreferences({ rate: Number(e.target.value) })}
                  >
                    <option value={0.85}>0.85x</option>
                    <option value={0.95}>0.95x</option>
                    <option value={1}>1.00x</option>
                    <option value={1.1}>1.10x</option>
                    <option value={1.15}>1.15x</option>
                  </select>
                </label>
                <label className="dc-setting-row">
                  <span className="dc-setting-label">Stimme</span>
                  <select
                    className="dc-setting-select"
                    value={selectedVoiceId}
                    onChange={(e) => updatePreferences({ voiceId: e.target.value || undefined, voiceName: undefined })}
                  >
                    {voiceChoices.length === 0 && <option value="">Systemstimme</option>}
                    {voiceChoices.map((voice) => (
                      <option key={speechVoiceId(voice)} value={speechVoiceId(voice)}>
                        {formatVoiceLabel(voice)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className="dc-project-mini" aria-label="Kompakte Projektübersicht">
            <div className="dc-project-mini-head">
              <span>Projektübersicht</span>
              <Link href="/projects">Alle öffnen</Link>
            </div>
            <div className="dc-project-mini-list">
              {activeProjects.slice(0, 4).map((project) => {
                const projectTasks = allTasks.filter((task) => task.project_id === project.id)
                const openTasks = projectTasks.filter((task) => task.status !== 'done').length
                return (
                  <Link key={project.id} href={`/project/${project.id}`} className="dc-project-mini-row">
                    <span className="dc-project-dot" style={{ background: project.color || 'var(--dc-muted)' }} />
                    <span>
                      <strong>{project.title}</strong>
                      <small>{PHASE[project.status] ?? 'Intake'} · {openTasks} offen</small>
                    </span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              )}
            </div>
          </section>
        </aside>

        </div>

      </div>

      <ObserverWelcomeModal />
      <WelcomeTour />
    </div>
  )
}
