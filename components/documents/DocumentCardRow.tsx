'use client'

import { Check, DownloadSimple, FilePdf, PaperPlaneTilt, PenNib, PencilSimple } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'
import FestagPillButton from '@/components/ui/FestagPillButton'
import type { DocumentListItem } from '@/components/documents/documents-shared'
import {
  STATUS_LABEL,
  KIND_LABEL,
  dateLabel,
  formatAmount,
  statusDotColor,
} from '@/components/documents/documents-shared'

type Props = {
  item: DocumentListItem
  isLast?: boolean
  agencyMode?: boolean
  busy?: boolean
  onOpen?: (item: DocumentListItem) => void
  onOpenPdf?: (item: DocumentListItem) => void
  onSend?: (item: DocumentListItem) => void
  onMarkPaid?: (item: DocumentListItem) => void
  onMarkSigned?: (item: DocumentListItem) => void
}

function statusLabel(item: DocumentListItem): string {
  if (item.signedAt) return STATUS_LABEL.signed
  return STATUS_LABEL[item.status] || item.status
}

export default function DocumentCardRow({
  item,
  isLast,
  agencyMode,
  busy,
  onOpen,
  onOpenPdf,
  onSend,
  onMarkPaid,
  onMarkSigned,
}: Props) {
  const amount = formatAmount(item.amountCents)
  const canOpen = agencyMode && item.source === 'agency' && onOpen
  const canSend = agencyMode && item.source === 'agency' && item.status === 'final'
  const canMarkPaid = agencyMode && item.kind === 'rechnung' && item.status === 'sent'
  const canMarkSigned = agencyMode && item.kind === 'vertrag' && item.status === 'sent' && !item.signedAt
  const showPdf = item.source === 'agency' || Boolean(item.downloadUrl)

  return (
    <div>
      <div className="dec-card doc-card">
        <div className="dec-card-left">
          <div className="dec-card-title-block">
            <span className="dec-card-title">
              {item.numberLabel ? `${KIND_LABEL[item.kind] || item.kind}, ${item.numberLabel}` : item.title}
            </span>
            {(item.recipient || item.projectTitle) && (
              <span className="dec-card-project">
                {[item.recipient, item.projectTitle].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          <span
            className="dec-card-type-pill"
            style={{ ['--dec-dot-color' as string]: statusDotColor(item.signedAt ? 'signed' : item.status, item.kind) }}
          >
            <span className="dec-card-dot" aria-hidden />
            {statusLabel(item)}
          </span>
        </div>

        <div className="dec-card-mid">
          <div className="dec-card-section">
            <span className="dec-card-label">Dokument</span>
            <ClampedTip
              text={item.title}
              className="dec-card-muted"
              lines={2}
            />
          </div>
          <div className="dec-card-section">
            <span className="dec-card-label">Agency Workflow</span>
            <ClampedTip
              text={
                item.kind === 'rechnung'
                  ? 'Rechnung erstellen → an Kunden senden → Zahlung als bezahlt markieren.'
                  : item.kind === 'vertrag'
                    ? 'Vertrag erstellen → zur Unterschrift senden → als unterschrieben markieren.'
                    : item.kind === 'angebot'
                      ? 'Angebot erstellen → PDF teilen → bei Annahme in Projekt überführen.'
                      : 'Hochgeladenes Projekt-Dokument — nur zur Ablage.'
              }
              className="dec-card-muted"
              lines={2}
            />
          </div>
        </div>

        <div className="dec-card-meta">
          <div className="dec-card-section">
            <span className="dec-card-label">Betrag</span>
            <span className="dec-card-muted">{amount || '—'}</span>
          </div>
          <div className="dec-card-section">
            <span className="dec-card-label">Erstellt</span>
            <span className="dec-card-muted">{dateLabel(item.createdAt)}</span>
          </div>
        </div>

        <div className="dec-card-actions doc-card-actions">
          {canOpen && (
            <FestagPillButton block onClick={() => onOpen(item)} disabled={busy}>
              <PencilSimple size={14} weight="regular" />
              Öffnen
            </FestagPillButton>
          )}
          {showPdf && onOpenPdf && (
            <FestagPillButton block variant="primary" onClick={() => onOpenPdf(item)} disabled={busy}>
              <FilePdf size={14} weight="fill" />
              PDF
            </FestagPillButton>
          )}
          {item.downloadUrl && !onOpenPdf && (
            <a className="fui-pill-btn fui-pill-btn--block fui-pill-btn--primary" href={item.downloadUrl} target="_blank" rel="noopener noreferrer">
              <DownloadSimple size={14} weight="bold" />
              Download
            </a>
          )}
          {canSend && onSend && (
            <FestagPillButton block onClick={() => onSend(item)} disabled={busy}>
              <PaperPlaneTilt size={14} weight="regular" />
              Senden
            </FestagPillButton>
          )}
          {canMarkPaid && onMarkPaid && (
            <FestagPillButton block onClick={() => onMarkPaid(item)} disabled={busy}>
              <Check size={14} weight="bold" />
              Bezahlt
            </FestagPillButton>
          )}
          {canMarkSigned && onMarkSigned && (
            <FestagPillButton block onClick={() => onMarkSigned(item)} disabled={busy}>
              <PenNib size={14} weight="fill" />
              Unterschrieben
            </FestagPillButton>
          )}
        </div>
      </div>
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
