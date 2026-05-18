'use client'

/**
 * /dev/tasks — der zentrale Arbeitsbereich für den Developer.
 *
 * Eine Sicht, drei Layer übereinander:
 *   1. Tagro-Hierarchie  — Tasks bevorzugt zusammengefasst über parent_task_id
 *      (Tagro zerlegt Briefings in atomare Sub-Tasks).
 *   2. Status-Flow       — todo → accepted → in_progress → review → done
 *      (mit Sonderpfad blocked / cancelled). Setzen geht über /api/dev/tasks/status,
 *      damit gleichzeitig die client_status-Spiegelung & developer_updates passieren.
 *   3. GitHub-Bindung    — pro Task: Liste der verknüpften Commits/PRs.
 *      Branch-Name kann hinterlegt + per Klick ans Clipboard kopiert werden.
 *
 * Plus: Work-Session Timer (start/stop), live Restzeit, Notiz.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowsClockwise, CheckSquare, GitBranch, GitCommit, GitPullRequest,
  PaperPlaneTilt, Pause, Play, PlusCircle, Sparkle, WarningCircle, X, Copy,
} from '@phosphor-icons/react'

type Task = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  dev_status?: string | null
  client_status?: string | null
  priority?: string | null
  project_id?: string | null
  parent_task_id?: string | null
  assigned_to?: string | null
  estimated_hours?: number | null
  acceptance_criteria?: string[] | null
  branch_name?: string | null
  dev_description?: string | null
  client_description?: string | null
  group_key?: string | null
  task_type?: string | null
  last_dev_action_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  projects?: { title?: string | null; color?: string | null } | null
}

type Commit = {
  id: string; repo_id: string; commit_sha: string; message: string | null
  author_name: string | null; commit_url: string | null; committed_at: string | null
  task_id: string | null; branch_name: string | null
}
type Pull = {
  id: string; repo_id: string; pr_number: number; title: string | null
  state: string | null; merged: boolean | null; pr_url: string | null
  head_branch: string | null; base_branch: string | null
  updated_at_github: string | null; merged_at: string | null
  task_id: string | null
}
type Session = {
  id: string; task_id: string | null; project_id: string | null
  started_at: string; ended_at: string | null; duration_seconds: number | null
  note: string | null
}

const DEV_STEPS = [
  { id: 'todo',        label: 'Geplant' },
  { id: 'accepted',    label: 'Angenommen' },
  { id: 'in_progress', label: 'In Arbeit' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Erledigt' },
] as const
type DevStatus = typeof DEV_STEPS[number]['id'] | 'blocked' | 'cancelled'

function devStatusOf(t: Task): DevStatus {
  const v = String(t.dev_status || t.status || 'todo').toLowerCase()
  if (v === 'done' || v === 'completed') return 'done'
  if (v === 'review' || v === 'ready_review' || v === 'ready_for_review' || v === 'in_review') return 'review'
  if (v === 'blocked' || v === 'waiting') return 'blocked'
  if (v === 'in_progress' || v === 'doing' || v === 'active') return 'in_progress'
  if (v === 'accepted') return 'accepted'
  if (v === 'cancelled') return 'cancelled'
  return 'todo'
}
function statusLabel(s: DevStatus) {
  if (s === 'blocked') return 'Blockiert'
  if (s === 'cancelled') return 'Abgebrochen'
  return DEV_STEPS.find(x => x.id === s)?.label ?? 'Geplant'
}
function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high') return 'Hoch'
  if (p === 'low') return 'Niedrig'
  return 'Mittel'
}
function dateLabel(v?: string | null) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(v)) }
  catch { return '—' }
}
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56)
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2,'0')}s`
  return `${sec}s`
}

export default function DevTasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'mine'|'all'|'open'|'review'|'blocked'>('mine')

  const [commits, setCommits] = useState<Commit[]>([])
  const [pulls, setPulls] = useState<Pull[]>([])
  const [openSession, setOpenSession] = useState<Session | null>(null)
  const [taskSessions, setTaskSessions] = useState<Session[]>([])
  const [tick, setTick] = useState(0)

  const [devNote, setDevNote] = useState('')
  const [blockerDesc, setBlockerDesc] = useState('')
  const [branchInput, setBranchInput] = useState('')
  const [linkingCommit, setLinkingCommit] = useState<string | null>(null)
  const [copyOk, setCopyOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Initial load (tasks + my open session). Auto-open drawer when URL ?id=…
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      await reload(session.user.id, 'mine')
      // open session?
      try {
        const res = await fetch('/api/dev/work-sessions?open=1&limit=1')
        const d = await res.json().catch(() => ({}))
        if (!cancelled) setOpenSession(d?.sessions?.[0] ?? null)
      } catch { /* noop */ }
      // deep-link to a task
      try {
        const url = new URL(window.location.href)
        const id = url.searchParams.get('id')
        if (id && !cancelled) setSelectedId(id)
      } catch { /* noop */ }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ticking timer for the open session
  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [openSession])

  async function reload(uid: string | null = userId, nextFilter = filter) {
    if (!uid) return
    setLoading(true)
    const projAssign = await supabase
      .from('project_assignments')
      .select('project_id').eq('user_id', uid).eq('active', true)
    const projectIds = ((projAssign.data as any[]) ?? []).map(r => r.project_id).filter(Boolean)

    let q = supabase
      .from('tasks')
      .select('id,title,description,status,dev_status,client_status,priority,project_id,parent_task_id,assigned_to,estimated_hours,acceptance_criteria,branch_name,dev_description,client_description,group_key,task_type,last_dev_action_at,updated_at,completed_at,projects(title,color)')
      .order('last_dev_action_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(200)

    if (nextFilter === 'mine')    q = q.eq('assigned_to', uid)
    if (nextFilter === 'open')    q = q.in('dev_status', ['todo','accepted','in_progress'])
    if (nextFilter === 'review')  q = q.in('dev_status', ['review'])
    if (nextFilter === 'blocked') q = q.eq('dev_status', 'blocked')
    if (nextFilter === 'all' && projectIds.length > 0) {
      q = q.or(`assigned_to.eq.${uid},project_id.in.(${projectIds.join(',')})`)
    } else if (nextFilter === 'all') {
      q = q.eq('assigned_to', uid)
    }

    const { data } = await q
    setTasks((data as Task[] | null) ?? [])
    setLoading(false)
  }

  // load github activity when drawer opens
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    ;(async () => {
      try {
        const [actRes, sessRes] = await Promise.all([
          fetch(`/api/github/activity?taskId=${selectedId}&limit=20`),
          fetch(`/api/dev/work-sessions?taskId=${selectedId}&limit=10`),
        ])
        const act = await actRes.json().catch(() => ({}))
        const sess = await sessRes.json().catch(() => ({}))
        if (cancelled) return
        setCommits(act?.commits ?? [])
        setPulls(act?.pulls ?? [])
        setTaskSessions(sess?.sessions ?? [])
      } catch { /* noop */ }
    })()
    return () => { cancelled = true }
  }, [selectedId])

  const selected = tasks.find(t => t.id === selectedId) || null

  useEffect(() => {
    if (!selected) return
    setDevNote('')
    setBlockerDesc('')
    setBranchInput(selected.branch_name || suggestBranch(selected))
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  function suggestBranch(t: Task) {
    const slug = slugify(t.title || 'task')
    const short = t.id.slice(0, 8)
    return `feature/${slug}-${short}`
  }

  function setFilterAndReload(f: typeof filter) {
    setFilter(f); reload(userId, f)
  }

  async function setStatus(devStatus: DevStatus) {
    if (!selected) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selected.id,
          devStatus,
          devNote: devNote.trim() || undefined,
          blockerDescription: devStatus === 'blocked' ? (blockerDesc.trim() || undefined) : undefined,
          branchName: branchInput.trim() || undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Status konnte nicht gesetzt werden.'); return }
      setTasks(prev => prev.map(t => t.id === selected.id
        ? { ...t, dev_status: devStatus, status: d?.task?.status ?? t.status, branch_name: branchInput.trim() || null, last_dev_action_at: new Date().toISOString() }
        : t))
      setDevNote('')
      setBlockerDesc('')
      setToast(`Status: ${statusLabel(devStatus)}.`)
    } finally {
      setBusy(false)
    }
  }

  async function claim() {
    if (!selected || !userId) return
    setBusy(true)
    try {
      await supabase.from('tasks').update({
        assigned_to: userId,
        dev_status: 'accepted',
        last_dev_action_at: new Date().toISOString(),
      }).eq('id', selected.id)
      setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, assigned_to: userId, dev_status: 'accepted' } : t))
      setToast('Task übernommen.')
    } finally { setBusy(false) }
  }

  async function startSession() {
    if (!selected) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/work-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Timer konnte nicht gestartet werden.'); return }
      setOpenSession(d.session ?? null)
      setTaskSessions(prev => d.session ? [d.session, ...prev] : prev)
      setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, dev_status: 'in_progress' } : t))
      setToast('Timer gestartet.')
    } finally { setBusy(false) }
  }

  async function stopSession(note?: string) {
    if (!openSession) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/work-sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: openSession.id, end: true, note }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Timer konnte nicht gestoppt werden.'); return }
      setOpenSession(null)
      if (d.session) setTaskSessions(prev => [d.session, ...prev.filter(s => s.id !== d.session.id)])
      setToast('Timer gestoppt.')
    } finally { setBusy(false) }
  }

  async function linkCommit(commitId: string, taskId: string | null) {
    setLinkingCommit(commitId)
    try {
      const res = await fetch('/api/github/commits/link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitId, taskId }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Verknüpfung fehlgeschlagen.'); return }
      setCommits(prev => prev.map(c => c.id === commitId ? { ...c, task_id: taskId } : c))
    } finally { setLinkingCommit(null) }
  }

  async function copyBranch() {
    if (!branchInput) return
    try {
      await navigator.clipboard.writeText(branchInput)
      setCopyOk(branchInput); setTimeout(() => setCopyOk(null), 1400)
    } catch { /* noop */ }
  }

  const counts = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter(t => devStatusOf(t) === 'in_progress').length,
      review: tasks.filter(t => devStatusOf(t) === 'review').length,
      blocked: tasks.filter(t => devStatusOf(t) === 'blocked').length,
      open: tasks.filter(t => !['done','cancelled'].includes(devStatusOf(t))).length,
    }
  }, [tasks])

  // Group tasks: parent first, then children indented
  const orderedTasks = useMemo(() => {
    const byId = new Map(tasks.map(t => [t.id, t]))
    const parents = tasks.filter(t => !t.parent_task_id || !byId.has(t.parent_task_id!))
    const children = new Map<string, Task[]>()
    for (const t of tasks) {
      if (t.parent_task_id && byId.has(t.parent_task_id)) {
        const arr = children.get(t.parent_task_id) || []
        arr.push(t)
        children.set(t.parent_task_id, arr)
      }
    }
    const out: Array<Task & { _depth: number }> = []
    for (const p of parents) {
      out.push({ ...p, _depth: 0 })
      const kids = children.get(p.id) || []
      for (const k of kids) out.push({ ...k, _depth: 1 })
    }
    return out
  }, [tasks])

  const liveSessionSeconds = openSession
    ? Math.max(0, Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 1000))
    : 0
  void tick // re-render the seconds counter

  return (
    <div className="dev-page">
      <header className="dev-page-header compact">
        <div>
          <p className="dev-eyebrow">DEV · My Tasks</p>
          <h1>Arbeitsbereich.</h1>
          <p className="meta">
            {counts.open} offen · {counts.active} aktiv · {counts.review} Review · {counts.blocked} blockiert
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {openSession && selected && openSession.task_id === selected.id ? (
            <button className="dev-primary-btn" onClick={() => stopSession()} disabled={busy}>
              <Pause size={13} style={{ marginRight: 6 }} />
              Stop · {formatDuration(liveSessionSeconds)}
            </button>
          ) : null}
          <button className="dev-secondary-btn" onClick={() => reload()}>
            <ArrowsClockwise size={13} style={{ marginRight: 6 }} /> Refresh
          </button>
        </div>
      </header>

      <div className="task-toolbar">
        <div className="task-filters">
          {(['mine','open','review','blocked','all'] as const).map(f => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilterAndReload(f)}>
              {f === 'mine' ? 'Meine' : f === 'open' ? 'Offen' : f === 'review' ? 'Review' : f === 'blocked' ? 'Blocker' : 'Alle'}
            </button>
          ))}
        </div>
        {openSession ? (
          <span className="dev-chip running">
            <Play size={11} weight="fill" /> Timer läuft · {formatDuration(liveSessionSeconds)}
            {openSession.task_id && tasks.find(t => t.id === openSession.task_id) ? ` · ${tasks.find(t => t.id === openSession.task_id)!.title}` : ''}
          </span>
        ) : (
          <span className="dev-chip">Kein aktiver Timer</span>
        )}
      </div>

      <section className="task-board dev-surface">
        <div className="task-head">
          <span>Task</span><span>Projekt</span><span>Status</span><span>Priorität</span><span>Letzte Aktion</span>
        </div>
        {loading ? (
          <p className="empty">Tasks werden geladen…</p>
        ) : orderedTasks.length === 0 ? (
          <p className="empty">Keine Tasks in dieser Sicht. Wechsle den Filter oder lass Tagro neue Aufgaben aus einem Briefing zerlegen.</p>
        ) : orderedTasks.map((t) => {
          const s = devStatusOf(t)
          return (
            <button
              key={t.id}
              className={`task-row depth-${t._depth} status-${s}`}
              onClick={() => setSelectedId(t.id)}
            >
              <span className={`task-dot ${s}`} />
              <div className="task-title">
                {t._depth > 0 && <span className="subtask-marker">↳</span>}
                <strong>{t.title}</strong>
                <small>
                  {t.group_key || t.task_type || 'Task'}
                  {t.estimated_hours ? ` · ~${t.estimated_hours}h` : ''}
                  {t.branch_name ? ` · ${t.branch_name}` : ''}
                </small>
              </div>
              <span>{t.projects?.title || 'kein Projekt'}</span>
              <span className="dev-chip">{statusLabel(s)}</span>
              <span>{priorityLabel(t.priority)}</span>
              <span className="muted-meta">{dateLabel(t.last_dev_action_at || t.updated_at)}</span>
            </button>
          )
        })}
      </section>

      {selected && (
        <div className="task-drawer" role="dialog" aria-modal="true">
          <button className="drawer-backdrop" onClick={() => setSelectedId(null)} aria-label="Schließen" />
          <aside className="drawer-panel">
            <div className="drawer-top">
              <div>
                <p className="dev-eyebrow">Dev Task</p>
                <h2>{selected.title}</h2>
                <p className="drawer-sub">
                  {selected.projects?.title || 'kein Projekt'}
                  {' · '}{statusLabel(devStatusOf(selected))}
                  {' · '}{priorityLabel(selected.priority)}
                </p>
              </div>
              <button className="icon-close" onClick={() => setSelectedId(null)}><X size={18} /></button>
            </div>

            {/* Tagro decomposition / description */}
            <section className="block">
              <p className="dev-section-title">Beschreibung</p>
              <p className="block-text">
                {selected.dev_description || selected.description ||
                  'Keine Dev-Beschreibung. Tagro hat diese Task ohne weitere Decomposition übergeben — du kannst direkt loslegen oder eine Rückfrage als Blocker eintragen.'}
              </p>
              {!!selected.acceptance_criteria?.length && (
                <ul className="ac-list">
                  {selected.acceptance_criteria.map((c, i) => (
                    <li key={i}><CheckSquare size={13} weight="regular" /> <span>{c}</span></li>
                  ))}
                </ul>
              )}
            </section>

            {/* Status flow */}
            <section className="block">
              <p className="dev-section-title">Status</p>
              <div className="step-bar">
                {DEV_STEPS.map(step => {
                  const cur = devStatusOf(selected)
                  const idx = DEV_STEPS.findIndex(x => x.id === cur)
                  const my = DEV_STEPS.findIndex(x => x.id === step.id)
                  const reached = my <= Math.max(0, idx)
                  return (
                    <button key={step.id} className={`step ${reached ? 'reached' : ''} ${cur === step.id ? 'current' : ''}`}
                      onClick={() => setStatus(step.id as DevStatus)} disabled={busy}>
                      <span className="dot" />
                      <span>{step.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="extra-actions">
                <button className="dev-secondary-btn warn" onClick={() => setStatus('blocked')} disabled={busy}>
                  <WarningCircle size={13} /> Blocker
                </button>
                {devStatusOf(selected) !== 'done' && (
                  <button className="dev-secondary-btn" onClick={() => setStatus('cancelled')} disabled={busy}>
                    <X size={13} /> Abbrechen
                  </button>
                )}
                {selected.assigned_to !== userId && (
                  <button className="dev-primary-btn" onClick={claim} disabled={busy}>
                    <PlusCircle size={13} /> Übernehmen
                  </button>
                )}
              </div>
            </section>

            {/* Branch + Timer */}
            <section className="block grid-2">
              <div>
                <p className="dev-section-title">Branch</p>
                <div className="branch-input">
                  <GitBranch size={14} />
                  <input value={branchInput} onChange={e => setBranchInput(e.target.value)} placeholder="feature/…"/>
                  <button onClick={copyBranch} title="Kopieren"><Copy size={13} /></button>
                </div>
                {copyOk && <p className="copy-hint">In Zwischenablage: {copyOk}</p>}
              </div>
              <div>
                <p className="dev-section-title">Work Session</p>
                {openSession && openSession.task_id === selected.id ? (
                  <button className="timer-btn stop" onClick={() => stopSession()} disabled={busy}>
                    <Pause size={14} /> Stop · {formatDuration(liveSessionSeconds)}
                  </button>
                ) : openSession ? (
                  <p className="timer-hint">
                    Aktive Session läuft auf anderer Task — Start hier schließt die aktuelle automatisch.
                    <button className="link" onClick={startSession} disabled={busy}>Hier starten</button>
                  </p>
                ) : (
                  <button className="timer-btn" onClick={startSession} disabled={busy}>
                    <Play size={14} weight="fill" /> Timer starten
                  </button>
                )}
                {taskSessions.length > 0 && (
                  <p className="timer-hint" style={{ marginTop: 8 }}>
                    Heute aufsummiert: {formatDuration(
                      taskSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
                      + (openSession && openSession.task_id === selected.id ? liveSessionSeconds : 0),
                    )}
                  </p>
                )}
              </div>
            </section>

            {/* Dev note → Tagro mirror */}
            <section className="block">
              <p className="dev-section-title">Dev-Notiz für Tagro</p>
              <textarea value={devNote} onChange={e => setDevNote(e.target.value)}
                placeholder="Was hast du gerade gemacht? Tagro übersetzt das ins Client-Update." />
              {devStatusOf(selected) === 'blocked' && (
                <input value={blockerDesc} onChange={e => setBlockerDesc(e.target.value)}
                  placeholder="Worauf wartet die Arbeit (Decision, Asset, Auth …)?"
                  className="blocker-input"/>
              )}
              <div className="row-actions">
                <button className="dev-primary-btn" disabled={busy} onClick={() => setStatus(devStatusOf(selected))}>
                  <PaperPlaneTilt size={13} /> Notiz speichern
                </button>
              </div>
            </section>

            {/* GitHub bindings */}
            <section className="block">
              <p className="dev-section-title">GitHub</p>
              {commits.length === 0 && pulls.length === 0 ? (
                <p className="block-empty">Noch keine Aktivität verknüpft. Wenn du einen Commit pushst, der „task:{selected.id.slice(0, 8)}…" oder den Branch-Namen erwähnt, ordnet Tagro ihn automatisch zu.</p>
              ) : null}
              {commits.length > 0 && (
                <ul className="gh-list">
                  {commits.map(c => (
                    <li key={c.id}>
                      <GitCommit size={13} />
                      <div className="gh-text">
                        <a href={c.commit_url || '#'} target="_blank" rel="noreferrer">
                          {(c.message || c.commit_sha).split('\n')[0].slice(0, 80)}
                        </a>
                        <small>{c.commit_sha.slice(0, 8)} · {c.author_name || 'unbekannt'} · {dateLabel(c.committed_at)}</small>
                      </div>
                      <button
                        className="dev-chip link-chip"
                        onClick={() => linkCommit(c.id, c.task_id === selected.id ? null : selected.id)}
                        disabled={linkingCommit === c.id}
                      >
                        {c.task_id === selected.id ? 'verknüpft' : 'verknüpfen'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pulls.length > 0 && (
                <ul className="gh-list">
                  {pulls.map(p => (
                    <li key={p.id}>
                      <GitPullRequest size={13} />
                      <div className="gh-text">
                        <a href={p.pr_url || '#'} target="_blank" rel="noreferrer">
                          #{p.pr_number} {p.title}
                        </a>
                        <small>
                          {p.state === 'open' ? 'open' : p.merged ? 'merged' : 'closed'} · {p.head_branch} → {p.base_branch}
                          {' · '}{dateLabel(p.updated_at_github)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="drawer-foot">
              Tagro spiegelt diese Notizen verständlich ins Client Board. Du behältst die Rohdaten — der Client sieht die verständliche Ableitung.
            </p>
          </aside>
        </div>
      )}

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast(null)} role="status">
          <Sparkle size={12} /> {toast}
        </div>
      )}

      <style jsx>{`
        .compact { margin-bottom: 18px; }
        .task-toolbar { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
        .task-filters { display:flex; gap:6px; }
        .task-filters button {
          height:28px; padding:0 12px; border-radius:999px;
          border:1px solid var(--border); background:transparent; color:var(--text-muted);
          font:inherit; font-size:12px; font-weight:500; cursor:pointer;
          transition:background .15s ease, color .15s ease;
        }
        .task-filters button.on, .task-filters button:hover { color:var(--text); background:var(--surface-2); }
        .dev-chip.running { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
        .task-board { padding:6px; }
        .task-head {
          display:grid;
          grid-template-columns: minmax(280px,1.5fr) minmax(140px,.85fr) 120px 90px 130px;
          gap:12px;
          padding:10px 12px 8px 38px;
          color:var(--text-muted); font-size:10.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
        }
        .task-row {
          width:100%; text-align:left; border:0; background:transparent; color:var(--text);
          font:inherit;
          display:grid;
          grid-template-columns: 12px minmax(280px,1.5fr) minmax(140px,.85fr) 120px 90px 130px;
          align-items:center; gap:12px;
          min-height:54px; padding:8px 12px; border-radius:9px; cursor:pointer;
          transition:background .12s ease;
          border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }
        .task-row:first-of-type { border-top:0; }
        .task-row:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .task-row.depth-1 { padding-left:32px; }
        .task-row.depth-1 .task-title strong { font-size:12.5px; color:var(--text-secondary); }
        .subtask-marker { color:var(--text-muted); margin-right:4px; }
        .task-title { min-width:0; }
        .task-title strong { display:block; font-size:13px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .task-title small { display:block; margin-top:2px; color:var(--text-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .task-dot { width:7px; height:7px; border-radius:50%; background:var(--text-muted); }
        .task-dot.in_progress { background:#22c55e; }
        .task-dot.review { background:#f59e0b; }
        .task-dot.blocked { background:#ef4444; }
        .task-dot.done { background:#64748b; }
        .task-dot.accepted { background:var(--accent); }
        .muted-meta { color:var(--text-muted); font-size:11.5px; }
        .empty { padding:30px; text-align:center; color:var(--text-muted); font-size:12.5px; }

        /* Drawer */
        .task-drawer { position:fixed; inset:0; z-index:9000; display:flex; justify-content:flex-end; }
        .drawer-backdrop { flex:1; border:0; background:rgba(0,0,0,.28); backdrop-filter:blur(2px); cursor:pointer; }
        .drawer-panel {
          width:min(560px, 100vw); height:100%; overflow:auto;
          background:var(--bg); border-left:1px solid var(--border);
          padding:24px 22px 40px;
          box-shadow:-22px 0 70px rgba(0,0,0,.16);
          display:flex; flex-direction:column; gap:18px;
        }
        .drawer-top { display:flex; justify-content:space-between; gap:14px; }
        .drawer-top h2 { margin:4px 0 0; font-size:19px; line-height:1.2; font-weight:500; letter-spacing:-.012em; }
        .drawer-sub { margin:4px 0 0; font-size:11.5px; color:var(--text-muted); }
        .icon-close { border:0; background:transparent; color:var(--text-muted); width:28px; height:28px; border-radius:7px; cursor:pointer; }
        .icon-close:hover { background:var(--surface-2); color:var(--text); }

        .block { display:flex; flex-direction:column; gap:8px; }
        .block.grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .block-text { margin:0; font-size:13px; line-height:1.55; color:var(--text-secondary); white-space:pre-wrap; }
        .block-empty { margin:0; font-size:12px; color:var(--text-muted); line-height:1.5; }
        .ac-list { list-style:none; margin:6px 0 0; padding:0; display:flex; flex-direction:column; gap:6px; }
        .ac-list li { display:flex; gap:7px; align-items:flex-start; font-size:12.5px; color:var(--text-secondary); line-height:1.45; }
        .ac-list svg { color:var(--accent); margin-top:1px; flex:0 0 auto; }

        /* Step bar */
        .step-bar { display:flex; gap:4px; flex-wrap:wrap; }
        .step {
          display:inline-flex; align-items:center; gap:6px;
          height:28px; padding:0 11px; border-radius:999px;
          border:1px solid var(--border); background:transparent;
          color:var(--text-muted); font:inherit; font-size:11.5px; font-weight:500;
          cursor:pointer;
        }
        .step .dot { width:6px; height:6px; border-radius:50%; background:var(--text-muted); }
        .step.reached { color:var(--text); }
        .step.reached .dot { background:var(--accent); }
        .step.current { background:var(--surface-2); border-color:color-mix(in srgb, var(--accent) 35%, transparent); }
        .step:disabled { opacity:.5; cursor:default; }
        .extra-actions { display:flex; gap:7px; margin-top:6px; flex-wrap:wrap; }
        .extra-actions .warn { color:#dc2626; border-color: color-mix(in srgb, #ef4444 40%, var(--border)); }

        /* Branch + Timer */
        .branch-input {
          display:flex; align-items:center; gap:8px;
          border:1px solid var(--border); border-radius:8px; padding:6px 9px;
          background:transparent;
        }
        .branch-input input {
          flex:1; border:0; outline:0; background:transparent; color:var(--text);
          font:inherit; font-size:12.5px;
        }
        .branch-input button {
          border:0; background:transparent; color:var(--text-muted); cursor:pointer;
          padding:3px 6px; border-radius:6px;
        }
        .branch-input button:hover { background:var(--surface-2); color:var(--text); }
        .copy-hint { margin:5px 0 0; font-size:11px; color:var(--accent); }
        .timer-btn {
          display:inline-flex; align-items:center; gap:7px;
          height:32px; padding:0 12px; border-radius:8px;
          border:1px solid var(--border); background:transparent; color:var(--text);
          font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;
        }
        .timer-btn:hover { background:var(--surface-2); }
        .timer-btn.stop { color:#dc2626; border-color: color-mix(in srgb, #ef4444 40%, var(--border)); }
        .timer-hint { margin:0; font-size:11.5px; color:var(--text-muted); line-height:1.4; }
        .timer-hint .link { border:0; background:transparent; color:var(--accent); padding:0; font:inherit; cursor:pointer; margin-left:6px; }

        /* Notes */
        textarea {
          width:100%; min-height:80px; resize:vertical;
          background:var(--surface-2); border:1px solid var(--border); border-radius:8px;
          padding:10px 11px; font:inherit; font-size:13px; color:var(--text);
          line-height:1.55;
        }
        .blocker-input {
          width:100%; background:transparent; border:1px solid var(--border); border-radius:8px;
          padding:7px 10px; font:inherit; font-size:12.5px; color:var(--text); margin-top:6px;
        }
        .row-actions { display:flex; justify-content:flex-end; gap:7px; margin-top:6px; }

        /* GitHub list */
        .gh-list { list-style:none; padding:0; margin:8px 0 0; display:flex; flex-direction:column; gap:6px; }
        .gh-list li {
          display:grid; grid-template-columns: 18px 1fr auto; gap:10px; align-items:center;
          padding:7px 9px; border-radius:7px;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          font-size:12.5px;
        }
        .gh-list svg { color:var(--text-muted); }
        .gh-text { min-width:0; }
        .gh-text a { color:var(--text); text-decoration:none; font-weight:500; }
        .gh-text a:hover { text-decoration:underline; }
        .gh-text small { display:block; color:var(--text-muted); font-size:11px; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .link-chip { cursor:pointer; }
        .link-chip:disabled { opacity:.5; cursor:default; }

        .drawer-foot { margin:8px 0 0; font-size:11px; color:var(--text-muted); line-height:1.5; }

        /* Toast */
        .toast {
          position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
          background:var(--text); color:var(--bg);
          padding:8px 14px; border-radius:999px;
          font-size:12px; font-weight:500;
          display:inline-flex; align-items:center; gap:7px;
          animation: toast-in .25s ease-out both, toast-out .4s 1.8s forwards;
          z-index:9999;
        }
        @keyframes toast-in { from { transform:translate(-50%, 12px); opacity:0; } to { opacity:1; transform:translate(-50%,0);} }
        @keyframes toast-out { to { opacity:0; transform:translate(-50%, 8px); } }

        @media (max-width: 980px) {
          .task-head { display:none; }
          .task-row {
            grid-template-columns: 12px 1fr auto;
            row-gap: 4px;
          }
          .task-row > span:not(.task-dot):not(.dev-chip) { display:none; }
          .block.grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
