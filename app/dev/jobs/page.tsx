'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { taskStatusPatch } from '@/lib/tasks/status'
import { ArrowRight, CheckCircle, Clock, Lightning, PaperPlaneTilt, WarningCircle, X } from '@phosphor-icons/react'

type Task = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  project_id?: string | null
  estimated_hours?: number | null
  acceptance_criteria?: string[] | null
  tags?: string[] | null
  requires_approval?: boolean | null
  approved_by?: string | null
  dev_notes?: string | null
  customer_update?: string | null
  assigned_to?: string | null
  updated_at?: string | null
  completed_at?: string | null
  project?: { title?: string | null; user_id?: string | null } | null
  epic?: { title?: string | null } | null
}

const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'mine', label: 'Meine' },
  { id: 'open', label: 'Offen' },
  { id: 'review', label: 'Review' },
] as const

type Filter = typeof FILTERS[number]['id']

const STATUS = [
  { id: 'todo', label: 'Geplant' },
  { id: 'in_progress', label: 'In Entwicklung' },
  { id: 'blocked', label: 'Blockiert' },
  { id: 'ready_review', label: 'Ready for Review' },
  { id: 'done', label: 'Erledigt' },
]

function statusTone(status?: string | null) {
  const value = String(status || 'todo').toLowerCase()
  if (['done', 'completed'].includes(value)) return 'done'
  if (['ready_review', 'ready_for_review', 'review', 'in_review'].includes(value)) return 'review'
  if (['blocked', 'waiting'].includes(value)) return 'blocked'
  if (['in_progress', 'doing', 'active'].includes(value)) return 'active'
  return 'open'
}

function statusLabel(status?: string | null) {
  const tone = statusTone(status)
  if (tone === 'done') return 'Erledigt'
  if (tone === 'review') return 'Bereit zur Prüfung'
  if (tone === 'blocked') return 'Blockiert'
  if (tone === 'active') return 'In Entwicklung'
  return 'Geplant'
}

function priorityLabel(priority?: string | null) {
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'low') return 'Niedrig'
  return 'Mittel'
}

