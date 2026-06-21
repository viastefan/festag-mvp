'use client'

import Link from 'next/link'
import {
  ArrowsClockwise, CheckCircle, Globe, PaperPlaneTilt, WarningCircle,
} from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import ClampedTip from '@/components/decisions/ClampedTip'

export type CaptureRow = {
  id: string
  project_id: string
  page_url: string | null
  page_title: string | null
  transcript: string
  tagro_summary: string | null
  structured_changes: Array<{ title?: string; description?: string; affected?: string; suggested?: string }> | null
  warnings: string[] | null
  status: string
  created_at: string
}

type ProjectLite = { id: string; title: string; color?: string | null }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  processing: 'Tagro strukturiert',
  ready_review: 'Bereit zur Prüfung',
  approved: 'An Dev gesendet',
  in_dev: 'In Umsetzung',
  needs_decision: 'Rückfrage offen',
  applied: 'Umgesetzt',
  rejected: 'Abgelehnt',
}

const STATUS_DOT: Record<string, string> = {
  draft: '#8E8E93',
  processing: '#5B647D',
  ready_review: '#ea580c',
  approved: '#5B647D',
  in_dev: '#5B647D',
  needs_decision: '#d4882b',
  applied: '#16a34a',
  rejected: '#d9534f',
}

function fmtWhen(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.round(d / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.round(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

function captureTitle(c: CaptureRow) {
  if (c.tagro_summary?.trim()) return c.tagro_summary.trim()
  const first = c.structured_changes?.[0]?.title
  if (first?.trim()) return first.trim()
  if (c.page_title?.trim()) return c.page_title.trim()
  if (c.transcript?.trim()) return c.transcript.trim().slice(0, 120)
  return 'Feedback-Session'
}

function captureSummary(c: CaptureRow) {
  if (c.tagro_summary?.trim()) return c.tagro_summary.trim()
  if (c.structured_changes?.length) {
    return c.structured_changes
      .slice(0, 3)
      .map(ch => ch.title || ch.description || '')
      .filter(Boolean)
      .join(' · ')
  }
  if (c.transcript?.trim()) return c.transcript.trim()
  return 'Keine Zusammenfassung'
}

type Props = {
  capture: CaptureRow
  project: ProjectLite | null
  isLast?: boolean
  busy: boolean
  onApprove: () => void
  onReject: () => void
}

export default function CaptureCardRow({
  capture: c,
  project,
  isLast,
  busy,
  onApprove,
  onReject,
}: Props) {
  const isReady = c.status === 'ready_review'
  const dot = STATUS_DOT[c.status] || '#8E8E93'
  const changes = c.structured_changes || []
  const warnings = c.warnings || []

  return (
    <div>
      <article
        className="dec-card cap-capture-row"
        style={isLast ? { borderBottom: 'none' } : undefined}
      >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <p className="dec-card-title">{captureTitle(c)}</p>
          <p className="dec-card-project">
            {project ? (
              <Link href={`/project/${project.id}`}>{project.title}</Link>
            ) : '— Projekt —'}
          </p>
        </div>
        <span
          className="dec-card-type-pill"
          style={{ ['--dec-dot-color' as string]: dot }}
        >
          <span className="dec-card-dot" style={{ background: dot }} />
          {STATUS_LABEL[c.status] || c.status}
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Zusammenfassung</span>
          {changes.length > 0 ? (
            <ol className="cap-changes">
              {changes.slice(0, 3).map((ch, i) => (
                <li key={i}>
                  <strong>{ch.title || `Änderung ${i + 1}`}</strong>
                  {ch.description ? ` — ${ch.description}` : ''}
                </li>
              ))}
              {changes.length > 3 ? <li>+{changes.length - 3} weitere</li> : null}
            </ol>
          ) : (
            <ClampedTip text={captureSummary(c)} lines={3} />
          )}
        </div>
        {c.page_url ? (
          <a href={c.page_url} target="_blank" rel="noreferrer" className="cap-page-link">
            <Globe size={12} weight="regular" />
            {c.page_title || c.page_url}
          </a>
        ) : null}
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Erfasst</span>
          <span className="dec-card-muted">{fmtWhen(c.created_at)}</span>
        </div>
        <span
          className="dec-card-prio-pill"
          style={{ ['--dec-dot-color' as string]: dot }}
        >
          <span className="dec-card-dot dec-card-dot--prio" style={{ background: dot }} />
          {isReady ? 'Prüfen' : STATUS_LABEL[c.status]?.split(' ')[0] || c.status}
        </span>
      </div>

      <div className="dec-card-actions">
        {isReady ? (
          <>
            <FestagPillButton variant="primary" disabled={busy} onClick={onApprove}>
              {busy ? <ArrowsClockwise size={14} className="dec-spin" /> : <PaperPlaneTilt size={14} weight="bold" />}
              An Dev senden
            </FestagPillButton>
            <FestagPillButton disabled={busy} onClick={onReject}>
              Verwerfen
            </FestagPillButton>
          </>
        ) : c.status === 'approved' || c.status === 'in_dev' ? (
          <span className="cap-sent-tag">
            <CheckCircle size={14} weight="fill" />
            Gesendet
          </span>
        ) : null}
        {project ? (
          <Link href={`/project/${project.id}`} className="cd-link-btn">Projekt</Link>
        ) : null}
      </div>

      {warnings.length > 0 ? (
        <div className="cap-warn-list">
          {warnings.map((w, i) => (
            <p key={i} className="cap-warn-item">
              <WarningCircle size={12} weight="fill" />
              {w}
            </p>
          ))}
        </div>
        ) : null}
      </article>
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
