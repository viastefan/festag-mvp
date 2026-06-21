'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckSquare, Circle, Spinner } from '@phosphor-icons/react'

type TaskRow = {
  id: string
  title: string
  status?: string | null
  dev_status?: string | null
  priority?: string | null
  updated_at?: string | null
  project_id?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'Offen',
  doing: 'Aktiv',
  done: 'Fertig',
  review: 'Review',
  blocked: 'Blockiert',
  waiting: 'Wartet',
}

export default function DevProjectTaskPanel({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/tasks', { credentials: 'include' })
      if (!res.ok) { setTasks([]); return }
      const data = await res.json()
      const rows = ((data.tasks ?? []) as TaskRow[])
        .filter(t => t.project_id === projectId)
        .slice(0, 8)
      setTasks(rows)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  return (
    <section className="dpt-panel dev-surface">
      <div className="dpt-head">
        <p className="dpt-kicker"><CheckSquare size={13} /> Execution</p>
        <h3 className="dpt-title">Aufgaben im Projekt</h3>
        <Link href={`/dev/tasks?project=${projectId}`} className="dpt-all">
          Alle öffnen <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <p className="dpt-empty"><Spinner size={14} className="dpt-spin" /> Lade Tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="dpt-empty">
          Noch keine Tasks für dieses Projekt. Öffne das Execution Board oder lass Tagro Aufgaben vorschlagen.
        </p>
      ) : (
        <ul className="dpt-list">
          {tasks.map(task => {
            const status = task.dev_status || task.status || 'todo'
            return (
              <li key={task.id}>
                <Link href={`/dev/tasks?project=${projectId}&id=${task.id}`} className="dpt-row">
                  <span className="dpt-check" aria-hidden><Circle size={14} /></span>
                  <span className="dpt-row-main">
                    <strong>{task.title}</strong>
                    <span>{STATUS_LABEL[status] || status}</span>
                  </span>
                  <ArrowRight size={13} className="dpt-chevron" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <style jsx>{`
        .dpt-panel { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .dpt-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
        .dpt-kicker {
          width: 100%;
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .dpt-title { margin: 0; flex: 1; font-size: 15px; font-weight: 600; color: var(--text); }
        .dpt-all {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .dpt-all:hover { color: var(--text); }
        .dpt-empty { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
        .dpt-spin { animation: dpt-spin 1s linear infinite; }
        @keyframes dpt-spin { to { transform: rotate(360deg); } }
        .dpt-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .dpt-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 35%, transparent);
          text-decoration: none;
          color: inherit;
          transition: background .12s, border-color .12s;
        }
        .dpt-row:hover { background: var(--surface-2); border-color: var(--border-strong); }
        .dpt-check { color: var(--text-muted); flex-shrink: 0; }
        .dpt-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .dpt-row-main strong {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dpt-row-main span { font-size: 11.5px; color: var(--text-muted); }
        .dpt-chevron { color: var(--text-muted); flex-shrink: 0; }
      `}</style>
    </section>
  )
}
