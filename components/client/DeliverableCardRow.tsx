'use client'

import Link from 'next/link'
import { Check, ChatCircle, DownloadSimple, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import ClampedTip from '@/components/decisions/ClampedTip'
import type { ClientDeliverable } from '@/lib/client/deliverables'

type Props = {
  deliverable: ClientDeliverable
  isLast?: boolean
  busy: boolean
  feedbackOpen: boolean
  feedbackText: string
  onFeedbackText: (value: string) => void
  onApprove: () => void
  onRequestChanges: () => void
  onOpenFeedback: () => void
  onCloseFeedback: () => void
}

const KIND_LABEL: Record<string, string> = {
  design: 'Design',
  video: 'Video',
  document: 'Dokument',
  release: 'Release',
  asset: 'Asset',
}

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

function statusLabel(d: ClientDeliverable) {
  if (d.approval_status === 'awaiting_review') return 'Freigabe nötig'
  if (d.approval_status === 'approved') return 'Freigegeben'
  if (d.approval_status === 'changes_requested') return 'Änderung angefragt'
  return 'Lieferung'
}

export default function DeliverableCardRow({
  deliverable: d,
  isLast,
  busy,
  feedbackOpen,
  feedbackText,
  onFeedbackText,
  onApprove,
  onRequestChanges,
  onOpenFeedback,
  onCloseFeedback,
}: Props) {
  const openUrl = d.external_url || d.preview_url
  const needsReview = d.approval_status === 'awaiting_review'

  return (
    <article className="dec-card cd-deliverable-row" style={isLast && !feedbackOpen ? { borderBottom: 'none' } : undefined}>
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <p className="dec-card-title">{d.title}</p>
          <p className="dec-card-project">{d.project_title || '—'}</p>
        </div>
        <span className="dec-card-type-pill">
          <span className="dec-card-dot" style={{ background: needsReview ? '#ea580c' : '#16a34a' }} />
          {KIND_LABEL[d.kind] || d.kind || 'Lieferung'}
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Zusammenfassung</span>
          {d.summary ? (
            <ClampedTip text={d.summary} className="dec-card-muted" lines={2} />
          ) : (
            <span className="dec-card-muted">Keine Beschreibung</span>
          )}
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Status</span>
          <span className="dec-card-muted">{statusLabel(d)}</span>
        </div>
        <span className="dec-card-prio-pill">
          <span className="dec-card-dot dec-card-dot--prio" style={{ ['--dec-dot-color' as string]: needsReview ? '#ea580c' : '#16a34a' }} />
          {fmtWhen(d.created_at)}
        </span>
      </div>

      <div className="dec-card-actions">
        {needsReview && (
          <>
            <FestagPillButton variant="primary" disabled={busy} onClick={onApprove}>
              <Check size={14} weight="bold" /> Freigeben
            </FestagPillButton>
            <FestagPillButton disabled={busy} onClick={onOpenFeedback}>
              <ChatCircle size={14} /> Änderung
            </FestagPillButton>
          </>
        )}
        {openUrl && (
          <a href={openUrl} target="_blank" rel="noreferrer" className="cd-link-btn">
            <DownloadSimple size={14} /> Öffnen
          </a>
        )}
        {d.project_id && (
          <Link href={`/project/${d.project_id}`} className="cd-link-btn">Projekt</Link>
        )}
      </div>

      {feedbackOpen && (
        <div className="cd-feedback-block">
          <textarea
            className="cd-feedback"
            placeholder="Was soll angepasst werden?"
            value={feedbackText}
            onChange={e => onFeedbackText(e.target.value)}
          />
          <div className="dec-card-actions">
            <FestagPillButton
              variant="primary"
              disabled={!feedbackText.trim() || busy}
              onClick={onRequestChanges}
            >
              Senden
            </FestagPillButton>
            <FestagPillButton disabled={busy} onClick={onCloseFeedback}>
              <X size={14} /> Abbrechen
            </FestagPillButton>
          </div>
        </div>
      )}
    </article>
  )
}
