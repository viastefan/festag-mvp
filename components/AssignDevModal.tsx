'use client'

import { useState } from 'react'
import { UserPlus, Check, EnvelopeSimple } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'

/**
 * AssignDevModal — owner/agency flow to hand a project to a developer by email.
 *
 * Wraps POST /api/projects/assign-dev: if the email is a new developer, Festag
 * provisions a dev account (username + PIN), emails the credentials and the
 * assignment, and links the project via project_assignments (the table the dev
 * panel reads). If the dev already exists, it just links + notifies.
 */
interface Props {
  open: boolean
  projectId: string
  projectTitle: string
  onClose: () => void
  onAssigned?: (devId: string) => void
}

export default function AssignDevModal({ open, projectId, projectTitle, onClose, onAssigned }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ provisioned: boolean } | null>(null)

  async function submit() {
    const mail = email.trim().toLowerCase()
    setError(null)
    if (!/.+@.+\..+/.test(mail)) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setWorking(true)
    try {
      const res = await fetch('/api/projects/assign-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, devEmail: mail, devName: name.trim() || undefined, projectTitle }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error === 'forbidden' ? 'Nur der Projekt-Owner kann einen Entwickler zuweisen.' : (data.error ?? 'Zuweisung fehlgeschlagen.'))
        return
      }
      setDone({ provisioned: Boolean(data.provisioned) })
      onAssigned?.(data.devId)
    } catch (e: any) {
      setError(e?.message ?? 'Netzwerkfehler.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      bare
      footer={
        done ? (
          <ModalButton variant="primary" onClick={onClose}>Fertig</ModalButton>
        ) : (
          <>
            <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
            <ModalButton variant="primary" onClick={submit} disabled={!email.trim()} loading={working}>
              {working ? 'Sende…' : 'Zuweisen & einladen'}
            </ModalButton>
          </>
        )
      }
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Check size={16} weight="bold" color="#22c55e" /> : <UserPlus size={16} color="var(--text-secondary)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-.2px', color: 'var(--text)' }}>
            {done ? 'Entwickler zugewiesen' : 'Entwickler zuweisen'}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectTitle}
          </p>
        </div>
      </div>

      {done ? (
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
          {done.provisioned
            ? `Festag hat ein Dev-Panel-Konto angelegt und ${email.trim()} zwei E-Mails geschickt: Zugangsdaten (Login auf /dev/login) und die Projekt-Zuweisung. Der Entwickler erscheint jetzt im Projekt-Team.`
            : `${email.trim()} wurde dem Projekt zugewiesen und per E-Mail informiert. Der Entwickler sieht das Projekt jetzt im Dev-Panel.`}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>E-Mail des Entwicklers</span>
            <input
              type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder="dev@firma.de"
              style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name optional</span>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="Max Schneider"
              style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </label>
          <p style={{ display: 'flex', alignItems: 'center', gap: 7, margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            <EnvelopeSimple size={14} />
            Neuer Entwickler erhält automatisch Zugangsdaten fürs Dev-Panel.
          </p>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,70,70,0.08)', border: '1px solid rgba(220,70,70,.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--red,#D14343)', lineHeight: 1.5 }}>{error}</div>
          )}
        </div>
      )}
    </Modal>
  )
}
