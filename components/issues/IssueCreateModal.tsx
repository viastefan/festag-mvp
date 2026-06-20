'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import { createClient } from '@/lib/supabase/client'
import type { Issue, ProjectLite } from '@/components/issues/issues-shared'
import { ISSUE_SEVERITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@/components/issues/issues-shared'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (issue: Issue) => void
  defaultProjectId?: string | null
}

export default function IssueCreateModal({ open, onClose, onCreated, defaultProjectId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [issueType, setIssueType] = useState<Issue['issue_type']>('bug')
  const [severity, setSeverity] = useState<Issue['severity']>('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || '')
    setTitle('')
    setDescription('')
    setImpact('')
    setIssueType('bug')
    setSeverity('medium')
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
        .select('id,title,color,status')
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
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          impact: impact.trim() || null,
          issue_type: issueType,
          severity,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Issue konnte nicht erstellt werden')
      onCreated(data.issue)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Issue konnte nicht erstellt werden')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label="Neues Issue">
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Issue anlegen</span>
            <span className="dec-saved">Manuell · Festag</span>
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
              <span>Titel</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Stripe Webhook fehlt für Payment Flow"
                autoFocus
              />
            </label>

            <div className="dec-form-row">
              <label className="dec-form-field">
                <span>Typ</span>
                <select value={issueType} onChange={e => setIssueType(e.target.value as Issue['issue_type'])}>
                  {ISSUE_TYPE_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="dec-form-field">
                <span>Schwere</span>
                <select value={severity} onChange={e => setSeverity(e.target.value as Issue['severity'])}>
                  {ISSUE_SEVERITY_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="dec-form-field">
              <span>Beschreibung</span>
              <textarea
                value={description}
                rows={3}
                onChange={e => setDescription(e.target.value)}
                placeholder="Was ist passiert? Reproduktion, Kontext…"
              />
            </label>

            <label className="dec-form-field">
              <span>Business Impact</span>
              <textarea
                value={impact}
                rows={2}
                onChange={e => setImpact(e.target.value)}
                placeholder="Was blockiert das? Geschätzte Verzögerung…"
              />
            </label>
          </div>

          {error && <p className="dec-form-error">{error}</p>}

          <div className="dec-drawer-footer">
            <FestagPillButton
              variant="primary"
              disabled={busy || !title.trim() || !projectId}
              onClick={() => void submit()}
            >
              <Plus size={14} />
              Issue erstellen
            </FestagPillButton>
          </div>
        </div>
      </aside>
    </div>
  )
}
