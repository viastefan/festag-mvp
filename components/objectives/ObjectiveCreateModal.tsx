'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import { createClient } from '@/lib/supabase/client'
import type { Objective } from '@/lib/objectives/types'
import type { ProjectLite } from '@/components/objectives/ObjectiveCardRow'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (objective: Objective) => void
  defaultProjectId?: string | null
}

export default function ObjectiveCreateModal({ open, onClose, onCreated, defaultProjectId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || '')
    setTitle('')
    setDescription('')
    setTargetDate('')
    setError('')
  }, [open, defaultProjectId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color')
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (!cancelled) {
        const rows = (data ?? []) as ProjectLite[]
        setProjects(rows)
        if (!projectId && rows[0]?.id) setProjectId(rows[0].id)
      }
    })()
    return () => { cancelled = true }
  }, [open, supabase, projectId])

  if (!open) return null

  async function submit() {
    if (busy || !projectId || !title.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          target_date: targetDate || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Objective konnte nicht erstellt werden')
      onCreated(data.objective)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Objective konnte nicht erstellt werden')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label="Neues Objective">
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Objective anlegen</span>
            <span className="dec-saved">OKR · Festag</span>
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
              <span>Projekt</span>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>

            <label className="dec-form-field">
              <span>Objective</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Launch Mobile App"
                autoFocus
              />
            </label>

            <label className="dec-form-field">
              <span>Warum (optional)</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Kontext für Team und Tagro"
              />
            </label>

            <label className="dec-form-field">
              <span>Zieldatum</span>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </label>
          </div>

          {error && <p className="dec-form-error">{error}</p>}

          <div className="dec-drawer-foot">
            <FestagPillButton
              variant="primary"
              disabled={busy || !title.trim() || !projectId}
              onClick={() => void submit()}
            >
              <Plus size={14} weight="bold" />
              {busy ? 'Speichern…' : 'Objective anlegen'}
            </FestagPillButton>
          </div>
        </div>
      </aside>
    </div>
  )
}
