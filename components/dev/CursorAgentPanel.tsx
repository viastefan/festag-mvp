'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowSquareOut, ArrowsClockwise, GitBranch, Robot } from '@phosphor-icons/react'

type CursorJob = {
  id: string
  status: string
  cursor_agent_url?: string | null
  branch_name?: string | null
  pr_url?: string | null
  result_summary?: string | null
  error_message?: string | null
  created_at?: string
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'In Warteschlange',
  dispatching: 'Wird gestartet…',
  running: 'Cursor Agent läuft',
  finished: 'Abgeschlossen',
  error: 'Fehler',
  cancelled: 'Abgebrochen',
}

export default function CursorAgentPanel({ taskId }: { taskId: string }) {
  const [jobs, setJobs] = useState<CursorJob[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cursor/jobs?taskId=${encodeURIComponent(taskId)}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setJobs((data.jobs as CursorJob[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { void load() }, [load])

  const latest = jobs[0]
  const canSend = !latest || ['finished', 'error', 'cancelled'].includes(latest.status)

  async function sendToCursor() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/cursor/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId, autoCreatePR: true, dispatch: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data?.error === 'no_repo_linked'
          ? 'Kein GitHub-Repo verknüpft. Verbinde ein Repo unter /dev/github oder setze FESTAG_CURSOR_DEFAULT_REPO_URL.'
          : (data?.error || 'Senden fehlgeschlagen.'))
        return
      }
      if (data?.dispatchError) {
        setMsg(`Job angelegt, Start fehlgeschlagen: ${data.dispatchError}`)
      } else if (data?.message === 'queued_cursor_key_missing') {
        setMsg('Job in Warteschlange — CURSOR_API_KEY fehlt auf dem Server.')
      } else {
        setMsg('An Cursor Agent gesendet.')
      }
      if (data?.job) setJobs(prev => [data.job, ...prev.filter(j => j.id !== data.job.id)])
      else await load()
    } finally {
      setBusy(false)
    }
  }

  async function refreshLatest() {
    if (!latest) return
    setBusy(true)
    try {
      const res = await fetch('/api/cursor/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId: latest.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.job) {
        setJobs(prev => [data.job, ...prev.slice(1)])
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cap">
      <div className="cap-head">
        <span className="cap-title"><Robot size={12} /> Cursor Execution</span>
        <div className="cap-actions">
          {latest && latest.status === 'running' && (
            <button type="button" className="cap-btn" onClick={() => void refreshLatest()} disabled={busy}>
              <ArrowsClockwise size={12} /> Status
            </button>
          )}
          {canSend && (
            <button type="button" className="cap-btn primary" onClick={() => void sendToCursor()} disabled={busy}>
              An Cursor Agent senden
            </button>
          )}
        </div>
      </div>

      {loading && <p className="cap-muted">Lade…</p>}
      {!loading && !latest && (
        <p className="cap-muted">
          Tagro strukturiert den Task — Cursor implementiert ihn im verknüpften Repo (Cloud Agent, optional mit PR).
        </p>
      )}
      {latest && (
        <div className="cap-card">
          <p className="cap-status">{STATUS_LABEL[latest.status] ?? latest.status}</p>
          {latest.branch_name && (
            <p className="cap-line"><GitBranch size={11} /> Branch: {latest.branch_name}</p>
          )}
          {latest.result_summary && <p className="cap-line">{latest.result_summary}</p>}
          {latest.error_message && <p className="cap-err">{latest.error_message}</p>}
          {latest.cursor_agent_url && (
            <a className="cap-link" href={latest.cursor_agent_url} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={12} /> Agent in Cursor öffnen
            </a>
          )}
        </div>
      )}
      {msg && <p className="cap-msg">{msg}</p>}

      <style jsx>{`
        .cap { display: flex; flex-direction: column; gap: 8px; }
        .cap-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cap-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .1em; }
        .cap-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .cap-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 28px; padding: 0 10px; border-radius: 7px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text); font: inherit; font-size: 12px; cursor: pointer;
        }
        .cap-btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
        .cap-btn:disabled { opacity: .5; cursor: default; }
        .cap-muted { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.45; }
        .cap-card {
          padding: 10px 12px; border-radius: 8px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
        }
        .cap-status { margin: 0 0 6px; font-size: 13px; font-weight: 500; color: var(--text); }
        .cap-line { margin: 0 0 4px; font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }
        .cap-err { margin: 4px 0 0; font-size: 12px; color: #f87171; }
        .cap-link {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 8px; font-size: 12px; color: var(--accent); text-decoration: none;
        }
        .cap-msg { margin: 0; font-size: 12px; color: var(--text-secondary); }
      `}</style>
    </div>
  )
}