export default function DevJobsPage() {
  const [session, setSession] = useState<DevSession | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)
  const [devNote, setDevNote] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<Filter>('mine')
  const supabase = createClient()

  async function loadTasks(nextFilter = filter) {
    const dev = getStoredDevSession()
    if (!dev) return
    setSession(dev)
    setLoading(true)

    let q = (supabase as any)
      .from('tasks')
      .select('*, project:projects(title,user_id), epic:epics(title)')
      .order('updated_at', { ascending: false })
      .limit(80)

    if (nextFilter === 'mine') q = q.eq('assigned_to', dev.user_id)
    if (nextFilter === 'open') q = q.in('status', ['todo', 'open', 'suggested'])
    if (nextFilter === 'review') q = q.in('status', ['ready_review', 'ready_for_review', 'review', 'in_review'])

    const { data } = await q
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [])

  function changeFilter(next: Filter) {
    setFilter(next)
    loadTasks(next)
  }

  async function updateStatus(taskId: string, status: string, task?: Task) {
    await supabase.from('tasks').update(taskStatusPatch(status, task?.completed_at)).eq('id', taskId)
    setTasks((items) => items.map((item) => item.id === taskId ? { ...item, status } : item))
    if (selected?.id === taskId) setSelected((current) => current ? { ...current, status } : null)

    if (['ready_review', 'done', 'blocked'].includes(status) && task?.project_id) {
      const label = status === 'blocked'
        ? `Developer meldet einen Blocker bei „${task.title}”. Tagro bereitet eine verständliche Erklärung vor.`
        : status === 'done'
          ? `Developer hat „${task.title}” abgeschlossen. Tagro bereitet die verständliche Zusammenfassung vor.`
          : `Developer hat „${task.title}” als bereit zur Prüfung markiert.`
      try { await supabase.from('messages').insert({ project_id: task.project_id, sender_id: session?.user_id, message: label, is_ai: true }) } catch { /* best-effort sync */ }
    }
  }

  async function claimTask(task: Task) {
    if (!session) return
    const nextStatus = task.status && task.status !== 'todo' ? task.status : 'in_progress'
    await supabase.from('tasks').update({
      assigned_to: session.user_id,
      ...taskStatusPatch(nextStatus, task.completed_at),
    }).eq('id', task.id)
    if (task.project_id) {
      try {
        await supabase.from('messages').insert({
          project_id: task.project_id,
          sender_id: session.user_id,
          message: `Ein Developer hat „${task.title}” übernommen. Die Umsetzung ist jetzt im Execution Board aktiv.`,
          is_ai: true,
        })
      } catch { /* best-effort sync */ }
    }
    await loadTasks()
  }

  async function sendProgressUpdate() {
    if (!selected || !devNote.trim()) return
    setSending(true)
    try {
      await fetch('/api/ai/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id, devNote: devNote.trim(), projectId: selected.project_id }),
      })
      setDevNote('')
      setSelected(null)
      await loadTasks()
    } finally {
      setSending(false)
    }
  }

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((task) => statusTone(task.status) === 'active').length,
    review: tasks.filter((task) => statusTone(task.status) === 'review').length,
    blocked: tasks.filter((task) => statusTone(task.status) === 'blocked').length,
  }), [tasks])

  return (
    <div className="dev-page">
      <header className="dev-page-header compact">
        <div>
          <p className="dev-eyebrow">Execution Board</p>
          <h1>Technische Umsetzung.</h1>
          <p className="meta">{counts.all} Tasks · {counts.active} aktiv · {counts.review} bereit zur Prüfung · {counts.blocked} Blocker</p>
        </div>
        <button className="dev-secondary-btn" onClick={() => loadTasks()}>Aktualisieren</button>
      </header>

      <div className="job-toolbar">
        <div className="job-filters">
          {FILTERS.map((item) => (
            <button key={item.id} className={filter === item.id ? 'on' : ''} onClick={() => changeFilter(item.id)}>{item.label}</button>
          ))}
        </div>
        <span className="dev-chip"><Lightning size={13} /> Updates spiegeln ins Client Board</span>
      </div>

      <section className="job-board dev-surface">
        <div className="job-head">
          <span>Task</span><span>Projekt</span><span>Status</span><span>Priorität</span><span>Handoff</span>
        </div>
        {loading ? (
          <p className="empty">Execution Tasks werden geladen…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">Keine Tasks in dieser Ansicht.</p>
        ) : tasks.map((task) => (
          <button key={task.id} className="job-row" onClick={() => { setSelected(task); setDevNote(task.dev_notes || '') }}>
            <span className={`job-dot ${statusTone(task.status)}`} />
            <div className="job-title">
              <strong>{task.title}</strong>
              <small>{task.epic?.title || task.estimated_hours ? `${task.epic?.title || 'Execution'} · ${task.estimated_hours || '—'}h` : 'Technische Aufgabe'}</small>
            </div>
            <span>{task.project?.title || 'Kein Projekt'}</span>
            <span className="dev-chip">{statusLabel(task.status)}</span>
            <span>{priorityLabel(task.priority)}</span>
            <span className="handoff">{task.assigned_to === session?.user_id ? 'Tagro bereit' : 'Übernehmbar'} <ArrowRight size={13} /></span>
          </button>
        ))}
      </section>

      {selected && (
        <div className="task-drawer" role="dialog" aria-modal="true">
          <button className="drawer-backdrop" onClick={() => setSelected(null)} aria-label="Schließen" />
          <aside className="drawer-panel">
            <div className="drawer-top">
              <div>
                <p className="dev-eyebrow">Dev Task</p>
                <h2>{selected.title}</h2>
              </div>
              <button className="icon-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <p className="drawer-desc">{selected.description || 'Keine technische Beschreibung hinterlegt. Nutze die Acceptance Criteria oder sende ein Update über Tagro.'}</p>

            <div className="drawer-meta">
              <span><Clock size={14} /> {selected.estimated_hours || '—'}h</span>
              <span>{priorityLabel(selected.priority)}</span>
              <span>{statusLabel(selected.status)}</span>
              <span>{selected.assigned_to === session?.user_id ? 'Dir zugewiesen' : 'Nicht zugewiesen'}</span>
            </div>

            {selected.assigned_to !== session?.user_id && (
              <button className="dev-primary-btn claim-task" onClick={() => claimTask(selected)}>
                Task übernehmen
              </button>
            )}

            <div>
              <p className="dev-section-title">Status setzen</p>
              <div className="status-actions">
                {STATUS.map((item) => (
                  <button key={item.id} onClick={() => updateStatus(selected.id, item.id, selected)} className={selected.status === item.id ? 'on' : ''}>{item.label}</button>
                ))}
              </div>
            </div>

            {!!selected.acceptance_criteria?.length && (
              <div>
                <p className="dev-section-title">Acceptance Criteria</p>
                <div className="criteria-list">
                  {selected.acceptance_criteria.map((item, index) => (
                    <div key={index}><CheckCircle size={15} /> <span>{item}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div className="client-sync-box">
              <p className="dev-section-title">Client Sync via Tagro</p>
              <p>Schreibe technisch, was passiert ist. Tagro übersetzt es kurz, freundlich und ohne Fachjargon ins Client Board.</p>
              <textarea value={devNote} onChange={(event) => setDevNote(event.target.value)} placeholder="z.B. API angebunden, Webhook getestet, noch offen ist Error Handling…" />
              <button className="dev-primary-btn" onClick={sendProgressUpdate} disabled={!devNote.trim() || sending}>
                {sending ? 'Tagro übersetzt…' : <><PaperPlaneTilt size={14} /> Update ans Client Board senden</>}
              </button>
              {selected.customer_update && <blockquote>{selected.customer_update}</blockquote>}
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .compact { margin-bottom:22px; }
        .job-toolbar { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:14px; }
        .job-filters { display:flex; gap:6px; }
        .job-filters button { height:30px; padding:0 12px; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font:inherit; font-size:12px; font-weight:750; cursor:pointer; }
        .job-filters button.on { color:var(--text); background:var(--surface-2); }
        .job-board { padding:8px; }
        .job-head { display:grid; grid-template-columns:minmax(240px,1.5fr) minmax(150px,.9fr) 140px 90px 120px; gap:12px; padding:10px 12px 8px 36px; color:var(--text-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
        .job-row { width:100%; border:0; background:transparent; color:var(--text); font:inherit; display:grid; grid-template-columns:12px minmax(240px,1.5fr) minmax(150px,.9fr) 140px 90px 120px; align-items:center; gap:12px; min-height:58px; padding:9px 12px; border-radius:13px; cursor:pointer; text-align:left; transition:background .18s ease, transform .18s ease; }
        .job-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); transform:translateY(-1px); }
        .job-title strong { display:block; font-size:13.5px; }
        .job-title small { display:block; margin-top:3px; color:var(--text-muted); font-size:11.5px; }
        .job-dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); }
        .job-dot.active { background:var(--green); }
        .job-dot.review { background:var(--amber); }
        .job-dot.blocked { background:var(--red); }
        .job-dot.done { background:var(--text-muted); }
        .handoff { display:inline-flex; align-items:center; gap:5px; color:var(--text-muted); font-size:12px; font-weight:700; }
        .empty { padding:32px; color:var(--text-muted); font-size:13px; }
        .task-drawer { position:fixed; inset:0; z-index:9000; display:flex; justify-content:flex-end; }
        .drawer-backdrop { flex:1; border:0; background:rgba(0,0,0,.22); backdrop-filter:blur(3px); cursor:pointer; }
        .drawer-panel { width:min(460px, 100vw); height:100%; overflow:auto; background:var(--bg); border-left:1px solid var(--border); padding:26px; box-shadow:-24px 0 80px rgba(0,0,0,.18); display:flex; flex-direction:column; gap:22px; }
        .drawer-top { display:flex; justify-content:space-between; gap:16px; }
        .drawer-top h2 { margin:0; font-size:23px; letter-spacing:-.04em; }
        .icon-close { border:0; background:transparent; color:var(--text-muted); width:30px; height:30px; border-radius:8px; cursor:pointer; }
        .icon-close:hover { background:var(--surface-2); color:var(--text); }
        .drawer-desc { margin:0; color:var(--text-secondary); line-height:1.6; font-size:14px; }
        .drawer-meta { display:flex; gap:8px; flex-wrap:wrap; }
        .drawer-meta span { display:inline-flex; align-items:center; gap:5px; min-height:28px; border-radius:999px; border:1px solid var(--border); padding:0 10px; color:var(--text-muted); font-size:12px; font-weight:750; }
        .claim-task { width:100%; display:flex; align-items:center; justify-content:center; }
        .status-actions { display:flex; flex-wrap:wrap; gap:7px; }
        .status-actions button { height:30px; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font:inherit; font-size:12px; font-weight:750; padding:0 10px; cursor:pointer; }
        .status-actions button.on, .status-actions button:hover { background:var(--surface-2); color:var(--text); }
        .criteria-list { display:flex; flex-direction:column; gap:8px; }
        .criteria-list div { display:flex; gap:8px; color:var(--text-secondary); font-size:13px; line-height:1.45; }
        .criteria-list svg { color:var(--green-dark); flex:0 0 auto; margin-top:1px; }
        .client-sync-box { border-radius:18px; padding:16px; background:var(--surface); border:1px solid var(--border); }
        .client-sync-box p:not(.dev-section-title) { color:var(--text-muted); margin:0 0 12px; font-size:13px; line-height:1.5; }
        .client-sync-box textarea { width:100%; min-height:116px; resize:vertical; border:0; outline:0; background:var(--surface-2); border-radius:14px; padding:13px; color:var(--text); font:inherit; font-size:13px; line-height:1.5; margin-bottom:10px; }
        .client-sync-box button { width:100%; display:flex; justify-content:center; align-items:center; gap:7px; }
        .client-sync-box button:disabled { opacity:.45; cursor:not-allowed; }
        .client-sync-box blockquote { margin:12px 0 0; padding:11px 12px; border-left:2px solid var(--green-dark); color:var(--text-secondary); background:var(--surface-2); border-radius:10px; font-size:13px; line-height:1.5; }
        @media (max-width: 980px) { .job-head { display:none; } .job-row { grid-template-columns:12px minmax(0,1fr); } .job-row > span:not(.job-dot), .handoff { display:none; } }
      `}</style>
    </div>
  )
}
