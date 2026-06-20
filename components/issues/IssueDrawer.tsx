'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, Check, LinkSimple, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import type { Issue, LinkedTask, ProjectLite } from '@/components/issues/issues-shared'
import {
  ISSUE_SEVERITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  fmtAgo,
  issueSeverityLabel,
  issueTypeLabel,
  severityDotColor,
} from '@/components/issues/issues-shared'

type Props = {
  issue: Issue
  project: ProjectLite | null
  onClose: () => void
  onPatch: (id: string, patch: Partial<Issue>) => void
}

export default function IssueDrawer({ issue, project, onClose, onPatch }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)

  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description || '')
  const [impact, setImpact] = useState(issue.impact || '')
  const [issueType, setIssueType] = useState(issue.issue_type)
  const [severity, setSeverity] = useState(issue.severity)
  const [status, setStatus] = useState(issue.status)

  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description || '')
    setImpact(issue.impact || '')
    setIssueType(issue.issue_type)
    setSeverity(issue.severity)
    setStatus(issue.status)
  }, [issue])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingLinks(true)
      try {
        const res = await fetch(`/api/issues/${issue.id}?expand=tasks`, { credentials: 'include' })
        const data = res.ok ? await res.json().catch(() => null) : null
        if (!cancelled) setLinkedTasks(data?.linked_tasks ?? [])
      } finally {
        if (!cancelled) setLoadingLinks(false)
      }
    })()
    return () => { cancelled = true }
  }, [issue.id])

  const dirty = useMemo(() => (
    title.trim() !== issue.title
    || (description.trim() || '') !== (issue.description || '')
    || (impact.trim() || '') !== (issue.impact || '')
    || issueType !== issue.issue_type
    || severity !== issue.severity
    || status !== issue.status
  ), [title, description, impact, issueType, severity, status, issue])

  async function save() {
    if (busy || !dirty) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          impact: impact.trim() || null,
          issue_type: issueType,
          severity,
          status,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Speichern fehlgeschlagen')
      onPatch(issue.id, data.issue)
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function resolveIssue() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'resolved' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Aktion fehlgeschlagen')
      onPatch(issue.id, data.issue)
      setStatus('resolved')
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label={issue.title}>
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Issue</span>
            <span className="dec-saved">
              {project && <>{project.title} · </>}
              {issueTypeLabel(issue.issue_type)} · {issueSeverityLabel(issue.severity)} · {fmtAgo(issue.updated_at)}
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
              <span>Titel</span>
              <input value={title} onChange={e => setTitle(e.target.value)} />
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
              <label className="dec-form-field">
                <span>Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as Issue['status'])}>
                  {ISSUE_STATUS_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="dec-form-field">
              <span>Beschreibung</span>
              <textarea value={description} rows={4} onChange={e => setDescription(e.target.value)} />
            </label>

            <label className="dec-form-field">
              <span>Business Impact</span>
              <textarea value={impact} rows={3} onChange={e => setImpact(e.target.value)} placeholder="Was blockiert das? Wer ist betroffen?" />
            </label>

            {issue.tagro_summary && (
              <div className="dec-form-field">
                <span>Tagro Einschätzung</span>
                <p className="dec-card-muted">{issue.tagro_summary}</p>
              </div>
            )}

            {issue.source_url && (
              <a href={issue.source_url} target="_blank" rel="noopener noreferrer" className="dec-detail-link">
                <LinkSimple size={14} />
                Quelle öffnen ({issue.source})
              </a>
            )}

            <div className="dec-form-field">
              <span>Verknüpfte Tasks</span>
              {loadingLinks ? (
                <p className="dec-card-muted">Lade Tasks…</p>
              ) : linkedTasks.length === 0 ? (
                <p className="dec-card-muted">Noch keine Tasks verknüpft.</p>
              ) : (
                <ul className="dec-link-list">
                  {linkedTasks.map(link => (
                    <li key={link.id}>
                      <span
                        className="dec-card-dot"
                        style={{ background: severityDotColor(issue.severity) }}
                      />
                      {link.task?.title || link.task_id}
                      <span className="dec-card-muted"> · {link.link_kind}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="dec-form-error">{error}</p>}

          <div className="dec-drawer-footer">
            <FestagPillButton
              variant="primary"
              disabled={!dirty || busy}
              onClick={() => void save()}
            >
              {busy ? <ArrowsClockwise size={14} className="spin" /> : <Check size={14} />}
              Speichern
            </FestagPillButton>
            {status !== 'resolved' && status !== 'closed' && (
              <FestagPillButton disabled={busy} onClick={() => void resolveIssue()}>
                Als gelöst markieren
              </FestagPillButton>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
