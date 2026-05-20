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
import { speechVoiceId, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { ArrowClockwise, ArrowRight, Pause, Play, SlidersHorizontal, Stop } from '@phosphor-icons/react'

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
  nextSteps: string[]
  blockers: string[]
  createdAt?: string
}

function normalizeReport(raw: any): NoteReport {
  const arr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [])
  return {
    summary: String(raw?.summary ?? raw?.content ?? '').trim(),
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

  // ── Audio text — the note when present, a calm fallback otherwise ─
  const fallbackBriefing = main
    ? `${greeting} ${main.title} ist aktuell ${phaseLabel ?? 'in Bearbeitung'}. ` +
      `${riskTasks.length > 0 ? `${riskTasks.length} Risiken brauchen Aufmerksamkeit.` : 'Keine akuten Risiken sichtbar.'} ` +
      `${decisionTasks.length > 0 ? `${decisionTasks.length} Entscheidungen warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
    : 'Noch kein aktives Projekt. Sobald jemand am Projekt arbeitet, fasse ich den Stand hier ruhig zusammen.'
  const audioText = noteReport?.summary?.trim() ? noteReport.summary : fallbackBriefing

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
      const res = await fetch('/api/client/status-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(main ? { projectId: main.id } : {}),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.report) {
        const r = normalizeReport(d.report)
        setNoteReport(r)
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
        .dc-note-next { margin-top:22px; }
        .dc-note-next-label {
          margin:0 0 9px;
          color:var(--dc-muted);
          font-size:11.5px;
        }
        .dc-note-next-item {
          display:flex; align-items:flex-start; gap:9px;
          padding:5px 0;
          color:var(--dc-soft);
          font-size:13.5px;
          line-height:1.5;
        }
        .dc-note-next-item span.dot {
          margin-top:7px;
          width:5px; height:5px; border-radius:999px;
          background:var(--dc-muted);
          flex-shrink:0;
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

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="dc-head">
          <h1 className="dc-greeting">{greeting}</h1>
          <p className="dc-greeting-sub">
            Ein Klick — und Tagro schreibt dir den aktuellen Projektstand hierher.
          </p>
        </header>

        <div className="dc-body">

        {/* ── Statusnotiz — notebook page, no frame ──────────────── */}
        <article className="dc-note" aria-label="Statusnotiz">
          <div className="dc-note-head">
            <span className="dc-note-label">Statusnotiz</span>
            {noteStamp && <span className="dc-note-stamp">Stand {noteStamp} Uhr</span>}
          </div>
          {noteRevealed ? (
            <>
              <p className="dc-note-text">
                {noteRevealed}
                {noteWriting && <span className="dc-caret" aria-hidden />}
              </p>
              {!noteWriting && (noteReport?.nextSteps?.length ?? 0) > 0 && (
                <div className="dc-note-next">
                  <p className="dc-note-next-label">Nächste Schritte</p>
                  {noteReport!.nextSteps.slice(0, 4).map((step, i) => (
                    <div className="dc-note-next-item" key={`${i}-${step}`}>
                      <span className="dot" aria-hidden />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="dc-note-empty">
                {loading
                  ? 'Tagro prüft gerade deine Projekte…'
                  : 'Hier ist noch nichts notiert. Tippe auf „Status abrufen“ und Tagro fasst den heutigen Stand ruhig hier zusammen.'}
              </p>
              {!loading && (
                <div className="dc-note-empty-cue">
                  <ArrowClockwise size={14} />
                  <span>Bereit, sobald du es bist.</span>
                </div>
              )}
            </>
          )}
        </article>

        {/* ── Right column ───────────────────────────────────────── */}
        <aside className="dc-side">
          <div className="dc-card">
            <div className={`dc-pulse tone-${pulse.tone}`} title={pulse.label}>
              <span className="dc-pulse-dot" aria-hidden />
              <span>{loading ? 'Status wird geprüft…' : pulse.label}</span>
            </div>

            <button
              type="button"
              className="dc-primary"
              onClick={refreshStatus}
              disabled={statusBusy}
            >
              <ArrowClockwise size={16} className={statusBusy ? 'spin' : ''} />
              <span>{statusBusy ? 'Tagro schreibt…' : 'Status abrufen'}</span>
            </button>

            <div className="dc-audio">
              <button
                type="button"
                className="dc-audio-play"
                onClick={handleBriefingToggle}
                disabled={!speechSupported || !audioText.trim()}
                aria-label={listenLabel}
              >
                {isBriefingPlaying ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
                <span>{listenLabel}</span>
              </button>
              {isBriefingActive && (
                <button type="button" className="dc-audio-stop" onClick={stopBriefing} aria-label="Stopp">
                  <Stop size={13} weight="fill" />
                </button>
              )}
              <button
                type="button"
                className={`dc-audio-cfg${briefingSettingsOpen ? ' open' : ''}`}
                onClick={() => setBriefingSettingsOpen((o) => !o)}
                aria-label="Stimme und Tempo"
                aria-expanded={briefingSettingsOpen}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {briefingSettingsOpen && (
              <div className="dc-settings" role="dialog" aria-label="Audioeinstellungen">
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
          </div>

          {/* ── Overview: 4 calm stats ───────────────────────────── */}
          <div className="dc-overview">
            <span className="dc-block-label">Überblick</span>
            <div className="dc-stats">
              {overview.map((s) => (
                <div className="dc-stat" key={s.label}>
                  <div className="dc-stat-value">{s.value}</div>
                  <div className="dc-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Decisions + risks ────────────────────────────────── */}
          <div className="dc-blocks">
          <section className="dc-block" aria-label="Entscheidungen">
            <div className="dc-block-head">
              <span className="dc-block-label">Entscheidungen</span>
              {decisionTasks.length > 0 && <span className="dc-block-count">{decisionTasks.length}</span>}
            </div>
            {decisionTasks.length === 0 ? (
              <p className="dc-block-empty">Nichts wartet auf deine Freigabe.</p>
            ) : (
              <>
                <div className="dc-block-list">
                  {decisionTasks.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      href={t.project_id ? `/project/${t.project_id}` : '/tasks'}
                      className="dc-block-row"
                    >
                      <span className="dc-row-dot warn" aria-hidden />
                      <span className="dc-row-main">
                        <span className="dc-row-title">{t.title}</span>
                        {projectTitle(t.project_id) && (
                          <span className="dc-row-sub">{projectTitle(t.project_id)}</span>
                        )}
                      </span>
                      <ArrowRight size={13} className="dc-block-go" />
                    </Link>
                  ))}
                </div>
                {decisionTasks.length > 4 && (
                  <Link href="/tasks?status=waiting" className="dc-block-more">
                    {decisionTasks.length - 4} weitere ansehen <ArrowRight size={11} />
                  </Link>
                )}
              </>
            )}
          </section>

          <section className="dc-block" aria-label="Risiken">
            <div className="dc-block-head">
              <span className="dc-block-label">Risiken</span>
              {riskTasks.length > 0 && <span className="dc-block-count">{riskTasks.length}</span>}
            </div>
            {riskTasks.length === 0 ? (
              <p className="dc-block-empty">Keine Verzögerung sichtbar.</p>
            ) : (
              <>
                <div className="dc-block-list">
                  {riskTasks.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      href={t.project_id ? `/project/${t.project_id}` : '/tasks'}
                      className="dc-block-row"
                    >
                      <span className="dc-row-dot risk" aria-hidden />
                      <span className="dc-row-main">
                        <span className="dc-row-title">{t.title}</span>
                        {projectTitle(t.project_id) && (
                          <span className="dc-row-sub">{projectTitle(t.project_id)}</span>
                        )}
                      </span>
                      <ArrowRight size={13} className="dc-block-go" />
                    </Link>
                  ))}
                </div>
                {riskTasks.length > 4 && (
                  <Link href="/tasks?status=blocked" className="dc-block-more">
                    {riskTasks.length - 4} weitere ansehen <ArrowRight size={11} />
                  </Link>
                )}
              </>
            )}
          </section>

          <div className="dc-foot">
            <Link href="/reports" className="dc-foot-link">Vollständig lesen <ArrowRight size={11} /></Link>
            {main && (
              <Link href={`/project/${main.id}`} className="dc-foot-link">
                Projekt öffnen <ArrowRight size={11} />
              </Link>
            )}
          </div>
          </div>
        </aside>

        </div>

      </div>

      <ObserverWelcomeModal />
    </div>
  )
}
