'use client'

import Modal, { ModalButton } from '@/components/Modal'
import { PaperPlaneTilt, UserCircle } from '@phosphor-icons/react'

type Props = {
  open: boolean
  onClose: () => void
  recipientName: string
  recipientEmail: string
  documentLabel: string
  sending?: boolean
  onSend: () => void
}

export default function DocumentSendModal({
  open,
  onClose,
  recipientName,
  recipientEmail,
  documentLabel,
  sending,
  onSend,
}: Props) {
  const name = recipientName.trim() || 'Empfänger'
  const email = recipientEmail.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Dokument senden"
      subtitle={`${documentLabel} wird an den Kunden-Inbox-Bereich übermittelt — unter Benachrichtigungen sichtbar.`}
      footer={(
        <>
          <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
          <ModalButton variant="primary" onClick={onSend} loading={sending} disabled={!email}>
            <PaperPlaneTilt size={14} weight="fill" />
            Senden
          </ModalButton>
        </>
      )}
    >
      <style>{CSS}</style>
      <div className="dsm-recipient">
        <span className="dsm-avatar" aria-hidden><UserCircle size={28} weight="regular" /></span>
        <div className="dsm-copy">
          <p className="dsm-name">{name}</p>
          <p className="dsm-email">{email || 'Bitte E-Mail-Adresse im Formular ergänzen.'}</p>
        </div>
      </div>
      {!email && (
        <p className="dsm-note">Ohne E-Mail kannst du das Dokument trotzdem als PDF speichern und manuell teilen.</p>
      )}
    </Modal>
  )
}

const CSS = `
  .dsm-recipient {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    background: #f5f5f7;
    color: #1d1d1f;
  }
  html[data-theme="dark"] .dsm-recipient,
  html[data-theme="classic-dark"] .dsm-recipient {
    background: rgba(255,255,255,0.06);
    color: var(--fp-text, #f5f5f7);
  }
  .dsm-avatar { color: var(--fp-muted, #6e6e73); flex-shrink: 0; }
  .dsm-name { margin: 0 0 2px; font-size: 14.5px; font-weight: 500; }
  .dsm-email { margin: 0; font-size: 13px; color: var(--fp-muted, #6e6e73); }
  .dsm-note { margin: 12px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--fp-muted, #86868b); }
`
