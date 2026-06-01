'use client'

/**
 * /dev/time — Zeiterfassung (time tracking).
 *
 * Canonical surface for the per-task timer that already powers the
 * sidebar's live session indicator. Reads/writes `dev_work_sessions`
 * through /api/dev/work-sessions (RLS-scoped to the developer). A DB
 * trigger auto-closes any open session when a new one starts, so there
 * is always at most one running timer.
 *
 * Time is internal evidence of activity — never surfaced raw to the
 * client. Veyra folds it into progress/effort signals, not billing
 * theatre. Mobile-first: cards, no horizontal scroll.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowClockwise, Clock, Pause, Play, PencilSimple, Check, X } from '@phosphor-icons/react'

type Session = {
  id: string
  task_id: string | null
  project_id: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  note: string | null
  source: string | null
}
type TaskLite = { id: string; title: string; project_id: string | null; dev_status: string | null; status: string | null }
type ProjectLite = { id: string; title: string; color: string | null }

const DONE = new Set(['done', 'completed', 'cancelled', 'archived', 'client_visible', 'approved_by_owner'])

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
function startOfWeek() {
  const d = new Date(); const day = (d.getDay() + 6) % 7   // Mon=0
  d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d.getTime()
}
function fmtDur(sec: number) {
  if (sec < 60) return `${sec}s`
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
function fmtClock(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }
function dayKey(iso: string) { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.getTime() }
function dayLabel(ts: number) {
  const today = startOfToday()
  if (ts === today) return 'Heute'
  if (ts === today - 86400000) return 'Gestern'
  return new Date(ts).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short' })
}
function sessionSeconds(s: Session, nowMs: number) {
  if (s.ended_at) return s.duration_seconds ?? Math.max(0, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000))
  return Math.max(0, Math.round((nowMs - new Date(s.started_at).getTime()) / 1000))
}

export default function DevTimePage() {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<Session[]>([])
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [projectsById, setProjectsById] = useState<Map<string, ProjectLite>>(new Map())
  const [tasksById, setTasksById] = useState<Map<string, TaskLite>>(new Map())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pickTask, setPickTask] = useState('')
  const [, setTick] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const noteRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [sesRes, { data: myTasks }, { data: projects }] = await Promise.all([
      fetch('/api/dev/work-sessions?limit=100').then(r => r.json()).catch(() => ({ sessions: [] })),
      (supabase as any).from('tasks')
        .select('id,title,project_id,dev_status,status')
        .eq('assigned_to', user.id).order('updated_at', { ascending: false }).limit(80),
      (supabase as any).from('projects').select('id,title,color'),
    ])
    const ses: Session[] = sesRes?.sessions ?? []
    setSessions(ses)
    const tlist = (myTasks as TaskLite[] | null) ?? []
    setTasks(tlist)
    const pmap = new Map<string, ProjectLite>()
    for (const p of (projects as ProjectLite[] | null) ?? []) pmap.set(p.id, p)
    setProjectsById(pmap)

    // Resolve titles for any session task not in my open-task list (e.g. closed tasks).
    const tmap = new Map<string, TaskLite>()
    for (const t of tlist) tmap.set(t.id, t)
    const missing = Array.from(new Set(ses.map(s => s.task_id).filter((id): id is string => !!id && !tmap.has(id))))
    if (missing.length) {
      const { data: extra } = await (supabase as any).from('tasks').select('id,title,project_id,dev_status,status').in('id', missing)
      for (const t of (extra as TaskLite[] | null) ?? []) tmap.set(t.id, t)
    }
    setTasksById(tmap)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const open = useMemo(() => sessions.find(s => !s.ended_at) ?? null, [sessions])

  // Tick once a second only while a session runs.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => { if (editing && noteRef.current) noteRef.current.focus() }, [editing])

  const nowMs = Date.now()
  const totals = useMemo(() => {
    const t0 = startOfToday(), w0 = startOfWeek()
    let today = 0, week = 0
    for (const s of sessions) {
      const startMs = new Date(s.started_at).getTime()
      const secs = sessionSeconds(s, nowMs)
      if (startMs >= t0) today += secs
      if (startMs >= w0) week += secs
    }
    return { today, week, count: sessions.length }
  }, [sessions, nowMs])

  const grouped = useMemo(() => {
    const map = new Map<number, Session[]>()
    for (const s of sessions) {
      const k = dayKey(s.started_at)
      const arr = map.get(k) ?? []
      arr.push(s); map.set(k, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [sessions])

  const openTasks = useMemo(
    () => tasks.filter(t => !DONE.has(String(t.dev_status || t.status || '').toLowerCase())),
    [tasks],
  )

  function taskTitle(id: string | null) { return (id && tasksById.get(id)?.title) || 'Aufgabe' }

  async function startTimer() {
    if (!pickTask || busy) return
    setBusy(true)
    try {
      await fetch('/api/dev/work-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: pickTask }),
      })
      setPickTask('')
      await load()
    } finally { setBusy(false) }
  }
  async function stopTimer(id: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/dev/work-sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, end: true }),
      })
      await load()
    } finally { setBusy(false) }
  }
  async function saveNote(id: string) {
    const note = editNote.trim()
    setSessions(curr => curr.map(s => s.id === id ? { ...s, note: note || null } : s))
    setEditing(null)
    await fetch('/api/dev/work-sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id, note }),
    }).catch(() => null)
  }

  const liveSeconds = open ? sessionSeconds(open, nowMs) : 0

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">Execution · Zeiterfassung</p>
          <h1>Zeiterfassung</h1>
          <p className="meta">Erfasste Zeit pro Aufgabe. Bleibt intern — Veyra nutzt sie als Aktivitätssignal, nicht als Abrechnungsbühne.</p>
        </div>
        <button type="button" className="dev-secondary-btn" onClick={load} disabled={loading}>
          <ArrowClockwise size={14} weight="regular" /> {loading ? 'Lade…' : 'Aktualisieren'}
        </button>
      </header>

      {/* KPIs */}
      <div className="dev-kpi-grid tt-kpis">
        <div className="dev-kpi dev-surface"><strong>{fmtDur(totals.today)}</strong><span>Heute</span></div>
        <div className="dev-kpi dev-surface"><strong>{fmtDur(totals.week)}</strong><span>Diese Woche</span></div>
        <div className="dev-kpi dev-surface"><strong>{totals.count}</strong><span>Sitzungen gesamt</span></div>
        <div className="dev-kpi dev-surface"><strong>{open ? 'Aktiv' : '—'}</strong><span>{open ? 'Timer läuft' : 'Kein Timer'}</span></div>
      </div>

      {/* Active session / start control */}
      {open ? (
        <section className="tt-active dev-surface">
          <div className="tt-active-pulse"><span /></div>
          <div className="tt-active-main">
            <p className="tt-active-label">Läuft für</p>
            <p className="tt-active-task">{taskTitle(open.task_id)}</p>
            {open.project_id && projectsById.get(open.project_id) && (
              <span className="tt-proj">
                <span className="tt-proj-dot" style={{ background: projectsById.get(open.project_id)!.color || 'var(--text-muted)' }} />
                {projectsById.get(open.project_id)!.title}
              </span>
            )}
          </div>
          <div className="tt-active-timer">{fmtClock(liveSeconds)}</div>
          <button type="button" className="tt-stop" onClick={() => stopTimer(open.id)} disabled={busy}>
            <Pause size={14} weight="fill" /> Stoppen
          </button>
        </section>
      ) : (
        <section className="tt-start dev-surface">
          <Clock size={16} weight="regular" className="tt-start-icon" />
          <select className="tt-select" value={pickTask} onChange={e => setPickTask(e.target.value)} disabled={openTasks.length === 0}>
            <option value="">{openTasks.length === 0 ? 'Keine offenen Aufgaben' : 'Aufgabe wählen…'}</option>
            {openTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}{t.project_id && projectsById.get(t.project_id) ? ` · ${projectsById.get(t.project_id)!.title}` : ''}
              </option>
            ))}
          </select>
          <button type="button" className="dev-primary-btn" onClick={startTimer} disabled={!pickTask || busy}>
            <Play size={13} weight="fill" /> Timer starten
          </button>
        </section>
      )}

      {/* History */}
      <p className="dev-section-title" style={{ marginTop: 22 }}>Verlauf</p>
      {loading ? (
        <p className="tt-muted">Lade Zeiteinträge…</p>
      ) : sessions.length === 0 ? (
        <div className="tt-empty dev-surface">
          <Clock size={20} weight="regular" />
          <p><strong>Noch keine Zeit erfasst.</strong></p>
          <p>Starte einen Timer für eine Aufgabe — oder starte ihn direkt aus der <Link href="/dev/tasks">Aufgabenliste</Link>.</p>
        </div>
      ) : (
        <div className="tt-days">
          {grouped.map(([ts, list]) => {
            const dayTotal = list.reduce((acc, s) => acc + sessionSeconds(s, nowMs), 0)
            return (
              <div key={ts} className="tt-day">
                <div className="tt-day-head">
                  <span className="tt-day-label">{dayLabel(ts)}</span>
                  <span className="tt-day-total">{fmtDur(dayTotal)}</span>
                </div>
                <div className="tt-rows">
                  {list.map(s => {
                    const proj = s.project_id ? projectsById.get(s.project_id) : null
                    const secs = sessionSeconds(s, nowMs)
                    const running = !s.ended_at
                    return (
                      <div key={s.id} className={`tt-row${running ? ' running' : ''}`}>
                        <div className="tt-row-main">
                          <p className="tt-row-task">{taskTitle(s.task_id)}</p>
                          <div className="tt-row-meta">
                            {proj && (
                              <span className="tt-proj sm">
                                <span className="tt-proj-dot" style={{ background: proj.color || 'var(--text-muted)' }} />
                                {proj.title}
                              </span>
                            )}
                            <span className="tt-range">{fmtTime(s.started_at)}{s.ended_at ? `–${fmtTime(s.ended_at)}` : ' · läuft'}</span>
                          </div>
                          {editing === s.id ? (
                            <div className="tt-note-edit">
                              <input
                                ref={noteRef}
                                value={editNote}
                                onChange={e => setEditNote(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveNote(s.id); if (e.key === 'Escape') setEditing(null) }}
                                placeholder="Notiz zur Sitzung…"
                              />
                              <button type="button" onClick={() => saveNote(s.id)} aria-label="Speichern"><Check size={13} /></button>
                              <button type="button" onClick={() => setEditing(null)} aria-label="Abbrechen"><X size={13} /></button>
                            </div>
                          ) : s.note ? (
                            <button type="button" className="tt-note" onClick={() => { setEditing(s.id); setEditNote(s.note ?? '') }}>
                              {s.note} <PencilSimple size={11} />
                            </button>
                          ) : (
                            <button type="button" className="tt-note add" onClick={() => { setEditing(s.id); setEditNote('') }}>
                              <PencilSimple size={11} /> Notiz
                            </button>
                          )}
                        </div>
                        <div className={`tt-row-dur${running ? ' running' : ''}`}>{running ? fmtClock(secs) : fmtDur(secs)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .tt-kpis { margin-bottom: 16px; }

        .tt-active {
          display: flex; align-items: center; gap: 14px; padding: 15px 16px; margin-bottom: 8px;
          border-color: color-mix(in srgb, var(--red) 45%, var(--border));
          background: color-mix(in srgb, var(--red) 7%, var(--surface));
        }
        .tt-active-pulse span {
          display: block; width: 10px; height: 10px; border-radius: 50%;
          background: var(--red); box-shadow: 0 0 0 0 color-mix(in srgb, var(--red) 60%, transparent);
          animation: ttpulse 1.6s infinite;
        }
        @keyframes ttpulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--red) 55%, transparent); } 70% { box-shadow: 0 0 0 9px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        .tt-active-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .tt-active-label { margin: 0; font-size: 11px; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
        .tt-active-task { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tt-active-timer { font-size: 26px; font-weight: 500; letter-spacing: -.01em; color: var(--red); font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; }
        .tt-stop {
          flex-shrink: 0; height: 36px; padding: 0 14px; border-radius: 8px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--red); color: #fff; border: 1px solid var(--red);
          font: inherit; font-size: 12.5px; font-weight: 500;
        }
        .tt-stop:hover:not(:disabled) { background: color-mix(in srgb, var(--red) 85%, #000); }
        .tt-stop:disabled { opacity: .6; cursor: not-allowed; }

        .tt-start { display: flex; align-items: center; gap: 10px; padding: 13px 14px; margin-bottom: 8px; }
        .tt-start-icon { color: var(--text-secondary); flex-shrink: 0; }
        .tt-select {
          flex: 1; min-width: 0; height: 36px; padding: 0 11px; border-radius: 8px;
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
          font: inherit; font-size: 13px; cursor: pointer; outline: none;
        }
        .tt-select:focus { border-color: var(--accent); }
        .tt-start :global(.dev-primary-btn) { flex-shrink: 0; }

        .tt-muted { color: var(--text-muted); font-size: 12.5px; padding: 6px 2px; }
        .tt-empty {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 38px 20px; text-align: center; color: var(--text-muted); font-size: 12.5px; line-height: 1.55;
        }
        .tt-empty strong { color: var(--text); font-size: 14px; }
        .tt-empty :global(a) { color: var(--accent); }

        .tt-days { display: flex; flex-direction: column; gap: 16px; }
        .tt-day-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 7px; padding: 0 2px; }
        .tt-day-label { font-size: 12px; font-weight: 500; color: var(--text); letter-spacing: var(--ls-body, .017em); }
        .tt-day-total { font-size: 12px; font-weight: 500; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
        .tt-rows { display: flex; flex-direction: column; gap: 6px; }
        .tt-row {
          display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent); background: var(--surface);
        }
        .tt-row.running { border-color: color-mix(in srgb, var(--red) 40%, var(--border)); }
        .tt-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .tt-row-task { margin: 0; font-size: 13px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tt-row-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .tt-proj { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); font-weight: 500; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tt-proj.sm { font-size: 11px; }
        .tt-proj-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .tt-range { font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .tt-note {
          display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
          background: transparent; border: 0; padding: 1px 0; cursor: pointer;
          font: inherit; font-size: 11.5px; color: var(--text-secondary); letter-spacing: var(--ls-body, .017em);
          text-align: left;
        }
        .tt-note :global(svg) { color: var(--text-muted); opacity: 0; transition: opacity .12s ease; }
        .tt-note:hover :global(svg) { opacity: 1; }
        .tt-note.add { color: var(--text-muted); }
        .tt-note.add :global(svg) { opacity: 1; }
        .tt-note-edit { display: flex; align-items: center; gap: 6px; align-self: stretch; }
        .tt-note-edit input {
          flex: 1; min-width: 0; height: 28px; padding: 0 9px; border-radius: 7px;
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
          font: inherit; font-size: 12px; outline: none;
        }
        .tt-note-edit input:focus { border-color: var(--accent); }
        .tt-note-edit button {
          width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);
        }
        .tt-note-edit button:hover { color: var(--text); }
        .tt-row-dur { font-size: 13px; font-weight: 500; color: var(--text-secondary); font-variant-numeric: tabular-nums; flex-shrink: 0; }
        .tt-row-dur.running { color: var(--red); font-family: ui-monospace, monospace; }

        @media (max-width: 640px) {
          .tt-active { flex-wrap: wrap; }
          .tt-active-timer { order: 3; }
          .tt-stop { order: 4; margin-left: auto; }
          .tt-start { flex-wrap: wrap; }
          .tt-start .tt-select { flex-basis: 100%; }
          .tt-start :global(.dev-primary-btn) { flex: 1; }
        }
      `}</style>
    </div>
  )
}
