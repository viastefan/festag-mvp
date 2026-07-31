'use client'

/**
 * InviteDevModal — create a secure developer invite from the team panel.
 *
 * Calls POST /api/dev/create-invite and shows the one-time link for sharing.
 * Uses the shared Modal primitive so invite UI matches every other Festag popup.
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Copy } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  RELATIONSHIP_LABELS,
  type DevRelationshipKind,
} from '@/lib/dev/relationship'

interface Props {
  open: boolean
  onClose: () => void
}

const ROLE_OPTIONS = [
  { id: 'developer', label: 'Developer' },
  { id: 'designer', label: 'Designer' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'admin', label: 'Admin' },
] as const

const RELATIONSHIP_OPTIONS: Array<{ id: DevRelationshipKind; label: string }> = [
  { id: 'freelancer', label: RELATIONSHIP_LABELS.freelancer.title },
  { id: 'agency_member', label: RELATIONSHIP_LABELS.agency_member.title },
  { id: 'client_company_dev', label: RELATIONSHIP_LABELS.client_company_dev.title },
  { id: 'festag_internal', label: RELATIONSHIP_LABELS.festag_internal.title },
]

export default function InviteDevModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('developer')
  const [relationshipKind, setRelationshipKind] = useState<DevRelationshipKind | ''>('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setRole('developer')
    setRelationshipKind('')
    setMessage('')
    setLink(null)
    setEmailSent(false)
    setCopied(false)
    setErrMsg(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    syncAutoGrowTextarea(messageRef.current)
  }, [message, open, link])

  async function handleSend() {
    setErrMsg(null)
    setBusy(true)
    try {
      const res = await fetch('/api/dev/create-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          message: message || undefined,
          ...(relationshipKind ? { relationshipKind } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(json.error ?? 'Einladung konnte nicht erstellt werden.')
        setBusy(false)
        return
      }
      setLink(json.link)
      setEmailSent(Boolean(json.emailSent))
    } catch {
      setErrMsg('Verbindung fehlgeschlagen.')
    }
    setBusy(false)
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      dragHandle
      title={
        link
          ? emailSent
            ? 'Die Einladung ist unterwegs. Der Link bleibt als Backup zum Teilen verfügbar.'
            : 'Der Einladungslink ist bereit. Sende ihn an die Person, die du einladen möchtest.'
          : 'Lade einen Developer in deinen Workspace ein. Der Link gilt 72 Stunden und kann nur einmal verwendet werden.'
      }
      footer={
        link ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <ModalButton variant="secondary" onClick={() => { setLink(null); setEmailSent(false) }}>
              Weitere Einladung
            </ModalButton>
            <ModalButton variant="primary" onClick={onClose}>
              Fertig
            </ModalButton>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <ModalButton variant="ghost" onClick={onClose}>
              Abbrechen
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSend} disabled={!emailReady} loading={busy}>
              Einladung senden
            </ModalButton>
          </div>
        )
      }
    >
      <style>{CSS}</style>
      {!link ? (
        <div className="idm-body">
          <div className="idm-field">
            <label className="idm-label" htmlFor="idm-email">E-Mail-Adresse</label>
            <input
              id="idm-email"
              ref={emailRef}
              className="idm-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@firma.de"
              autoComplete="email"
              onKeyDown={e => {
                if (e.key === 'Enter' && emailReady) void handleSend()
              }}
            />
          </div>

          <div className="idm-field">
            <span className="idm-label">Rolle</span>
            <div className="idm-role-row" role="group" aria-label="Rolle wählen">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={`idm-role-chip${role === r.id ? ' is-active' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {role === 'admin' ? (
              <p className="idm-role-hint">
                Admin kann Teammitglieder einladen, Freigaben erteilen und Workspace-Einstellungen ändern.
              </p>
            ) : null}
          </div>

          <div className="idm-field">
            <span className="idm-label">Bezug zum Workspace</span>
            <div className="idm-role-row" role="group" aria-label="Bezug wählen">
              <button
                type="button"
                className={`idm-role-chip${!relationshipKind ? ' is-active' : ''}`}
                onClick={() => setRelationshipKind('')}
              >
                Auto
              </button>
              {RELATIONSHIP_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`idm-role-chip${relationshipKind === r.id ? ' is-active' : ''}`}
                  onClick={() => setRelationshipKind(r.id)}
                  title={RELATIONSHIP_LABELS[r.id].hint}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="idm-role-hint">
              {relationshipKind
                ? RELATIONSHIP_LABELS[relationshipKind].hint
                : 'Ohne Auswahl leitet Festag den Bezug aus dem Workspace-Mode ab.'}
            </p>
          </div>

          <div className="idm-field">
            <label className="idm-label" htmlFor="idm-msg">
              Persönliche Nachricht <span className="idm-optional">(optional)</span>
            </label>
            <textarea
              id="idm-msg"
              ref={messageRef}
              className="idm-textarea"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Kurz warum du einlädst — Kontext für das Team."
              rows={3}
            />
          </div>

          {errMsg ? <p className="idm-err" role="alert">{errMsg}</p> : null}
        </div>
      ) : (
        <div className="idm-body">
          <p className="idm-success-sub">
            {emailSent
              ? <>Wir haben <strong>{email}</strong> eine Einladung geschickt. Du kannst den Link zusätzlich kopieren.</>
              : <>Die E-Mail konnte gerade nicht versendet werden. Sende diesen Link manuell an <strong>{email}</strong>.</>}
          </p>
          <div className="idm-link-box">
            <span className="idm-link-text">{link}</span>
            <button className="idm-copy-btn" onClick={() => void copyLink()} type="button" title="Kopieren">
              {copied
                ? <CheckCircle size={14} weight="fill" className="idm-copy-ok" />
                : <Copy size={14} weight="regular" />}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const CSS = `
.idm-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.idm-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.idm-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fp-muted, rgba(245,245,247,0.45));
  letter-spacing: 0.02em;
}
.idm-optional {
  font-size: 11px;
  color: var(--fp-muted, rgba(245,245,247,0.25));
  font-weight: 400;
}
.idm-input {
  height: 40px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--fp-border, rgba(255,255,255,0.10));
  border-radius: 10px;
  color: var(--fp-text, rgba(245,245,247,0.88));
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.idm-input:focus {
  border-color: var(--al-accent, #5B647D);
}
.idm-input::placeholder {
  color: var(--fp-muted, rgba(245,245,247,0.25));
}
.idm-textarea {
  padding: 10px 12px;
  background: transparent;
  border: 1px solid var(--fp-border, rgba(255,255,255,0.10));
  border-radius: 10px;
  color: var(--fp-text, rgba(245,245,247,0.88));
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.55;
  field-sizing: content;
  max-block-size: 160px;
  transition: border-color 0.15s;
}
.idm-textarea:focus {
  border-color: var(--al-accent, #5B647D);
}
.idm-textarea::placeholder {
  color: var(--fp-muted, rgba(245,245,247,0.25));
}
.idm-role-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.idm-role-chip {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--fp-border, rgba(255,255,255,0.10));
  background: var(--fp-pill, rgba(255,255,255,0.04));
  color: var(--fp-muted, rgba(245,245,247,0.55));
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.idm-role-chip:hover {
  background: var(--fp-hover, rgba(255,255,255,0.08));
  color: var(--fp-text, rgba(245,245,247,0.82));
}
.idm-role-chip.is-active {
  background: var(--fp-hover, rgba(255,255,255,0.10));
  border-color: var(--fp-border, rgba(255,255,255,0.22));
  color: var(--fp-text, rgba(245,245,247,0.92));
}
.idm-role-hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--fp-muted, rgba(245,245,247,0.45));
}
.idm-err {
  font-size: 13px;
  color: #c45c5c;
  margin: 0;
}
.idm-success-sub {
  font-size: 15.5px;
  line-height: 1.65;
  color: var(--fp-muted, rgba(245,245,247,0.55));
  margin: 0;
}
.idm-success-sub strong {
  color: var(--fp-text, rgba(245,245,247,0.82));
  font-weight: 500;
}
.idm-link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--fp-pill, rgba(255,255,255,0.04));
  border: 1px solid var(--fp-border, rgba(255,255,255,0.10));
  border-radius: 10px;
  padding: 10px 12px;
}
.idm-link-text {
  font-size: 12px;
  color: var(--fp-muted, rgba(245,245,247,0.5));
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.idm-copy-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid var(--fp-border, rgba(255,255,255,0.10));
  background: var(--fp-pill, rgba(255,255,255,0.06));
  color: var(--fp-muted, rgba(245,245,247,0.55));
  cursor: pointer;
}
.idm-copy-btn:hover {
  background: var(--fp-hover, rgba(255,255,255,0.10));
}
.idm-copy-ok {
  color: #5B8A6B;
}
`
