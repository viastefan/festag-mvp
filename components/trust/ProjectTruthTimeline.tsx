'use client'

import { useEffect, useState } from 'react'
import ProofCapsules from '@/components/proof/ProofCapsules'
import type { ProjectTruth, ProjectTruthEntry } from '@/lib/trust/project-truth'

const KIND_LABEL: Record<ProjectTruthEntry['kind'], string> = {
  evidence: 'Nachweis',
  decision: 'Entscheidung',
  deliverable: 'Lieferung',
  signal: 'Signal',
  report: 'Bericht',
  moment: 'Moment',
  blocker: 'Blocker',
}

const IMPACT_LABEL: Record<ProjectTruthEntry['reportImpact'], string> = {
  supports: 'stützt den Stand',
  blocks: 'blockiert Versand',
  awaits: 'wartet auf dich',
  informs: 'informiert',
}

type Props = {
  projectId: string
  className?: string
}

export default function ProjectTruthTimeline({ projectId, className }: Props) {
  const [truth, setTruth] = useState<ProjectTruth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/truth`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || 'Project Truth konnte nicht geladen werden.')
          setTruth(null)
        } else {
          setTruth(data.truth as ProjectTruth)
        }
      } catch {
        if (!cancelled) setError('Project Truth konnte nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <section className={`ptt${className ? ` ${className}` : ''}`} aria-label="Project Truth">
      <style>{PTT_CSS}</style>
      <header className="ptt-head">
        <h2 className="ptt-title">Project Truth</h2>
        {truth ? (
          <span className="ptt-control" style={{ color: truth.control.color }}>
            {truth.control.label}
          </span>
        ) : null}
      </header>

      {loading && !truth ? (
        <p className="ptt-muted">Verdichte Lieferwahrheit…</p>
      ) : error && !truth ? (
        <p className="ptt-muted">{error}</p>
      ) : truth ? (
        <>
          <p className="ptt-reason">{truth.control.reason}</p>
          <div className="ptt-ready" style={{ borderColor: `${truth.readiness.color}55` }}>
            <strong style={{ color: truth.readiness.color }}>{truth.readiness.label}</strong>
            <span>{truth.readiness.reason}</span>
          </div>
          {truth.proof.length > 0 ? <ProofCapsules items={truth.proof} compact /> : null}
          <ul className="ptt-list">
            {truth.entries.map(entry => (
              <li key={entry.id} className={`ptt-item impact-${entry.reportImpact}${entry.clientVisible ? '' : ' internal'}`}>
                <div className="ptt-item-top">
                  <span className="ptt-kind">{KIND_LABEL[entry.kind]}</span>
                  <span className="ptt-impact">{IMPACT_LABEL[entry.reportImpact]}</span>
                </div>
                {entry.href ? (
                  <a className="ptt-item-title" href={entry.href}>{entry.title}</a>
                ) : (
                  <p className="ptt-item-title">{entry.title}</p>
                )}
                <p className="ptt-item-body">{entry.body}</p>
              </li>
            ))}
          </ul>
          {truth.entries.length === 0 ? (
            <p className="ptt-muted">Noch keine kuratierten Signale — sobald Arbeit läuft, erscheint sie hier.</p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

const PTT_CSS = `
.ptt {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 20px 18px;
  border-radius: 22px;
  background: var(--festag-glass-bg, rgba(255,255,255,0.58));
  border: 1px solid var(--festag-glass-border, rgba(255,255,255,0.62));
  box-shadow: var(--festag-glass-shadow-soft);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
}
.ptt-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.ptt-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text, #1e1e20);
}
.ptt-control {
  font-size: 12px;
  font-weight: 600;
}
.ptt-reason, .ptt-muted {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted, #5c5c62);
}
.ptt-ready {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,0.08);
  background: rgba(255,255,255,0.5);
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--text-muted, #5c5c62);
}
.ptt-ready strong { font-weight: 600; font-size: 13px; }
.ptt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ptt-item {
  padding: 12px 12px 11px;
  border-radius: 14px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(15,23,42,0.06);
}
.ptt-item.internal { opacity: 0.78; }
.ptt-item.impact-blocks { border-color: rgba(217,83,79,0.28); }
.ptt-item.impact-awaits { border-color: rgba(212,136,43,0.28); }
.ptt-item-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.ptt-kind, .ptt-impact {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted, #5c5c62);
}
.ptt-item-title {
  margin: 0;
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #1e1e20);
  text-decoration: none;
  line-height: 1.35;
}
a.ptt-item-title:hover { text-decoration: underline; text-underline-offset: 2px; }
.ptt-item-body {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-muted, #5c5c62);
}
html[data-theme="dark"] .ptt,
html[data-theme="classic-dark"] .ptt {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
}
html[data-theme="dark"] .ptt-item,
html[data-theme="classic-dark"] .ptt-item,
html[data-theme="dark"] .ptt-ready,
html[data-theme="classic-dark"] .ptt-ready {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
}
html[data-theme="dark"] .ptt-title,
html[data-theme="classic-dark"] .ptt-title,
html[data-theme="dark"] .ptt-item-title,
html[data-theme="classic-dark"] .ptt-item-title {
  color: rgba(245,245,247,0.92);
}
html[data-theme="dark"] .ptt-reason,
html[data-theme="classic-dark"] .ptt-reason,
html[data-theme="dark"] .ptt-muted,
html[data-theme="classic-dark"] .ptt-muted,
html[data-theme="dark"] .ptt-kind,
html[data-theme="classic-dark"] .ptt-kind,
html[data-theme="dark"] .ptt-impact,
html[data-theme="classic-dark"] .ptt-impact,
html[data-theme="dark"] .ptt-item-body,
html[data-theme="classic-dark"] .ptt-item-body,
html[data-theme="dark"] .ptt-ready,
html[data-theme="classic-dark"] .ptt-ready {
  color: rgba(245,245,247,0.62);
}
`
