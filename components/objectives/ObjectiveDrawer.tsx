'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Trash, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import type { Objective } from '@/lib/objectives/types'
import {
  OBJECTIVE_STATUS_OPTIONS,
  fmtAgo,
  fmtDate,
  isDemoObjectiveId,
  objectiveStatusLabel,
  type LinkedTask,
  type ProjectLite,
} from '@/components/objectives/objectives-shared'

type Props = {
  objective: Objective
  project: ProjectLite | null
  isDemo?: boolean
  onClose: () => void
  onPatch: (id: string, patch: Partial<Objective>) => void
  onRemove: (id: string) => void
}

export default function ObjectiveDrawer({
  objective,
  project,
  isDemo,
  onClose,
  onPatch,
  onRemove,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)

  const [title, setTitle] = useState(objective.title)
  const [description, setDescription] = useState(objective.description || '')
  const [targetDate, setTargetDate] = useState(objective.target_date?.slice(0, 10) || '')
  const [status, setStatus] = useState(objective.status)

  useEffect(() => {
    setTitle(objective.title)
    setDescription(objective.description || '')
    setTargetDate(objective.target_date?.slice(0, 10) || '')
    setStatus(objective.status)
  }, [objective])

  useEffect(() => {
    if (isDemo || isDemoObjectiveId(objective.id)) {
      setLinkedTasks([])
      setLoadingLinks(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingLinks(true)
      try {
        const res = await fetch(`/api/objectives/${objective.id}?expand=tasks`, { credentials: 'include' })
        const data = res.ok ? await res.json().catch(() => null) : null
        if (!cancelled) setLinkedTasks(data?.linked_tasks ?? [])
      } finally {
        if (!cancelled) setLoadingLinks(false)
      }
    })()
    return () => { cancelled = true }
  }, [objective.id, isDemo])

  const dirty = useMemo(() => (
    title.trim() !== objective.title
    || (description.trim() || '') !== (objective.description || '')
    || (targetDate || '') !== (objective.target_date?.slice(0, 10) || '')
    || status !== objective.status
  ), [title, description, targetDate, status, objective])

  async function save() {
    if (busy || !dirty) return
    setBusy(true)
    setError('')
    try {
      if (isDemo || isDemoObjectiveId(objective.id)) {
        onPatch(objective.id, {
          title: title.trim(),
          description: description.trim() || null,
          target_date: targetDate || null,
          status,
        })
        return
      }
      const res = await fetch(`/api/objectives/${objective.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          target_date: targetDate || null,
          status,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Speichern fehlgeschlagen')
      onPatch(objective.id, data.objective)
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function markCompleted() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (isDemo || isDemoObjectiveId(objective.id)) {
        onPatch(objective.id, { status: 'completed', progress_pct: 100 })
        setStatus('completed')
        return
      }
      const res = await fetch(`/api/objectives/${objective.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Aktion fehlgeschlagen')
      onPatch(objective.id, data.objective)
      setStatus('completed')
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function removeObjective() {
    if (busy) return
    if (!window.confirm('Ziel wirklich löschen? Verknüpfte Tasks bleiben erhalten.')) return
    setBusy(true)
    setError('')
    try {
      if (isDemo || isDemoObjectiveId(objective.id)) {
        onRemove(objective.id)
        onClose()
        return
      }
      const res = await fetch(`/api/objectives/${objective.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Löschen fehlgeschlagen')
      onRemove(objective.id)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Löschen fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label={objective.title}>
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Ziel</span>
            <span className="dec-saved">
              {project?.title && <>{project.title} · </>}
              {objectiveStatusLabel(objective.status)} · {fmtAgo(objective.updated_at)}
            </span>
          </div>
          <div className="dec-drawer-actions">
            <button type="button" className="dec-icon-btn" aria-label="Schließen" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="dec-drawer-body">
          <div className="dec-form-grid">
            <label className="dec-form-field">
              <span>Ziel</span>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </label>

            <label className="dec-form-field">
              <span>Status</span>
              <select value={status} onChange={e => setStatus(e.target.value as Objective['status'])}>
                {OBJECTIVE_STATUS_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="dec-form-field">
              <span>Warum</span>
              <textarea
                value={description}
                rows={4}
                onChange={e => setDescription(e.target.value)}
                placeholder="Kontext für Team und Tagro"
              />
            </label>

            <label className="dec-form-field">
              <span>Zieldatum</span>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </label>

            <div className="dec-form-field">
              <span>Fortschritt</span>
              <p className="dec-card-muted">
                {objective.progress_pct}%
                {(objective.task_count ?? 0) > 0 && ` · ${objective.task_done ?? 0}/${objective.task_count} Tasks`}
              </p>
              <div className="obj-progress-bar" aria-hidden>
                <div className="obj-progress-fill" style={{ width: `${objective.progress_pct}%` }} />
              </div>
              {objective.at_risk && (
                <p className="obj-drawer-risk">Gefährdet — Zieldatum oder Fortschritt prüfen.</p>
              )}
            </div>

            <div className="dec-form-field">
              <span>Verknüpfte Tasks</span>
              {loadingLinks ? (
                <p className="dec-card-muted">Lade Tasks…</p>
              ) : linkedTasks.length === 0 ? (
                <p className="dec-card-muted">Noch keine Tasks verknüpft — Aufgaben können später zugeordnet werden.</p>
              ) : (
                <ul className="dec-link-list">
                  {linkedTasks.map(task => (
                    <li key={task.id}>
                      <Link href={`/tasks?open=${task.id}`} className="dec-detail-link">{task.title}</Link>
                      <span className="dec-card-muted">{task.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="dec-form-error">{error}</p>}

          <div className="dec-drawer-footer">
            {status === 'active' && (
              <FestagPillButton variant="primary" disabled={busy} onClick={() => void markCompleted()}>
                <Check size={14} weight="bold" />
                Abschließen
              </FestagPillButton>
            )}
            <FestagPillButton variant="surface" disabled={busy || !dirty} onClick={() => void save()}>
              {busy ? 'Speichern…' : 'Speichern'}
            </FestagPillButton>
            <FestagPillButton variant="surface" disabled={busy} onClick={() => void removeObjective()}>
              <Trash size={14} />
              Löschen
            </FestagPillButton>
          </div>
          <p className="obj-drawer-hint">Zieldatum: {fmtDate(objective.target_date)}</p>
        </div>
      </aside>
    </div>
  )
}
