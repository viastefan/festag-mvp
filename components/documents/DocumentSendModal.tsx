'use client'

import { useEffect, useState } from 'react'
import Modal, { ModalButton } from '@/components/Modal'
import { PaperPlaneTilt, UserCircle } from '@phosphor-icons/react'

type ProjectStub = { id: string; title: string; client_id?: string | null }

type Props = {
  open: boolean
  onClose: () => void
  recipientName: string
  recipientEmail: string
  documentLabel: string
  projectId: string
  projects: ProjectStub[]
  sending?: boolean
  error?: string
  onSend: (opts: { projectId: string; recipientEmail: string }) => void | Promise<void>
}

export default function DocumentSendModal({
  open,
  onClose,
  recipientName,
  recipientEmail,
  documentLabel,
  projectId,
  projects,
  sending,
  error,
  onSend,
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState(projectId)
  const [email, setEmail] = useState(recipientEmail)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setSelectedProjectId(projectId)
    setEmail(recipientEmail)
    setLocalError('')
  }, [open, projectId, recipientEmail])

  const name = recipientName.trim() || 'Empfänger'
  const canSend = Boolean(selectedProjectId) && !sending

  async function handleSend() {
    if (!selectedProjectId) {
      setLocalError('Bitte zuerst ein Projekt zuordnen.')
      return
    }
    setLocalError('')
    await onSend({
      projectId: selectedProjectId,
      recipientEmail: email.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Dokument senden"
      subtitle={`${documentLabel} erscheint beim verknüpften Projekt unter Benachrichtigungen.`}
      footer={(
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={sending}>Abbrechen</ModalButton>
          <ModalButton variant="primary" onClick={() => { void handleSend() }} loading={sending} disabled={!canSend}>
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
          <p className="dsm-email">{email.trim() || 'Keine E-Mail hinterlegt'}</p>
        </div>
      </div>

      <label className="dsm-field">
        <span>Projekt</span>
        <select
          value={selectedProjectId}
          disabled={sending}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">Projekt auswählen</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>

      <label className="dsm-field">
        <span>E-Mail für Versand (optional)</span>
        <input
          type="email"
          value={email}
          disabled={sending}
          placeholder="kunde@firma.de"
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {!selectedProjectId && (
        <p className="dsm-note">Ohne Projekt kann Festag den Empfänger nicht in die Inbox legen.</p>
      )}
      {selectedProjectId && !email.trim() && (
        <p className="dsm-note">Ohne E-Mail geht der Versand nur in die Festag-Inbox. PDF kannst du weiterhin manuell teilen.</p>
      )}
      {(localError || error) && (
        <p className="dsm-error">{localError || error}</p>
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
    background: var(--festag-glass-bg-soft, #f5f5f7);
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
  .dsm-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
  }
  .dsm-field > span {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--fp-muted, #6e6e73);
  }
  .dsm-field select,
  .dsm-field input {
    width: 100%;
    box-sizing: border-box;
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.08);
    background: var(--portal-card, #fff);
    color: inherit;
    font: inherit;
    font-size: 14px;
  }
  html[data-theme="dark"] .dsm-field select,
  html[data-theme="classic-dark"] .dsm-field select,
  html[data-theme="dark"] .dsm-field input,
  html[data-theme="classic-dark"] .dsm-field input {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.1);
  }
  .dsm-field select:focus,
  .dsm-field input:focus {
    outline: none;
    border-color: rgba(0,0,0,0.2);
  }
  .dsm-note { margin: 12px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--fp-muted, #86868b); }
  .dsm-error { margin: 12px 0 0; font-size: 13px; line-height: 1.4; color: #c0362e; }
`
