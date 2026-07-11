'use client'

import { Check, DownloadSimple, FilePdf, Handshake, PaperPlaneTilt, PenNib, PencilSimple } from '@phosphor-icons/react'
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
  onMarkAccepted?: (item: DocumentListItem) => void
}

function displayStatus(item: DocumentListItem): string {
  if (item.signedAt) return 'signed'
  if (item.acceptedAt) return 'accepted'
  return item.status
}

function statusLabel(item: DocumentListItem): string {
  const key = displayStatus(item)
  return STATUS_LABEL[key] || item.status
}

function workflowCopy(kind: string): string {
  if (kind === 'rechnung') return 'Rechnung erstellen → an Kunden senden → Zahlung als bezahlt markieren.'
  if (kind === 'vertrag') return 'Vertrag erstellen → zur Unterschrift senden → als unterschrieben markieren.'
  if (kind === 'angebot') return 'Angebot erstellen → an Kunden senden → bei Zusage als angenommen markieren.'
  return 'Hochgeladenes Projekt-Dokument — nur zur Ablage.'
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
  onMarkAccepted,
}: Props) {
  const amount = formatAmount(item.amountCents)
  const canOpen = agencyMode && item.source === 'agency' && onOpen
  const canSend = agencyMode && item.source === 'agency' && item.status === 'final'
  const canMarkPaid = agencyMode && item.kind === 'rechnung' && item.status === 'sent'
  const canMarkSigned = agencyMode && item.kind === 'vertrag' && item.status === 'sent' && !item.signedAt
  const canMarkAccepted = agencyMode && item.kind === 'angebot' && item.status === 'sent' && !item.acceptedAt
  const showPdf = item.source === 'agency' || Boolean(item.downloadUrl)
  const statusKey = displayStatus(item)

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
            style={{ ['--dec-dot-color' as string]: statusDotColor(statusKey, item.kind) }}
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
              text={workflowCopy(item.kind)}
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
          {canMarkAccepted && onMarkAccepted && (
            <FestagPillButton block onClick={() => onMarkAccepted(item)} disabled={busy}>
              <Handshake size={14} weight="regular" />
              Angenommen
            </FestagPillButton>
          )}
        </div>
      </div>
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
