'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { taskStatusPatch } from '@/lib/tasks/status'
import { ArrowRight, CheckSquare, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'

type Task = {
  id: string
  title: string
  status?: string | null
  priority?: string | null
  project_id?: string | null
  dev_notes?: string | null
  customer_update?: string | null
  updated_at?: string | null
  completed_at?: string | null
  projects?: { title?: string | null } | null
}

function tone(status?: string | null) {
  const value = String(status || 'todo').toLowerCase()
  if (['done', 'completed'].includes(value)) return 'done'
  if (['ready_review', 'ready_for_review', 'review', 'in_review'].includes(value)) return 'review'
  if (['blocked', 'waiting'].includes(value)) return 'blocked'
  if (['in_progress', 'doing', 'active'].includes(value)) return 'active'
  return 'open'
}

function label(status?: string | null) {
  const value = tone(status)
  if (value === 'done') return 'Erledigt'
  if (value === 'review') return 'Ready for Review'
  if (value === 'blocked') return 'Blockiert'
  if (value === 'active') return 'In Entwicklung'
  return 'Geplant'
}

function priority(priority?: string | null) {
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'low') return 'Niedrig'
  return 'Mittel'
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short' }).format(new Date(value)) } catch { return '—' }
}

export default function DevTasksPage() {
  const [session, setSession] = useState<DevSession | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  async function loadTasks() {
    const dev = getStoredDevSession()
    if (!dev) return
    setSession(dev)
    setLoading(true)
    const { data } = await (supabase as any)
      .from('tasks')
      .select('id,title,status,priority,project_id,dev_notes,customer_update,updated_at,completed_at,projects(title)')
      .eq('assigned_to', dev.user_id)
      .order('updated_at', { ascending: false })
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [])

  async function updateStatus(task: Task, status: string) {
    await supabase.from('tasks').update(taskStatusPatch(status, task.completed_at)).eq('id', task.id)
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status } : item))
    if (['ready_review', 'done', 'blocked'].includes(status) && task.project_id) {
      await supabase.from('messages').insert({
        project_id: task.project_id,
        sender_id: session?.user_id,
        message: status === 'blocked'
          ? `Developer meldet einen Blocker bei „${task.title}”. Tagro bereitet die verständliche Einordnung vor.`
          : status === 'done'
            ? `Developer hat „${task.title}” abgeschlossen. Tagro bereitet das Client-Update vor.`
            : `Developer hat „${task.title}” zur Prüfung freigegeben.`,
        is_ai: true,
      }).catch(() => {})
    }
  }

  async function sendUpdate(task: Task) {
    if (!note.trim()) return
    setSending(true)
    await fetch('/api/ai/progress', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ taskId: task.id, projectId: task.project_id, devNote: note.trim() }),
    }).catch(() => {})
    setNote('')
    setSelectedId(null)
    await loadTasks()
    setSending(false)
  }

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null
  const stats = useMemo(() => ({
    open: tasks.filter((task) => tone(task.status) === 'open').length,
    active: tasks.filter((task) => tone(task.status) === 'active').length,
    review: tasks.filter((task) => tone(task.status) === 'review').length,
    done: tasks.filter((task) => tone(task.status) === 'done').length,
  }), [tasks])

  return (
    <div className="dev-page">
      <header className="dev-page-header compact">
        <div>
          <p className="dev-eyebrow">Meine Tasks</p>
          <h1>Fokusliste.</h1>
          <p className="meta">{stats.open} geplant · {stats.active} aktiv · {stats.review} in Prüfung · {stats.done} erledigt</p>
        </div>
        <button className="dev-secondary-btn" onClick={loadTasks}>Aktualisieren</button>
      </header>

      <section className="my-task-board dev-surface">
        <div className="my-task-head">
          <span>Task</span><span>Projekt</span><span>Status</span><span>Priorität</span><span>Letztes Update</span><span>Aktion</span>
        </div>
        {loading ? <p className="empty">Tasks werden geladen…</p> : tasks.length === 0 ? (
          <p className="empty">Noch keine zugewiesenen Tasks. Sobald ein Projekt in die Execution geht, erscheint dein Fokus hier.</p>
        ) : tasks.map((task) => (
          <div className="my-task-row" key={task.id}>
            <span className={`task-dot ${tone(task.status)}`} />
            <div>
              <strong>{task.title}</strong>
              <small>{task.customer_update || 'Noch kein Client-Update gesendet'}</small>
            </div>
            <span>{task.projects?.title || 'Kein Projekt'}</span>
            <span className="dev-chip">{label(task.status)}</span>
            <span>{priority(task.priority)}</span>
            <span>{dateLabel(task.updated_at)}</span>
            <button onClick={() => { setSelectedId(task.id); setNote(task.dev_notes || '') }}>Update <ArrowRight size={13} /></button>
          </div>
        ))}
      </section>

      {selectedTask && (
        <div className="inline-update dev-surface">
          <div>
            <p className="dev-section-title">Tagro Client Update</p>
            <h2>{selectedTask.title}</h2>
            <p>Deine technische Notiz wird als verständliches Update an den Client gespiegelt. Der Client sieht keine internen Dev-Details.</p>
          </div>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Technisches Update für Tagro…" />
          <div className="inline-actions">
            <button className="dev-secondary-btn" onClick={() => updateStatus(selectedTask, 'blocked')}><WarningCircle size={14} /> Blocker melden</button>
            <button className="dev-secondary-btn" onClick={() => updateStatus(selectedTask, 'ready_review')}><CheckSquare size={14} /> Ready for Review</button>
            <button className="dev-primary-btn" disabled={!note.trim() || sending} onClick={() => sendUpdate(selectedTask)}><PaperPlaneTilt size={14} /> {sending ? 'Sende…' : 'Update senden'}</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .compact { margin-bottom:22px; }
        .my-task-board { padding:8px; }
        .my-task-head { display:grid; grid-template-columns:minmax(240px,1.5fr) minmax(150px,.9fr) 140px 90px 110px 90px; gap:12px; padding:10px 12px 8px 34px; color:var(--text-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
        .my-task-row { display:grid; grid-template-columns:10px minmax(240px,1.5fr) minmax(150px,.9fr) 140px 90px 110px 90px; align-items:center; gap:12px; min-height:60px; padding:9px 12px; border-radius:13px; transition:background .18s ease, transform .18s ease; }
        .my-task-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); transform:translateY(-1px); }
        .my-task-row strong { display:block; font-size:13.5px; }
        .my-task-row small { display:block; margin-top:3px; color:var(--text-muted); font-size:11.5px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:420px; }
        .task-dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); }
        .task-dot.active { background:#22c55e; }
        .task-dot.review { background:#f59e0b; }
        .task-dot.blocked { background:#ef4444; }
        .task-dot.done { background:#64748b; }
        .my-task-row button { border:0; background:transparent; color:var(--text-muted); font:inherit; font-size:12px; font-weight:750; display:inline-flex; align-items:center; gap:5px; cursor:pointer; justify-content:flex-start; }
        .my-task-row button:hover { color:var(--text); }
        .empty { padding:32px; color:var(--text-muted); font-size:13px; }
        .inline-update { margin-top:18px; padding:18px; display:grid; grid-template-columns:minmax(220px,.8fr) minmax(260px,1fr); gap:16px; align-items:start; }
        .inline-update h2 { margin:0; font-size:18px; letter-spacing:-.03em; }
        .inline-update p:not(.dev-section-title) { margin:7px 0 0; color:var(--text-muted); font-size:13px; line-height:1.5; }
        .inline-update textarea { min-height:104px; resize:vertical; border:0; outline:0; background:var(--surface-2); color:var(--text); font:inherit; border-radius:14px; padding:13px; }
        .inline-actions { grid-column:1 / -1; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
        .inline-actions button { display:inline-flex; align-items:center; gap:6px; }
        .inline-actions button:disabled { opacity:.45; cursor:not-allowed; }
        @media (max-width: 980px) { .my-task-head { display:none; } .my-task-row { grid-template-columns:10px minmax(0,1fr) auto; } .my-task-row > span:not(.task-dot):not(.dev-chip) { display:none; } .inline-update { grid-template-columns:1fr; } }
      `}</style>
    </div>
  )
}
